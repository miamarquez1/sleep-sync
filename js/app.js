const App = (() => {
  const $ = (selector) => document.querySelector(selector);

  const formatDateLabel = (dateStr) => {
    const date = new Date(`${dateStr}T00:00:00`);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatHours = (value, decimals = 2) => {
    if (!Number.isFinite(value)) return "0.0";
    return value.toFixed(decimals);
  };

  const parseNumberOrNull = (value) => {
    if (value === "" || value === null || typeof value === "undefined") {
      return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
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
        const diffDays = Math.round(
          (currentDate - prevDate) / (1000 * 60 * 60 * 24),
        );
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
      const diffDays = Math.round(
        (currentDate - nextDate) / (1000 * 60 * 60 * 24),
      );
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
      if (log.quality === result.quality && log.hoursSlept > result.hoursSlept)
        return log;
      return result;
    }, null);

    const worst = logs.reduce((result, log) => {
      if (!result) return log;
      if (log.quality < result.quality) return log;
      if (log.quality === result.quality && log.hoursSlept < result.hoursSlept)
        return log;
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
      if (!acc[log.date]) {
        acc[log.date] = { totalHours: 0, count: 0 };
      }
      const hours = Number(log.hoursSlept);
      acc[log.date].totalHours += Number.isFinite(hours) ? hours : 0;
      acc[log.date].count += 1;
      return acc;
    }, {});

    const data = [];
    const today = new Date();
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const key = date.toISOString().slice(0, 10);
      const day = map[key];
      const hours = day ? day.totalHours : 0;
      data.push({
        date: key,
        label: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        hours,
      });
    }
    return data;
  };

  const renderChart = (logs) => {
    const chart = $("#sleep-chart");
    if (!chart) return;
    chart.innerHTML = "";

    const data = getChartData(logs);
    const chartHeight = chart.clientHeight || 220;
    const maxBarHeight = Math.max(80, chartHeight - 90);
    const minBarHeight = 10;

    data.forEach((entry) => {
      const wrapper = document.createElement("div");
      wrapper.className = "chart-bar";

      const value = document.createElement("span");
      value.textContent = `${formatHours(entry.hours, 1)}h`;

      const bar = document.createElement("div");
      bar.className = "bar";
      const clampedHours = Math.max(0, Math.min(entry.hours, 8));
      const ratio = clampedHours / 8;
      const pixelHeight = Math.round(
        minBarHeight + ratio * (maxBarHeight - minBarHeight),
      );
      bar.style.height = `${pixelHeight}px`;

      const label = document.createElement("span");
      label.textContent = entry.label;

      wrapper.append(value, bar, label);
      chart.appendChild(wrapper);
    });
  };

  const renderHistory = (logs, options = {}) => {
    const container = $("#sleep-history");
    if (!container) return;
    container.innerHTML = "";

    const {
      showExampleWhenEmpty = true,
      emptyTitle = "No matching entries",
      emptyMessage = "Try adjusting your filters.",
    } = options;

    if (!logs.length) {
      if (!showExampleWhenEmpty) {
        container.innerHTML = `
          <div class="history-item">
            <div class="history-header">
              <strong>${emptyTitle}</strong>
            </div>
            <p class="history-notes">${emptyMessage}</p>
          </div>
        `;
        return;
      }

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
        const item = document.createElement("div");
        item.className = "history-item";
        item.dataset.id = log.id;

        const notesPreview = log.notes
          ? log.notes.slice(0, 80)
          : "No notes added.";

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
            <button
              class="button danger"
              type="button"
              data-action="delete"
              aria-label="Delete sleep log for ${formatDateLabel(log.date)}"
            >Delete</button>
          </div>
        `;

        container.appendChild(item);
      });
  };

  const renderStats = (logs) => {
    const currentEl = $("#current-streak");
    const longestEl = $("#longest-streak");
    const avgHoursEl = $("#average-hours");
    const avgQualityEl = $("#average-quality");
    const bestEl = $("#best-night");
    const worstEl = $("#worst-night");

    const streaks = computeStreaks(logs);
    const insights = computeInsights(logs);

    if (currentEl) currentEl.textContent = streaks.current;
    if (longestEl) longestEl.textContent = streaks.longest;
    if (avgHoursEl) avgHoursEl.textContent = formatHours(insights.avgHours, 2);
    if (avgQualityEl)
      avgQualityEl.textContent = formatHours(insights.avgQuality, 1);

    if (bestEl) {
      bestEl.textContent = insights.best
        ? `${formatDateLabel(insights.best.date)} • ${formatHours(insights.best.hoursSlept, 2)}h (${insights.best.quality}/5)`
        : "—";
    }

    if (worstEl) {
      worstEl.textContent = insights.worst
        ? `${formatDateLabel(insights.worst.date)} • ${formatHours(insights.worst.hoursSlept, 2)}h (${insights.worst.quality}/5)`
        : "—";
    }
  };

  const initAuth = async () => {
    const loginForm = $("#login-form");
    const signupForm = $("#signup-form");
    const message = $("#auth-message");

    if (!loginForm && !signupForm) return;
    if (!window.SleepSyncAuth) return;

    await SleepSyncAuth.init();
    if (!SleepSyncAuth.isConfigured()) {
      if (message) {
        message.textContent =
          SleepSyncAuth.getInitError() ||
          "Firebase auth is not configured. Add your SLEEPSYNC_FIREBASE_CONFIG in js/firebase-config.js before using auth.";
      }
      return;
    }

    await SleepSyncAuth.requireGuest("dashboard.html");
    if (SleepSyncAuth.getCurrentUser()) {
      return;
    }

    const handleAuth = (mode) => async (event) => {
      event.preventDefault();
      if (!message) return;
      message.textContent = "";

      const form = event.currentTarget;
      const email = form.querySelector('input[name="email"]').value.trim();
      const password = form
        .querySelector('input[name="password"]')
        .value.trim();

      if (!email || !password) {
        message.textContent = "Please enter both email and password.";
        return;
      }

      try {
        if (mode === "signup") {
          await SleepSyncAuth.signup(email, password);
        } else {
          await SleepSyncAuth.login(email, password);
        }
        window.location.href = "dashboard.html";
      } catch (error) {
        console.error("SleepSync auth error:", error);
        message.textContent = SleepSyncAuth.mapAuthError(error);
      }
    };

    if (loginForm) loginForm.addEventListener("submit", handleAuth("login"));
    if (signupForm) signupForm.addEventListener("submit", handleAuth("signup"));
  };

  const initDashboard = async () => {
    const form = $("#sleep-form");
    if (!form || !window.SleepSyncStorage || !window.SleepSyncAuth) return;

    await SleepSyncAuth.init();
    const user = await SleepSyncAuth.requireAuthenticated("login.html");
    if (!user || !user.uid) {
      return;
    }

    const userId = user.uid;

    const logoutButton = $("#logout-button");
    const openLogModalButton = $("#open-log-modal");
    const closeLogModalButton = $("#close-log-modal");
    const sleepLogModal = $("#sleep-log-modal");
    if (logoutButton) {
      logoutButton.addEventListener("click", async () => {
        await SleepSyncAuth.logout();
        window.location.href = "login.html";
      });
    }

    const dateInput = $("#sleep-date");
    const startInput = $("#sleep-start");
    const endInput = $("#sleep-end");
    const hoursInput = $("#sleep-hours");
    const qualityInput = $("#sleep-quality");
    const notesInput = $("#sleep-notes");
    const logIdInput = $("#sleep-log-id");
    const submitButton = $("#sleep-submit");
    const cancelButton = $("#sleep-cancel");
    const historyContainer = $("#sleep-history");
    const filterMode = $("#filter-mode");
    const filterToggleButton = $("#filter-toggle");
    const advancedFiltersPanel = $("#advanced-filters");
    const filterDateFrom = $("#filter-date-from");
    const filterDateTo = $("#filter-date-to");
    const filterRatingMin = $("#filter-rating-min");
    const filterRatingMax = $("#filter-rating-max");
    const filterHoursMin = $("#filter-hours-min");
    const filterHoursMax = $("#filter-hours-max");
    const filterApplyButton = $("#filter-apply");
    const filterResetButton = $("#filter-reset");
    const filterResults = $("#filter-results");

    const setDefaultDate = () => {
      if (!dateInput || dateInput.value) return;
      dateInput.value = new Date().toISOString().slice(0, 10);
    };

    const openModal = () => {
      if (!sleepLogModal) return;
      sleepLogModal.classList.remove("hidden");
      sleepLogModal.setAttribute("aria-hidden", "false");
      document.body.classList.add("modal-open");
      setDefaultDate();
    };

    const closeModal = () => {
      if (!sleepLogModal) return;
      sleepLogModal.classList.add("hidden");
      sleepLogModal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("modal-open");
    };

    let logs = [];
    let editingId = null;
    let activeAdvancedFilters = {
      dateFrom: "",
      dateTo: "",
      ratingMin: null,
      ratingMax: null,
      hoursMin: null,
      hoursMax: null,
    };

    const getQuickFilters = () => {
      const mode = filterMode ? filterMode.value : "all";
      const today = new Date();
      const toDate = today.toISOString().slice(0, 10);

      const subtractDays = (days) => {
        const copy = new Date(today);
        copy.setDate(copy.getDate() - days);
        return copy.toISOString().slice(0, 10);
      };

      switch (mode) {
        case "last7":
          return { dateFrom: subtractDays(6), dateTo: toDate };
        case "last30":
          return { dateFrom: subtractDays(29), dateTo: toDate };
        case "rating4plus":
          return { ratingMin: 4 };
        case "rating2minus":
          return { ratingMax: 2 };
        case "under6":
          return { hoursMax: 6 };
        case "over8":
          return { hoursMin: 8 };
        case "all":
        default:
          return {};
      }
    };

    const getSpecificFiltersFromInputs = () => {
      return {
        dateFrom: filterDateFrom ? filterDateFrom.value : "",
        dateTo: filterDateTo ? filterDateTo.value : "",
        ratingMin: parseNumberOrNull(
          filterRatingMin ? filterRatingMin.value : "",
        ),
        ratingMax: parseNumberOrNull(
          filterRatingMax ? filterRatingMax.value : "",
        ),
        hoursMin: parseNumberOrNull(filterHoursMin ? filterHoursMin.value : ""),
        hoursMax: parseNumberOrNull(filterHoursMax ? filterHoursMax.value : ""),
      };
    };

    const getFilters = () => {
      return {
        ...activeAdvancedFilters,
        ...getQuickFilters(),
      };
    };

    const filterLogs = (sourceLogs, filters) => {
      return sourceLogs.filter((log) => {
        const dateValue = log.date || "";
        const qualityValue = Number(log.quality);
        const hoursValue = Number(log.hoursSlept);

        if (filters.dateFrom && dateValue < filters.dateFrom) return false;
        if (filters.dateTo && dateValue > filters.dateTo) return false;
        if (
          filters.ratingMin !== null &&
          Number.isFinite(qualityValue) &&
          qualityValue < filters.ratingMin
        ) {
          return false;
        }
        if (
          filters.ratingMax !== null &&
          Number.isFinite(qualityValue) &&
          qualityValue > filters.ratingMax
        ) {
          return false;
        }
        if (
          filters.hoursMin !== null &&
          Number.isFinite(hoursValue) &&
          hoursValue < filters.hoursMin
        ) {
          return false;
        }
        if (
          filters.hoursMax !== null &&
          Number.isFinite(hoursValue) &&
          hoursValue > filters.hoursMax
        ) {
          return false;
        }

        return true;
      });
    };

    const refreshFilteredHistory = () => {
      const filters = getFilters();
      const filteredLogs = filterLogs(logs, filters);
      const hasActiveFilters = Object.values(filters).some(
        (value) => value !== "" && value !== null,
      );

      if (filterResults) {
        if (hasActiveFilters) {
          filterResults.textContent = `Showing ${filteredLogs.length} of ${logs.length} entries`;
        } else {
          filterResults.textContent = `Showing all ${logs.length} entries`;
        }
      }

      renderHistory(filteredLogs, {
        showExampleWhenEmpty: !hasActiveFilters,
        emptyTitle: "No logs match these filters",
        emptyMessage: "Try a wider date range or adjust rating/hours limits.",
      });
    };

    const refresh = async () => {
      logs = await SleepSyncStorage.getLogsForUser(userId);
      renderStats(logs);
      renderChart(logs);
      refreshFilteredHistory();
    };

    const updateHoursPreview = () => {
      const hours = calculateHours(
        dateInput.value,
        startInput.value,
        endInput.value,
      );
      hoursInput.value = hours ? formatHours(hours, 2) : "";
    };

    const resetForm = () => {
      editingId = null;
      form.reset();
      hoursInput.value = "";
      logIdInput.value = "";
      submitButton.textContent = "Add Entry";
      cancelButton.classList.add("hidden");
      setDefaultDate();
    };

    const setEditing = (log) => {
      editingId = log.id;
      logIdInput.value = log.id;
      dateInput.value = log.date;
      startInput.value = log.sleepStart;
      endInput.value = log.wakeTime;
      hoursInput.value = formatHours(log.hoursSlept, 2);
      qualityInput.value = String(log.quality);
      notesInput.value = log.notes || "";
      submitButton.textContent = "Update Entry";
      cancelButton.classList.remove("hidden");
    };

    if (dateInput) dateInput.addEventListener("change", updateHoursPreview);
    if (startInput) startInput.addEventListener("change", updateHoursPreview);
    if (endInput) endInput.addEventListener("change", updateHoursPreview);

    if (openLogModalButton) {
      openLogModalButton.addEventListener("click", () => {
        resetForm();
        openModal();
      });
    }

    if (closeLogModalButton) {
      closeLogModalButton.addEventListener("click", closeModal);
    }

    if (sleepLogModal) {
      sleepLogModal.addEventListener("click", (event) => {
        if (event.target === sleepLogModal) {
          closeModal();
        }
      });
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeModal();
      }
    });

    if (filterMode) {
      filterMode.addEventListener("change", refreshFilteredHistory);
    }

    if (filterToggleButton && advancedFiltersPanel) {
      filterToggleButton.addEventListener("click", () => {
        advancedFiltersPanel.classList.toggle("hidden");
      });
    }

    if (filterApplyButton) {
      filterApplyButton.addEventListener("click", () => {
        activeAdvancedFilters = getSpecificFiltersFromInputs();
        refreshFilteredHistory();
      });
    }

    if (filterResetButton) {
      filterResetButton.addEventListener("click", () => {
        if (filterMode) filterMode.value = "all";
        if (filterDateFrom) filterDateFrom.value = "";
        if (filterDateTo) filterDateTo.value = "";
        if (filterRatingMin) filterRatingMin.value = "";
        if (filterRatingMax) filterRatingMax.value = "";
        if (filterHoursMin) filterHoursMin.value = "";
        if (filterHoursMax) filterHoursMax.value = "";
        activeAdvancedFilters = {
          dateFrom: "",
          dateTo: "",
          ratingMin: null,
          ratingMax: null,
          hoursMin: null,
          hoursMax: null,
        };
        refreshFilteredHistory();
      });
    }

    cancelButton.addEventListener("click", () => {
      resetForm();
      closeModal();
    });
    cancelButton.classList.add("hidden");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (
        !dateInput.value ||
        !startInput.value ||
        !endInput.value ||
        !qualityInput.value
      ) {
        form.reportValidity();
        return;
      }

      const hours = calculateHours(
        dateInput.value,
        startInput.value,
        endInput.value,
      );
      const entry = {
        date: dateInput.value,
        sleepStart: startInput.value,
        wakeTime: endInput.value,
        hoursSlept: hours || 0,
        quality: Number(qualityInput.value),
        notes: notesInput.value.trim(),
      };

      try {
        if (editingId) {
          await SleepSyncStorage.updateLog(userId, editingId, entry);
        } else {
          await SleepSyncStorage.addLog(userId, {
            ...entry,
            id: SleepSyncStorage.createId(),
            createdAt: new Date().toISOString(),
          });
        }

        resetForm();
        closeModal();
        await refresh();
      } catch (error) {
        console.error("SleepSync storage error:", error);
        window.alert(
          "Could not save sleep log. Please check your Firestore setup and try again.",
        );
      }
    });

    if (historyContainer) {
      historyContainer.addEventListener("click", async (event) => {
        const button = event.target.closest("button");
        if (!button) return;
        const action = button.dataset.action;
        const item = button.closest(".history-item");
        if (!item) return;
        const logId = item.dataset.id;

        if (action === "edit") {
          const log = logs.find((entry) => entry.id === logId);
          if (log) {
            setEditing(log);
            openModal();
          }
        }

        if (action === "delete") {
          const shouldDelete = window.confirm("Delete this sleep log?");
          if (!shouldDelete) return;
          try {
            await SleepSyncStorage.deleteLog(userId, logId);
            await refresh();
          } catch (error) {
            console.error("SleepSync storage error:", error);
            window.alert(
              "Could not delete sleep log. Please check your Firestore setup and try again.",
            );
          }
        }
      });
    }

    setDefaultDate();

    await refresh();
  };

  const init = async () => {
    await initAuth();
    await initDashboard();
  };

  return { init };
})();

document.addEventListener("DOMContentLoaded", App.init);
