const App = (() => {
  const $ = (selector) => document.querySelector(selector);

  const formatDateLabel = (dateStr) => {
    const date = new Date(`${dateStr}T00:00:00`);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatHours = (value, decimals = 2) => {
    if (!Number.isFinite(value)) return '0.0';
    return value.toFixed(decimals);
  };

  const calculateHours = (date, start, end) => {
    if (!date || !start || !end) return null;
    const startTime = new Date(`${date}T${start}`);
    let endTime = new Date(`${date}T${end}`);
    if (endTime <= startTime) {
      endTime.setDate(endTime.getDate() + 1);
    }
    const diff = (endTime - startTime) / (1000 * 60 * 60);
    return Math.round(diff * 100) / 100;
  };

  const getUniqueDates = (logs) => {
    return Array.from(new Set(logs.map((log) => log.date))).sort();
  };

  const computeStreaks = (logs) => {
    const dates = getUniqueDates(logs);
    if (!dates.length) return { current: 0, longest: 0 };

    let longest = 0;
    let currentRun = 0;
    let prevDate = null;

    dates.forEach((dateStr) => {
      const currentDate = new Date(`${dateStr}T00:00:00`);
      if (!prevDate) {
        currentRun = 1;
      } else {
        const diffDays = Math.round((currentDate - prevDate) / (1000 * 60 * 60 * 24));
        currentRun = diffDays === 1 ? currentRun + 1 : 1;
      }
      longest = Math.max(longest, currentRun);
      prevDate = currentDate;
    });

    const descDates = dates.slice().sort().reverse();
    let current = 1;
    for (let i = 0; i < descDates.length - 1; i += 1) {
      const currentDate = new Date(`${descDates[i]}T00:00:00`);
      const nextDate = new Date(`${descDates[i + 1]}T00:00:00`);
      const diffDays = Math.round((currentDate - nextDate) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        current += 1;
      } else {
        break;
      }
    }

    return { current, longest };
  };

  const computeInsights = (logs) => {
    if (!logs.length) {
      return {
        avgHours: 0,
        avgQuality: 0,
        best: null,
        worst: null,
      };
    }

    const totalHours = logs.reduce((sum, log) => sum + log.hoursSlept, 0);
    const totalQuality = logs.reduce((sum, log) => sum + log.quality, 0);

    const best = logs.reduce((result, log) => {
      if (!result) return log;
      if (log.quality > result.quality) return log;
      if (log.quality === result.quality && log.hoursSlept > result.hoursSlept) return log;
      return result;
    }, null);

    const worst = logs.reduce((result, log) => {
      if (!result) return log;
      if (log.quality < result.quality) return log;
      if (log.quality === result.quality && log.hoursSlept < result.hoursSlept) return log;
      return result;
    }, null);

    return {
      avgHours: totalHours / logs.length,
      avgQuality: totalQuality / logs.length,
      best,
      worst,
    };
  };

  const getChartData = (logs) => {
    const map = logs.reduce((acc, log) => {
      acc[log.date] = log;
      return acc;
    }, {});

    const data = [];
    const today = new Date();
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const key = date.toISOString().slice(0, 10);
      const log = map[key];
      data.push({
        date: key,
        label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        hours: log ? log.hoursSlept : 0,
      });
    }
    return data;
  };

  const renderChart = (logs) => {
    const chart = $('#sleep-chart');
    if (!chart) return;
    chart.innerHTML = '';

    const data = getChartData(logs);
    const maxHours = Math.max(8, ...data.map((entry) => entry.hours));

    data.forEach((entry) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'chart-bar';

      const value = document.createElement('span');
      value.textContent = `${formatHours(entry.hours, 1)}h`;

      const bar = document.createElement('div');
      bar.className = 'bar';
      const height = entry.hours === 0 ? 8 : (entry.hours / maxHours) * 100;
      bar.style.height = `${Math.max(height, 8)}%`;

      const label = document.createElement('span');
      label.textContent = entry.label;

      wrapper.append(value, bar, label);
      chart.appendChild(wrapper);
    });
  };

  const renderHistory = (logs) => {
    const container = $('#sleep-history');
    if (!container) return;
    container.innerHTML = '';

    if (!logs.length) {
      container.innerHTML = `
        <div class="history-item">
          <div class="history-header">
            <strong>Example Entry</strong>
            <span class="tag">Quality 4 / 5</span>
          </div>
          <div class="history-meta">
            <span>Date: March 9</span>
            <span>Sleep Start: 11:30 PM</span>
            <span>Wake Time: 7:15 AM</span>
            <span>Hours: 7.75</span>
          </div>
          <p class="history-notes">Notes: "Felt well rested."</p>
        </div>
      `;
      return;
    }

    logs
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .forEach((log) => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.dataset.id = log.id;

        const notesPreview = log.notes ? log.notes.slice(0, 80) : 'No notes added.';

        item.innerHTML = `
          <div class="history-header">
            <strong>${formatDateLabel(log.date)}</strong>
            <span class="tag">Quality ${log.quality} / 5</span>
          </div>
          <div class="history-meta">
            <span>Sleep Start: ${log.sleepStart}</span>
            <span>Wake Time: ${log.wakeTime}</span>
            <span>Hours: ${formatHours(log.hoursSlept, 2)}</span>
          </div>
          <p class="history-notes">Notes: ${notesPreview}</p>
          <div class="history-actions">
            <button class="button secondary" type="button" data-action="edit">Edit</button>
            <button class="button danger" type="button" data-action="delete">Delete</button>
          </div>
        `;

        container.appendChild(item);
      });
  };

  const renderStats = (logs) => {
    const currentEl = $('#current-streak');
    const longestEl = $('#longest-streak');
    const avgHoursEl = $('#average-hours');
    const avgQualityEl = $('#average-quality');
    const bestEl = $('#best-night');
    const worstEl = $('#worst-night');

    const streaks = computeStreaks(logs);
    const insights = computeInsights(logs);

    if (currentEl) currentEl.textContent = streaks.current;
    if (longestEl) longestEl.textContent = streaks.longest;
    if (avgHoursEl) avgHoursEl.textContent = formatHours(insights.avgHours, 2);
    if (avgQualityEl) avgQualityEl.textContent = formatHours(insights.avgQuality, 1);

    if (bestEl) {
      bestEl.textContent = insights.best
        ? `${formatDateLabel(insights.best.date)} • ${formatHours(insights.best.hoursSlept, 2)}h (${insights.best.quality}/5)`
        : '—';
    }

    if (worstEl) {
      worstEl.textContent = insights.worst
        ? `${formatDateLabel(insights.worst.date)} • ${formatHours(insights.worst.hoursSlept, 2)}h (${insights.worst.quality}/5)`
        : '—';
    }
  };

  const initAuth = () => {
    const loginForm = $('#login-form');
    const signupForm = $('#signup-form');
    const message = $('#auth-message');

    if (!loginForm && !signupForm) return;
    if (!window.SleepSyncStorage) return;

    const session = SleepSyncStorage.getSession();
    if (session && session.userId) {
      window.location.href = 'dashboard.html';
      return;
    }

    const handleAuth = (mode) => (event) => {
      event.preventDefault();
      if (!message) return;
      message.textContent = '';

      const form = event.currentTarget;
      const email = form.querySelector('input[name="email"]').value.trim();
      const password = form.querySelector('input[name="password"]').value.trim();

      if (!email || !password) {
        message.textContent = 'Please enter both email and password.';
        return;
      }

      if (mode === 'signup') {
        const result = SleepSyncStorage.createUser(email, password);
        if (result.error) {
          message.textContent = result.error;
          return;
        }
        SleepSyncStorage.setSession(result.user.id);
        window.location.href = 'dashboard.html';
        return;
      }

      const result = SleepSyncStorage.authenticate(email, password);
      if (result.error) {
        message.textContent = result.error;
        return;
      }

      SleepSyncStorage.setSession(result.user.id);
      window.location.href = 'dashboard.html';
    };

    if (loginForm) loginForm.addEventListener('submit', handleAuth('login'));
    if (signupForm) signupForm.addEventListener('submit', handleAuth('signup'));
  };

  const initDashboard = () => {
    const form = $('#sleep-form');
    if (!form || !window.SleepSyncStorage) return;

    const session = SleepSyncStorage.getSession();
    if (!session || !session.userId) {
      window.location.href = 'login.html';
      return;
    }

    const logoutButton = $('#logout-button');
    if (logoutButton) {
      logoutButton.addEventListener('click', () => {
        SleepSyncStorage.clearSession();
        window.location.href = 'login.html';
      });
    }

    const dateInput = $('#sleep-date');
    const startInput = $('#sleep-start');
    const endInput = $('#sleep-end');
    const hoursInput = $('#sleep-hours');
    const qualityInput = $('#sleep-quality');
    const notesInput = $('#sleep-notes');
    const logIdInput = $('#sleep-log-id');
    const submitButton = $('#sleep-submit');
    const cancelButton = $('#sleep-cancel');
    const historyContainer = $('#sleep-history');

    let logs = SleepSyncStorage.getLogsForUser(session.userId);
    let editingId = null;

    const refresh = () => {
      logs = SleepSyncStorage.getLogsForUser(session.userId);
      renderStats(logs);
      renderChart(logs);
      renderHistory(logs);
    };

    const updateHoursPreview = () => {
      const hours = calculateHours(dateInput.value, startInput.value, endInput.value);
      hoursInput.value = hours ? formatHours(hours, 2) : '';
    };

    const resetForm = () => {
      editingId = null;
      form.reset();
      hoursInput.value = '';
      logIdInput.value = '';
      submitButton.textContent = 'Add Entry';
      cancelButton.classList.add('hidden');
    };

    const setEditing = (log) => {
      editingId = log.id;
      logIdInput.value = log.id;
      dateInput.value = log.date;
      startInput.value = log.sleepStart;
      endInput.value = log.wakeTime;
      hoursInput.value = formatHours(log.hoursSlept, 2);
      qualityInput.value = String(log.quality);
      notesInput.value = log.notes || '';
      submitButton.textContent = 'Update Entry';
      cancelButton.classList.remove('hidden');
    };

    if (dateInput) dateInput.addEventListener('change', updateHoursPreview);
    if (startInput) startInput.addEventListener('change', updateHoursPreview);
    if (endInput) endInput.addEventListener('change', updateHoursPreview);

    cancelButton.addEventListener('click', resetForm);
    cancelButton.classList.add('hidden');

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      if (!dateInput.value || !startInput.value || !endInput.value || !qualityInput.value) {
        form.reportValidity();
        return;
      }

      const hours = calculateHours(dateInput.value, startInput.value, endInput.value);
      const entry = {
        date: dateInput.value,
        sleepStart: startInput.value,
        wakeTime: endInput.value,
        hoursSlept: hours || 0,
        quality: Number(qualityInput.value),
        notes: notesInput.value.trim(),
      };

      if (editingId) {
        SleepSyncStorage.updateLog(session.userId, editingId, entry);
      } else {
        SleepSyncStorage.addLog(session.userId, {
          ...entry,
          id: SleepSyncStorage.createId(),
          createdAt: new Date().toISOString(),
        });
      }

      resetForm();
      refresh();
    });

    if (historyContainer) {
      historyContainer.addEventListener('click', (event) => {
        const button = event.target.closest('button');
        if (!button) return;
        const action = button.dataset.action;
        const item = button.closest('.history-item');
        if (!item) return;
        const logId = item.dataset.id;

        if (action === 'edit') {
          const log = logs.find((entry) => entry.id === logId);
          if (log) setEditing(log);
        }

        if (action === 'delete') {
          const shouldDelete = window.confirm('Delete this sleep log?');
          if (!shouldDelete) return;
          SleepSyncStorage.deleteLog(session.userId, logId);
          refresh();
        }
      });
    }

    const today = new Date();
    if (dateInput) {
      dateInput.value = today.toISOString().slice(0, 10);
    }

    refresh();
  };

  const init = () => {
    initAuth();
    initDashboard();
  };

  return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);
