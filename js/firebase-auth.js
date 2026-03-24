const SleepSyncAuth = (() => {
  let auth = null;
  let initialized = false;
  let configured = false;

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
      return { configured, auth };
    }

    initialized = true;

    if (!window.firebase) {
      console.error("SleepSyncAuth: Firebase SDK is not loaded.");
      return { configured: false, auth: null };
    }

    const firebaseConfig = getFirebaseConfig();
    if (!firebaseConfig) {
      console.warn(
        "SleepSyncAuth: Missing or invalid SLEEPSYNC_FIREBASE_CONFIG.",
      );
      return { configured: false, auth: null };
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

    return { configured: true, auth };
  };

  const isConfigured = () => configured;

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
      default:
        return error && error.message
          ? error.message
          : "Authentication failed. Please try again.";
    }
  };

  return {
    init,
    isConfigured,
    getCurrentUser,
    signup,
    login,
    logout,
    requireAuthenticated,
    requireGuest,
    mapAuthError,
  };
})();
