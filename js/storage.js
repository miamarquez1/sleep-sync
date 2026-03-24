const SleepSyncStorage = (() => {
  const LOGS_KEY = "sleepsync_logs";

  const safeParse = (raw, fallback) => {
    if (!raw) return fallback;
    try {
      const parsed = JSON.parse(raw);
      return parsed ?? fallback;
    } catch (error) {
      console.warn("SleepSync: invalid storage data.", error);
      return fallback;
    }
  };

  const createId = () => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const getLogs = () => safeParse(localStorage.getItem(LOGS_KEY), {});
  const saveLogs = (logsByUser) =>
    localStorage.setItem(LOGS_KEY, JSON.stringify(logsByUser));

  const getLogsForUser = (userId) => {
    const logsByUser = getLogs();
    return logsByUser[userId] ?? [];
  };

  const saveLogsForUser = (userId, logs) => {
    const logsByUser = getLogs();
    logsByUser[userId] = logs;
    saveLogs(logsByUser);
  };

  const addLog = (userId, log) => {
    const logs = getLogsForUser(userId);
    logs.push(log);
    saveLogsForUser(userId, logs);
    return logs;
  };

  const updateLog = (userId, logId, updates) => {
    const logs = getLogsForUser(userId);
    const index = logs.findIndex((log) => log.id === logId);
    if (index === -1) return null;
    logs[index] = { ...logs[index], ...updates };
    saveLogsForUser(userId, logs);
    return logs[index];
  };

  const deleteLog = (userId, logId) => {
    const logs = getLogsForUser(userId).filter((log) => log.id !== logId);
    saveLogsForUser(userId, logs);
    return logs;
  };

  return {
    createId,
    getLogsForUser,
    addLog,
    updateLog,
    deleteLog,
  };
})();
