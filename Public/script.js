// accessibility-enhanced script.js
(function () {
  'use strict';

  // ======================
  // CONFIG & CONSTANTS
  // ======================
  const CONFIG = {
    MAX_CHARACTERS: 1000,
    MAX_HISTORY_ITEMS: 5,
    API_TIMEOUT_MIN: 2000,
    API_TIMEOUT_MAX: 3000,
    CONFIDENCE_MIN: 0.65,
    CONFIDENCE_RANGE: 0.30,
    STORAGE_KEY: 'fact-check-history',
    THEME_STORAGE_KEY: 'theme'
  };

  const STRINGS = {
    EMPTY_INPUT: "Please enter some text to analyze.",
    COPIED: "Result copied to clipboard!",
    COPY_FAILED: "Failed to copy result",
    SHARED: "Result shared successfully!",
    SHARE_FAILED: "Failed to share result",
    LINK_COPIED: "Share link copied to clipboard!",
    ANALYSIS_ERROR: "Error analyzing text. Please try again.",
    RETRY_SUCCESS: "Retrying analysis...",
    CHARACTER_COUNT: (count) => `${count} character${count !== 1 ? 's' : ''}`,
    RESULT_TRUE: "This text is likely TRUE",
    RESULT_FALSE: "This text is likely FAKE",
    ANALYSIS_COMPLETED: (text) => `Analysis completed for: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`,
    HISTORY_RESULT_TRUE: "TRUE",
    HISTORY_RESULT_FALSE: "FAKE",
    SHARE_TEXT: (result, text) => `Quick Fact Checker result: ${result} - "${text.substring(0, 100)}..."`
  };

  // DOM Elements (grab once)
  const elements = {
    form: document.getElementById('prediction-form'),
    submitBtn: document.getElementById('submit-btn'),
    btnContent: document.querySelector('.btn-content'),
    loadingSpinner: document.querySelector('.loading-spinner'),
    predictionResult: document.getElementById('prediction-result'),
    themeToggle: document.getElementById('theme-toggle'),
    themeIcon: document.querySelector('.theme-icon'),
    textInput: document.getElementById('text-input'),
    charCountText: document.getElementById('char-count-text'),
    clearBtn: document.getElementById('clear-btn'),
    sampleBtns: document.querySelectorAll('.sample-btn'),
    historyCard: document.getElementById('history-card'),
    historyHeader: document.getElementById('history-header'),
    historyItems: document.getElementById('history-items'),
    historyToggle: document.getElementById('history-toggle'),
    historyCount: document.getElementById('history-count'),
    copyBtn: document.getElementById('copy-btn'),
    shareBtn: document.getElementById('share-btn'),
    retryBtn: document.getElementById('retry-btn'),
    toast: document.getElementById('toast'),
    confettiCanvas: document.getElementById('confetti-canvas'),

    // Dashboard elements
    modelSelect: document.getElementById('model-select'),
    datasetSelect: document.getElementById('dataset-select'),
    metricSelect: document.getElementById('metric-select'),
    summaryText: document.getElementById('summary-text'),
    chartCanvas: document.getElementById('dashboard-chart')
  };

  // Hidden screen-reader live region
  let srLive = document.getElementById('sr-live-region');
  if (!srLive) {
    srLive = document.createElement('div');
    srLive.id = 'sr-live-region';
    srLive.setAttribute('aria-live', 'polite');
    srLive.setAttribute('aria-atomic', 'true');
    srLive.className = 'visually-hidden';
    document.body.appendChild(srLive);
  }

  // State
  let currentResult = null;
  let history = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY) || '[]');
  let historyExpanded = false;
  let resizeTimeout = null;

  // Dashboard state
  let dashboardData = [];
  let chartInstance = null;

  // Add "Skip to content" link
  (function ensureSkipLink() {
    if (!document.querySelector('.skip-to-content')) {
      const a = document.createElement('a');
      a.href = '#main-content';
      a.className = 'skip-to-content';
      a.textContent = 'Skip to content';
      a.setAttribute('aria-label', 'Skip to main content');
      document.body.insertBefore(a, document.body.firstChild);
    }
  })();

  // Initialize
  init();

  function init() {
    const savedTheme = localStorage.getItem(CONFIG.THEME_STORAGE_KEY) || 'light';
    if (savedTheme === 'dark') document.body.classList.add('dark');
    updateThemeIcon(savedTheme);

    bindEvents();
    updateCharCount();
    updateHistoryDisplay();
    setupConfettiCanvas();

    if ('serviceWorker' in navigator) {
      try {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      } catch (e) {}
    }

    // Initialize Dashboard if present
    if (elements.chartCanvas) {
      loadDashboard();
    }
  }

  function bindEvents() {
    elements.themeToggle && elements.themeToggle.addEventListener('click', toggleTheme);
    elements.form && elements.form.addEventListener('submit', handleFormSubmit);

    if (elements.textInput) {
      elements.textInput.addEventListener('input', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          adjustTextareaHeight();
          updateCharCount();
          toggleClearButton();
        }, 100);
      });
    }

    elements.clearBtn && elements.clearBtn.addEventListener('click', clearInput);

    elements.sampleBtns && elements.sampleBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        elements.textInput.value = btn.dataset.sample;
        adjustTextareaHeight();
        updateCharCount();
        toggleClearButton();
        elements.textInput.focus();
        elements.textInput.setSelectionRange(0, elements.textInput.value.length);
      });
    });

    if (elements.historyHeader) {
      elements.historyHeader.addEventListener('click', toggleHistory);
      elements.historyHeader.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleHistory();
        }
      });
    }

    elements.copyBtn && elements.copyBtn.addEventListener('click', copyResult);
    elements.shareBtn && elements.shareBtn.addEventListener('click', shareResult);
    elements.retryBtn && elements.retryBtn.addEventListener('click', retryAnalysis);

    document.addEventListener('keydown', handleGlobalKeys);

    // Dashboard dropdown events
    if (elements.modelSelect && elements.metricSelect) {
      elements.modelSelect.addEventListener('change', updateDashboard);
      elements.datasetSelect && elements.datasetSelect.addEventListener('change', updateDashboard);
      elements.metricSelect.addEventListener('change', updateDashboard);
    }
  }

  // ======================
  // DASHBOARD FUNCTIONS
  // ======================
  async function loadDashboard() {
    try {
      const res = await fetch('/dashboard_data');
      dashboardData = await res.json();

      // Populate model dropdown
      if (elements.modelSelect) {
        elements.modelSelect.innerHTML = dashboardData.map(m =>
          `<option value="${m.model}">${m.model}</option>`
        ).join('');
      }

      updateDashboard();
    } catch (err) {
      console.error('Error loading dashboard:', err);
      if (elements.summaryText) elements.summaryText.textContent = "⚠️ Failed to load dashboard data.";
    }
  }

  function updateDashboard() {
    if (!dashboardData.length || !elements.metricSelect) return;

    const selectedMetric = elements.metricSelect.value || 'accuracy';
    const selectedModels = Array.from(elements.modelSelect.selectedOptions).map(opt => opt.value);

    // Filter models if selected
    let filtered = selectedModels.length ? dashboardData.filter(m => selectedModels.includes(m.model)) : dashboardData;

    const labels = filtered.map(m => m.model);
    const values = filtered.map(m => m[selectedMetric]);

    // Update chart
    const ctx = elements.chartCanvas.getContext('2d');
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: selectedMetric.toUpperCase(),
          data: values
        }]
      },
      options: {
        responsive: true,
        scales: { y: { beginAtZero: true, max: 1 } }
      }
    });

    // Update summary
    if (elements.summaryText) {
      if (!values.length) {
        elements.summaryText.textContent = "Select a model to see insights...";
      } else {
        const bestIdx = values.indexOf(Math.max(...values));
        elements.summaryText.textContent = `${labels[bestIdx]} performs best on ${selectedMetric.toUpperCase()} (${values[bestIdx].toFixed(3)}).`;
      }
    }
  }

  // ======================
  // (existing fact-checker code remains unchanged below…)
  // ======================
  // ... [keep all your fact-checker functions exactly as in your script.js above]
  // (toggleTheme, adjustTextareaHeight, handleFormSubmit, analyzeText, retryAnalysis, showResult, history, copy/share, utilities, confetti, etc.)

  // Safe HTML escape utility
  function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  setTimeout(() => announceSR('Quick Fact Checker ready. Press Alt S to focus input. Alt Enter to submit. Alt H to toggle history.'), 500);

})(); // End IIFE
// -------------------------------
// Quick Fact Checker Frontend Logic
// -------------------------------

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("prediction-form");
  const textInput = document.getElementById("text-input");
  const charCountText = document.getElementById("char-count-text");
  const clearBtn = document.getElementById("clear-btn");
  const submitBtn = document.getElementById("submit-btn");
  const resultContainer = document.getElementById("prediction-result");
  const resultTitle = document.getElementById("result-title");
  const resultMessage = document.getElementById("result-message");
  const confidenceBar = document.getElementById("confidence-bar");
  const confidenceFill = document.getElementById("confidence-fill");
  const confidenceText = document.getElementById("confidence-text");
  const retryBtn = document.getElementById("retry-btn");
  const copyBtn = document.getElementById("copy-btn");
  const shareBtn = document.getElementById("share-btn");
  const historyCard = document.getElementById("history-card");
  const historyItems = document.getElementById("history-items");
  const historyCount = document.getElementById("history-count");
  const historyHeader = document.getElementById("history-header");
  const historyToggle = document.getElementById("history-toggle");
  const toast = document.getElementById("toast");
  const confettiCanvas = document.getElementById("confetti-canvas");
  const themeToggle = document.getElementById("theme-toggle");

  let historyData = [];
  let isHistoryExpanded = false;

  // -------------------------------
  // Character Counter
  // -------------------------------
  textInput.addEventListener("input", () => {
    charCountText.textContent = `${textInput.value.length} characters`;
  });

  // Clear button
  clearBtn.addEventListener("click", () => {
    textInput.value = "";
    charCountText.textContent = "0 characters";
  });

  // -------------------------------
  // Sample Buttons
  // -------------------------------
  document.querySelectorAll(".sample-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      textInput.value = btn.dataset.sample;
      charCountText.textContent = `${textInput.value.length} characters`;
    });
  });

  // -------------------------------
  // Form Submit
  // -------------------------------
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = textInput.value.trim();
    if (!text) {
      showToast("⚠️ Please enter some text before submitting.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const result = await response.json();

      if (result.error) {
        resultTitle.textContent = "Error";
        resultMessage.textContent = result.error;
      } else {
        resultTitle.textContent = "Analysis Result";
        resultMessage.textContent = result.message || `Prediction: ${result.prediction}`;
        addToHistory(result.message || result.prediction);
        launchConfetti();
      }
    } catch (err) {
      resultTitle.textContent = "Error";
      resultMessage.textContent = "Something went wrong. Try again later.";
    } finally {
      setLoading(false);
    }
  });

  function setLoading(isLoading) {
    if (isLoading) {
      submitBtn.disabled = true;
      resultMessage.textContent = "Processing your text...";
      confidenceBar.style.display = "none";
      confidenceText.style.display = "none";
    } else {
      submitBtn.disabled = false;
    }
  }

  // -------------------------------
  // History Handling
  // -------------------------------
  function addToHistory(result) {
    historyData.unshift(result);
    if (historyData.length > 5) historyData.pop();

    historyCount.textContent = historyData.length;
    historyItems.innerHTML = historyData.map((r) => `<div class="history-item">${r}</div>`).join("");
    historyCard.style.display = "block";
  }

  historyHeader.addEventListener("click", () => {
    isHistoryExpanded = !isHistoryExpanded;
    historyItems.style.display = isHistoryExpanded ? "block" : "none";
    historyHeader.setAttribute("aria-expanded", isHistoryExpanded);
    historyToggle.style.transform = isHistoryExpanded ? "rotate(180deg)" : "rotate(0deg)";
  });

  // -------------------------------
  // Copy & Share
  // -------------------------------
  copyBtn.addEventListener("click", async () => {
    await navigator.clipboard.writeText(resultMessage.textContent);
    showToast("📋 Result copied!");
  });

  shareBtn.addEventListener("click", async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Fact Checker Result",
          text: resultMessage.textContent,
        });
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      showToast("Sharing not supported on this device.");
    }
  });

  retryBtn.addEventListener("click", () => {
    form.dispatchEvent(new Event("submit"));
  });

  // -------------------------------
  // Toast Notifications
  // -------------------------------
  function showToast(msg) {
    toast.textContent = msg;
    toast.style.display = "block";
    setTimeout(() => (toast.style.display = "none"), 3000);
  }

  // -------------------------------
  // Confetti 🎉
  // -------------------------------
  function launchConfetti() {
    confettiCanvas.style.display = "block";
    setTimeout(() => (confettiCanvas.style.display = "none"), 3000);
  }

  // -------------------------------
  // Theme Toggle
  // -------------------------------
  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
  });

  // -------------------------------
  // Service Worker
  // -------------------------------
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(console.error);
  }

  // -------------------------------
  // 🆕 Model Performance Dashboard
  // -------------------------------
  let dashboardChart;

  async function loadDashboardData() {
    const resp = await fetch("/dashboard_data");
    return await resp.json();
  }

  function renderDashboardChart(data, metric) {
    const ctx = document.getElementById("dashboard-chart").getContext("2d");
    if (dashboardChart) dashboardChart.destroy();

    const labels = data.map((d) => d.model);
    const values = data.map((d) => d[metric] || 0);

    dashboardChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [{ label: metric, data: values, backgroundColor: "#6b5bff" }],
      },
      options: { responsive: true, plugins: { legend: { display: false } } },
    });
  }

  function updateDashboardInsights(data, metric) {
    if (data.length === 0) {
      document.getElementById("summary-text").innerText = "No models selected.";
      return;
    }
    const best = [...data].sort((a, b) => (b[metric] || 0) - (a[metric] || 0))[0];
    document.getElementById("summary-text").innerText = `${best.model} performs best on ${metric} (${(best[metric] || 0).toFixed(3)}).`;
  }

  async function updateDashboard() {
    const allData = await loadDashboardData();
    const selectedModels = Array.from(document.getElementById("model-select").selectedOptions).map((o) => o.value);
    const metric = document.getElementById("metric-select").value;

    let filtered = allData.filter((d) => selectedModels.includes(d.model));
    renderDashboardChart(filtered, metric);
    updateDashboardInsights(filtered, metric);
  }

  // Attach dashboard events
  const modelSelect = document.getElementById("model-select");
  const metricSelect = document.getElementById("metric-select");
  const datasetSelect = document.getElementById("dataset-select");

  if (modelSelect && metricSelect && datasetSelect) {
    modelSelect.addEventListener("change", updateDashboard);
    metricSelect.addEventListener("change", updateDashboard);
    datasetSelect.addEventListener("change", updateDashboard);

    // Initial load
    (async function () {
      const data = await loadDashboardData();
      for (let i = 0; i < modelSelect.options.length; i++) {
        modelSelect.options[i].selected = true;
      }
      renderDashboardChart(data, "accuracy");
      updateDashboardInsights(data, "accuracy");
    })();
  }
});
