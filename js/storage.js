const SleepSyncStorage = (() => {
  const USERS_COLLECTION = "users";
  const LOGS_SUBCOLLECTION = "sleepLogs";

  let db = null;
  let initialized = false;

  const ensureDb = async () => {
    if (db) return db;
    if (initialized && !db) {
      throw new Error("Firestore is not initialized.");
    }

    initialized = true;

    if (!window.firebase) {
      throw new Error("Firebase SDK is not loaded.");
    }

    if (!firebase.apps.length) {
      throw new Error(
        "Firebase app is not initialized. Initialize auth/config first.",
      );
    }

    if (typeof firebase.firestore !== "function") {
      throw new Error(
        "Firestore SDK is not loaded. Include firebase-firestore-compat.js.",
      );
    }

    db = firebase.firestore();
    return db;
  };

  const logsCollectionRef = (database, userId) => {
    return database
      .collection(USERS_COLLECTION)
      .doc(userId)
      .collection(LOGS_SUBCOLLECTION);
  };

  const createId = () => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const getLogsForUser = async (userId) => {
    const database = await ensureDb();
    const snapshot = await logsCollectionRef(database, userId)
      .orderBy("date", "asc")
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  };

  const addLog = async (userId, log) => {
    const database = await ensureDb();
    const logsRef = logsCollectionRef(database, userId);
    const docRef = log.id ? logsRef.doc(log.id) : logsRef.doc();

    const now = new Date().toISOString();
    const payload = {
      ...log,
      id: docRef.id,
      userId,
      createdAt: log.createdAt || now,
      updatedAt: now,
    };

    await docRef.set(payload);
    return payload;
  };

  const updateLog = async (userId, logId, updates) => {
    const database = await ensureDb();
    const docRef = logsCollectionRef(database, userId).doc(logId);
    const payload = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await docRef.update(payload);
    const updatedDoc = await docRef.get();
    if (!updatedDoc.exists) return null;
    return {
      id: updatedDoc.id,
      ...updatedDoc.data(),
    };
  };

  const deleteLog = async (userId, logId) => {
    const database = await ensureDb();
    await logsCollectionRef(database, userId).doc(logId).delete();
    return true;
  };

  return {
    createId,
    getLogsForUser,
    addLog,
    updateLog,
    deleteLog,
  };
})();

window.SleepSyncStorage = SleepSyncStorage;
