const SleepSyncStorage = (() => {
  const USERS_KEY = 'sleepsync_users';
  const LOGS_KEY = 'sleepsync_logs';
  const SESSION_KEY = 'sleepsync_session';

  const safeParse = (raw, fallback) => {
    if (!raw) return fallback;
    try {
      const parsed = JSON.parse(raw);
      return parsed ?? fallback;
    } catch (error) {
      console.warn('SleepSync: invalid storage data.', error);
      return fallback;
    }
  };

  const createId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const getUsers = () => safeParse(localStorage.getItem(USERS_KEY), {});
  const saveUsers = (users) => localStorage.setItem(USERS_KEY, JSON.stringify(users));

  const getLogs = () => safeParse(localStorage.getItem(LOGS_KEY), {});
  const saveLogs = (logsByUser) => localStorage.setItem(LOGS_KEY, JSON.stringify(logsByUser));

  const setSession = (userId) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ userId }));
  };

  const getSession = () => safeParse(localStorage.getItem(SESSION_KEY), null);

  const clearSession = () => localStorage.removeItem(SESSION_KEY);

  const createUser = (email, password) => {
    const users = getUsers();
    const existing = Object.values(users).find((user) => user.email === email);
    if (existing) {
      return { error: 'An account with this email already exists.' };
    }

    const id = createId();
    const newUser = {
      id,
      email,
      password,
      createdAt: new Date().toISOString(),
    };

    users[id] = newUser;
    saveUsers(users);
    return { user: newUser };
  };

  const authenticate = (email, password) => {
    const users = getUsers();
    const user = Object.values(users).find((item) => item.email === email);
    if (!user || user.password !== password) {
      return { error: 'Invalid email or password.' };
    }
    return { user };
  };

  const getUser = (userId) => {
    const users = getUsers();
    return users[userId] ?? null;
  };

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
    createUser,
    authenticate,
    getSession,
    setSession,
    clearSession,
    getUser,
    getLogsForUser,
    addLog,
    updateLog,
    deleteLog,
  };
})();

// Future Firebase structure (planned):
// users/{userId} => { email, createdAt }
// users/{userId}/sleepLogs/{logId} => { date, sleepStart, wakeTime, hoursSlept, quality, notes }
