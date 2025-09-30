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
    confettiCanvas: document.getElementById('confetti-canvas')
  };

  // Hidden screen-reader live region (fallback)
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

  // Add "Skip to content" link programmatically for keyboard users (if not present)
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
    // Theme
    const savedTheme = localStorage.getItem(CONFIG.THEME_STORAGE_KEY) || 'light';
    if (savedTheme === 'dark') document.body.classList.add('dark');
    updateThemeIcon(savedTheme);

    bindEvents();
    updateCharCount();
    updateHistoryDisplay();
    setupConfettiCanvas();

    // Register a minimal service worker if possible
    if ('serviceWorker' in navigator) {
      try {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      } catch (e) {}
    }
  }

  function bindEvents() {
    elements.themeToggle && elements.themeToggle.addEventListener('click', toggleTheme);
    elements.form && elements.form.addEventListener('submit', handleFormSubmit);

    // Text input debounced handlers
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

    // Sample buttons
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

    // History header accessible
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

    // Global keyboard shortcuts
    document.addEventListener('keydown', handleGlobalKeys);

    // Accessibility: make sample buttons and action buttons focusable if not already
    document.querySelectorAll('.sample-btn, .action-btn, .retry-btn, .clear-btn').forEach(el => {
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
    });
  }

  // THEME
  function toggleTheme() {
    const isDark = document.body.classList.toggle('dark');
    const newTheme = isDark ? 'dark' : 'light';
    localStorage.setItem(CONFIG.THEME_STORAGE_KEY, newTheme);
    updateThemeIcon(newTheme);
    announceSR(`Theme changed to ${newTheme}`);
  }

  function updateThemeIcon(theme) {
    if (!elements.themeIcon) return;
    elements.themeIcon.innerHTML = theme === 'dark' ?
      `<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>` :
      `<circle cx="12" cy="12" r="4"/>
        <path d="M12 2v2"/>
        <path d="M12 20v2"/>
        <path d="m4.93 4.93 1.41 1.41"/>
        <path d="m17.66 17.66 1.41 1.41"/>
        <path d="M2 12h2"/>
        <path d="M20 12h2"/>
        <path d="m6.34 17.66-1.41 1.41"/>
        <path d="m19.07 4.93-1.41 1.41"/>`;
  }

  // TEXTAREA & INPUT
  function adjustTextareaHeight() {
    if (!elements.textInput) return;
    elements.textInput.style.height = 'auto';
    elements.textInput.style.height = Math.max(120, elements.textInput.scrollHeight) + 'px';
  }

  function updateCharCount() {
    if (!elements.charCountText) return;
    const count = elements.textInput ? elements.textInput.value.length : 0;
    elements.charCountText.textContent = STRINGS.CHARACTER_COUNT(count);
    if (count > CONFIG.MAX_CHARACTERS) {
      showToast(`Text exceeds ${CONFIG.MAX_CHARACTERS} character limit.`);
      elements.submitBtn.disabled = true;
    } else {
      elements.submitBtn.disabled = false;
    }
  }

  function toggleClearButton() {
    if (!elements.clearBtn || !elements.textInput) return;
    elements.clearBtn.style.display = elements.textInput.value.length > 0 ? 'block' : 'none';
  }

  function clearInput() {
    if (!elements.textInput) return;
    elements.textInput.value = '';
    adjustTextareaHeight();
    updateCharCount();
    toggleClearButton();
    elements.textInput.focus();
    announceSR('Input cleared');
  }

  // FORM & API SIMULATION
  async function handleFormSubmit(event) {
    if (event && event.preventDefault) event.preventDefault();
    const text = elements.textInput ? elements.textInput.value.trim() : '';
    if (!text) {
      showToast(STRINGS.EMPTY_INPUT);
      elements.textInput && elements.textInput.focus();
      announceSR(STRINGS.EMPTY_INPUT);
      return;
    }
    if (text.length > CONFIG.MAX_CHARACTERS) {
      showToast(`Text exceeds ${CONFIG.MAX_CHARACTERS} character limit.`);
      announceSR(`Text exceeds ${CONFIG.MAX_CHARACTERS} character limit.`);
      return;
    }

    setLoading(true);
    elements.predictionResult && elements.predictionResult.classList.remove('show');

    try {
      const result = await analyzeText(text);
      showResult(result.prediction, result.confidence, text);
    } catch (error) {
      console.error('Analysis Error:', error);
      showResult(-1, null, text);
    } finally {
      setLoading(false);
    }
  }

  async function analyzeText(text) {
    await new Promise(resolve =>
      setTimeout(resolve,
        CONFIG.API_TIMEOUT_MIN +
        Math.random() * (CONFIG.API_TIMEOUT_MAX - CONFIG.API_TIMEOUT_MIN)
      )
    );
    // Mock prediction
    return {
      prediction: Math.random() > 0.5 ? 1 : 0,
      confidence: CONFIG.CONFIDENCE_MIN + Math.random() * CONFIG.CONFIDENCE_RANGE
    };
  }

  function retryAnalysis() {
    elements.retryBtn.disabled = true;
    elements.retryBtn.innerHTML = `<span aria-hidden="true" class="loading-spinner-inline"></span> ${STRINGS.RETRY_SUCCESS}`;
    setTimeout(() => {
      // Re-submit using the form handler
      handleFormSubmit({ preventDefault: () => {} });
    }, 800);
  }

  // UI & RESULTS
  function setLoading(isLoading) {
    if (!elements.submitBtn) return;
    elements.submitBtn.disabled = isLoading;
    if (elements.btnContent) elements.btnContent.style.display = isLoading ? 'none' : 'flex';
    if (elements.loadingSpinner) elements.loadingSpinner.style.display = isLoading ? 'block' : 'none';
  }

  function showResult(prediction, confidence = null, text = '') {
    currentResult = {
      prediction,
      confidence,
      text,
      timestamp: new Date()
    };

    const resultTitle = document.getElementById('result-title');
    const resultMessage = document.getElementById('result-message');
    const confidenceBar = document.getElementById('confidence-bar');
    const confidenceFill = document.getElementById('confidence-fill');
    const confidenceText = document.getElementById('confidence-text');
    const resultIconSvg = elements.predictionResult.querySelector('.result-icon-svg');

    elements.predictionResult.className = 'prediction-result';

    let message, className, iconSvg;
    if (prediction === 1) {
      message = STRINGS.RESULT_TRUE;
      className = 'success';
      iconSvg = `
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
        <path d="m9 12 2 2 4-4"/>
      `;
      // Confetti but respect prefers-reduced-motion
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setTimeout(() => launchConfetti(), 500);
      }
    } else if (prediction === 0) {
      message = STRINGS.RESULT_FALSE;
      className = 'error';
      iconSvg = `
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
        <path d="M12 9v4"/>
        <path d="M12 17h.01"/>
      `;
    } else {
      message = STRINGS.ANALYSIS_ERROR;
      className = 'warning';
      iconSvg = `
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
        <path d="M12 9v4"/>
        <path d="M12 17h.01"/>
      `;
      elements.retryBtn.style.display = 'block';
    }

    elements.predictionResult.classList.add(className);
    resultTitle.textContent = message;
    resultMessage.textContent = STRINGS.ANALYSIS_COMPLETED(text);
    resultIconSvg.innerHTML = iconSvg;

    if (confidence !== null && prediction !== -1) {
      confidenceBar.style.display = 'block';
      confidenceText.style.display = 'block';
      confidenceText.textContent = `Confidence: ${Math.round(confidence * 100)}%`;
      // animate fill
      setTimeout(() => {
        confidenceFill.style.width = `${Math.min(100, Math.round(confidence * 100))}%`;
      }, 300);
    } else {
      confidenceBar.style.display = 'none';
      confidenceText.style.display = 'none';
    }

    // show the result element accessibly
    setTimeout(() => {
      elements.predictionResult.classList.add('show');
      elements.predictionResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
      elements.retryBtn.style.display = 'none';
      elements.retryBtn.disabled = false;
      elements.retryBtn.innerHTML = `Retry`;
    }, 100);

    // Add to history and announce for SR
    if (prediction !== -1) {
      addToHistory(currentResult);
      announceSR(message + '. ' + STRINGS.ANALYSIS_COMPLETED(text));
    } else {
      announceSR(STRINGS.ANALYSIS_ERROR);
    }
  }

  // HISTORY
  function addToHistory(result) {
    const historyItem = { id: Date.now().toString(), ...result };
    history.unshift(historyItem);
    history = history.slice(0, CONFIG.MAX_HISTORY_ITEMS);
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(history));
    updateHistoryDisplay();
  }

  function updateHistoryDisplay() {
    if (!elements.historyCard) return;
    if (history.length === 0) {
      elements.historyCard.style.display = 'none';
      return;
    }
    elements.historyCard.style.display = 'block';
    elements.historyCount.textContent = history.length;
    if (historyExpanded) renderHistoryItems();
  }

  function renderHistoryItems() {
    if (!elements.historyItems) return;
    elements.historyItems.innerHTML = history.map(item => {
      const isTrue = item.prediction === 1;
      const resultText = isTrue ? STRINGS.HISTORY_RESULT_TRUE : STRINGS.HISTORY_RESULT_FALSE;
      const resultClass = isTrue ? 'true' : 'false';
      const confidenceText = item.confidence ? ` (${Math.round(item.confidence * 100)}%)` : '';
      return `
        <div class="history-item" tabindex="0">
          <button class="copy-history-btn" data-text="${encodeURIComponent(item.text)}" aria-label="Copy this text to input">📋</button>
          <div class="history-item-header">
            <span class="history-result ${resultClass}">
              ${isTrue ? '✓' : '✗'} ${resultText}${confidenceText}
            </span>
            <span class="history-date">${new Date(item.timestamp).toLocaleDateString()}</span>
          </div>
          <div class="history-text">${escapeHtml(item.text)}</div>
        </div>
      `;
    }).join('');

    // Bind copy events
    document.querySelectorAll('.copy-history-btn').forEach(btn => {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        const text = decodeURIComponent(this.dataset.text);
        elements.textInput.value = text;
        adjustTextareaHeight();
        updateCharCount();
        toggleClearButton();
        elements.textInput.focus();
        showToast('Text copied to input!');
        announceSR('Text copied to input');
      });
    });
  }

  function toggleHistory() {
    historyExpanded = !historyExpanded;
    if (elements.historyToggle) elements.historyToggle.classList.toggle('expanded', historyExpanded);
    if (elements.historyHeader) elements.historyHeader.setAttribute('aria-expanded', historyExpanded);
    if (historyExpanded) {
      elements.historyItems.classList.add('show');
      renderHistoryItems();
      announceSR(`History expanded. ${history.length} items.`);
    } else {
      elements.historyItems.classList.remove('show');
      announceSR('History collapsed');
    }
  }

  // COPY & SHARE
  function copyResult() {
    if (!currentResult) return;
    const resultText = currentResult.prediction === 1 ? STRINGS.HISTORY_RESULT_TRUE : STRINGS.HISTORY_RESULT_FALSE;
    const confidenceText = currentResult.confidence ? ` (${Math.round(currentResult.confidence * 100)}% confidence)` : '';
    const copyText = `Fact Check Result: ${resultText}${confidenceText}\nText analyzed: "${currentResult.text}"`;
    navigator.clipboard.writeText(copyText).then(() => {
      showToast(STRINGS.COPIED);
      announceSR(STRINGS.COPIED);
    }).catch(() => {
      showToast(STRINGS.COPY_FAILED);
      announceSR(STRINGS.COPY_FAILED);
    });
  }

  async function shareResult() {
    if (!currentResult) return;
    const resultText = currentResult.prediction === 1 ? STRINGS.HISTORY_RESULT_TRUE : STRINGS.HISTORY_RESULT_FALSE;
    const shareData = {
      title: 'Fact Check Result',
      text: STRINGS.SHARE_TEXT(resultText, currentResult.text),
      url: window.location.href
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        showToast(STRINGS.SHARED);
        announceSR(STRINGS.SHARED);
      } catch (err) {
        if (err.name !== 'AbortError') {
          showToast(STRINGS.SHARE_FAILED);
          announceSR(STRINGS.SHARE_FAILED);
        }
      }
    } else {
      navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`).then(() => {
        showToast(STRINGS.LINK_COPIED);
        announceSR(STRINGS.LINK_COPIED);
      }).catch(() => {
        showToast(STRINGS.COPY_FAILED);
        announceSR(STRINGS.COPY_FAILED);
      });
    }
  }

  // UTILITIES
  function showToast(message) {
    if (!elements.toast) return;
    elements.toast.textContent = message;
    elements.toast.classList.add('show');
    setTimeout(() => elements.toast.classList.remove('show'), 3000);
  }

  function announceSR(message) {
    if (!srLive) return;
    // Clear then set (force SR to reannounce)
    srLive.textContent = '';
    setTimeout(() => {
      srLive.textContent = message;
    }, 50);
  }

  function handleGlobalKeys(e) {
    // Alt+S -> focus search / textarea
    if (e.altKey && !e.shiftKey && !e.ctrlKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      elements.textInput && elements.textInput.focus();
      showToast('Focused input (Alt+S)');
      return;
    }

    // Alt+H -> toggle history
    if (e.altKey && e.key.toLowerCase() === 'h') {
      e.preventDefault();
      toggleHistory();
      return;
    }

    // Alt+Enter -> submit form
    if (e.altKey && e.key === 'Enter') {
      e.preventDefault();
      if (elements.form) {
        // use requestSubmit if available for proper validation semantics
        if (typeof elements.form.requestSubmit === 'function') elements.form.requestSubmit();
        else elements.form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      }
      return;
    }

    // Escape to collapse history
    if (e.key === 'Escape' && historyExpanded) {
      e.preventDefault();
      toggleHistory();
      return;
    }
  }

  // Confetti: optimized, respects prefers-reduced-motion
  function setupConfettiCanvas() {
    const canvas = elements.confettiCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let confetti = [];
    let animationId = null;

    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function createConfetti() {
      const count = 120;
      confetti = [];
      for (let i = 0; i < count; i++) {
        confetti.push({
          x: Math.random() * canvas.width,
          y: Math.random() * -canvas.height,
          size: Math.random() * 6 + 3,
          color: ['#4f46e5', '#7c3aed', '#10b981', '#f59e0b'][Math.floor(Math.random() * 4)],
          speed: Math.random() * 3 + 2,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 10
        });
      }
    }

    function updateConfetti() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let stillFalling = false;
      for (let p of confetti) {
        p.y += p.speed;
        p.rotation += p.rotationSpeed;
        if (p.y < canvas.height + 10) {
          stillFalling = true;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation * Math.PI / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }
      }
      if (stillFalling) {
        animationId = requestAnimationFrame(updateConfetti);
      } else {
        canvas.style.display = 'none';
        if (animationId) {
          cancelAnimationFrame(animationId);
          animationId = null;
        }
      }
    }

    function onResize() {
      resizeCanvas();
    }

    window.addEventListener('resize', onResize);
    resizeCanvas();
    createConfetti();

    window.launchConfetti = function () {
      // Respect reduced motion
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      canvas.style.display = 'block';
      resizeCanvas();
      createConfetti();
      if (animationId) cancelAnimationFrame(animationId);
      animationId = requestAnimationFrame(updateConfetti);
    };
  }

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

  // Initial accessibility helpers
  // Provide keyboard hints to screen readers on page load only
  setTimeout(() => announceSR('Quick Fact Checker ready. Press Alt S to focus input. Alt Enter to submit. Alt H to toggle history.'), 500);

})(); // End IIFE
