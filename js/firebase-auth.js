const SleepSyncAuth = (() => {
  let auth = null;
  let initialized = false;
  let configured = false;
  let initError = "";

  const REQUIRED_CONFIG_KEYS = ["apiKey", "authDomain", "projectId", "appId"];

  const hasRequiredConfig = (config) => {
    if (!config || typeof config !== "object") return false;
    return REQUIRED_CONFIG_KEYS.every((key) => {
      const value = config[key];
      return typeof value === "string" && value.trim().length > 0;
    });
  };

  const getFirebaseConfig = () => {
    const config = window.SLEEPSYNC_FIREBASE_CONFIG;
    if (!hasRequiredConfig(config)) {
      return null;
    }
    return config;
  };

  const init = async () => {
    if (initialized) {
      return { configured, auth, error: initError };
    }

    initialized = true;
    initError = "";

    if (window.location.protocol === "file:") {
      initError =
        "Firebase Authentication does not work from file:// URLs. Run a local server (for example: npx serve .) and open http://localhost instead.";
      console.error(`SleepSyncAuth: ${initError}`);
      return { configured: false, auth: null, error: initError };
    }

    if (!window.firebase) {
      initError = "Firebase SDK is not loaded.";
      console.error(`SleepSyncAuth: ${initError}`);
      return { configured: false, auth: null, error: initError };
    }

    const firebaseConfig = getFirebaseConfig();
    if (!firebaseConfig) {
      initError =
        "Missing or invalid SLEEPSYNC_FIREBASE_CONFIG in js/firebase-config.js.";
      console.warn(`SleepSyncAuth: ${initError}`);
      return { configured: false, auth: null, error: initError };
    }

    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    auth = firebase.auth();
    configured = true;

    try {
      await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    } catch (error) {
      console.error("SleepSyncAuth: Failed to set auth persistence.", error);
    }

    return { configured: true, auth, error: "" };
  };

  const isConfigured = () => configured;
  const getInitError = () => initError;

  const onAuthStateChangedOnce = async () => {
    await init();
    if (!configured || !auth) return null;

    return new Promise((resolve) => {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        unsubscribe();
        resolve(user);
      });
    });
  };

  const getCurrentUser = () => {
    if (!configured || !auth) return null;
    return auth.currentUser;
  };

  const signup = async (email, password) => {
    await init();
    if (!configured || !auth) {
      throw new Error("Firebase auth is not configured.");
    }
    const credential = await auth.createUserWithEmailAndPassword(
      email,
      password,
    );
    return credential.user;
  };

  const login = async (email, password) => {
    await init();
    if (!configured || !auth) {
      throw new Error("Firebase auth is not configured.");
    }
    const credential = await auth.signInWithEmailAndPassword(email, password);
    return credential.user;
  };

  const logout = async () => {
    await init();
    if (!configured || !auth) return;
    await auth.signOut();
  };

  const requireAuthenticated = async (redirectTo) => {
    const user = await onAuthStateChangedOnce();
    if (!user) {
      window.location.href = redirectTo;
      return null;
    }
    return user;
  };

  const requireGuest = async (redirectTo) => {
    const user = await onAuthStateChangedOnce();
    if (user) {
      window.location.href = redirectTo;
      return null;
    }
    return null;
  };

  const mapAuthError = (error) => {
    const code = error && error.code ? String(error.code) : "";
    switch (code) {
      case "auth/email-already-in-use":
        return "An account with this email already exists.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/weak-password":
        return "Password should be at least 6 characters long.";
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "Invalid email or password.";
      case "auth/operation-not-allowed":
        return "Email/Password sign-in is disabled in Firebase Console. Enable it under Authentication > Sign-in method.";
      case "auth/unauthorized-domain":
        return "This domain is not authorized in Firebase. Add it under Authentication > Settings > Authorized domains.";
      case "auth/network-request-failed":
        return "Network error while contacting Firebase. Check your internet connection and try again.";
      case "auth/operation-not-supported-in-this-environment":
        return "This environment does not support Firebase auth (common on file://). Use a local server and localhost.";
      case "auth/too-many-requests":
        return "Too many attempts. Wait a few minutes and try again.";
      default:
        if (error && error.message && code) {
          return `${error.message} (${code})`;
        }
        return error && error.message
          ? error.message
          : "Authentication failed. Please try again.";
    }
  };

  return {
    init,
    isConfigured,
    getInitError,
    getCurrentUser,
    signup,
    login,
    logout,
    requireAuthenticated,
    requireGuest,
    mapAuthError,
  };
})();

window.SleepSyncAuth = SleepSyncAuth;
