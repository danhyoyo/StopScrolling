(async () => {
  const {
    SITE_META,
    SITE_ORDER,
    LIMIT_RANGE,
    clampLimit,
    normalizeState
  } = StopScrollingShared;

  const NAV_META = {
    facebook: {
      navLabel: "FB",
      subtitle: "News Feed, reels va bai viet ngan",
      icon: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="12" fill="#1877F2"></circle>
          <path d="M13.7 19v-6h2l.3-2.3h-2.3V9.2c0-.7.2-1.2 1.2-1.2h1.2V6h-2c-2.4 0-3.4 1.4-3.4 3.1v1.6H9v2.3h1.7v6h3Z" fill="#FFF"></path>
        </svg>
      `
    },
    instagram: {
      navLabel: "Reels",
      subtitle: "Instagram reels, feed va explore",
      icon: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="1" y="1" width="22" height="22" rx="7" fill="#4B7CF6"></rect>
          <path d="M8 6.8h8l-2.1 2.5H6.1L8 6.8Zm8.8 0H19l-2.1 2.5h-2.3l2.2-2.5ZM6 10.6h12v6.6c0 1-.8 1.8-1.8 1.8H7.8c-1 0-1.8-.8-1.8-1.8v-6.6Zm4.3 1.5v5.4l4.5-2.7-4.5-2.7Z" fill="#FFF"></path>
        </svg>
      `
    },
    tiktok: {
      navLabel: "TikTok",
      subtitle: "For You, Following va video ngan",
      icon: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="12" fill="#000"></circle>
          <path d="M14.6 6.2c.4 1.1 1.3 2 2.5 2.3v2.1a5.6 5.6 0 0 1-2.3-.5v3.8a4.1 4.1 0 1 1-4.1-4.1c.2 0 .5 0 .7.1v2.2a2 2 0 1 0 1.3 1.8V5.6h1.9Z" fill="#FFF"></path>
          <path d="M13.7 6.2c.4 1.1 1.3 2 2.5 2.3v1.1c-.7-.1-1.4-.4-2-.8V6.2Z" fill="#25F4EE"></path>
          <path d="M12.7 5.6v8.3a2 2 0 1 1-1.3-1.8V9.9a4.1 4.1 0 1 0 3.4 4V10c.6.4 1.3.7 2 .8V8.5c-1.2-.3-2.1-1.2-2.5-2.3h-1.6Z" fill="#FE2C55" opacity=".78"></path>
        </svg>
      `
    }
  };

  const FUTURE_PLATFORM = {
    label: "Shorts",
    badge: "SOON",
    icon: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8.2 2.4c.8-.5 1.8-.5 2.6 0l7.2 4.1c.8.5 1.3 1.3 1.3 2.3v6.4c0 .9-.5 1.8-1.3 2.3l-7.2 4.1c-.8.5-1.8.5-2.6 0l-2.7-1.5 4.1-2.3 4.7-2.7-4.7-2.7-4.1-2.3 2.7-1.5-4.2-2.4L8.2 2.4Z" fill="#FF2400"></path>
      </svg>
    `
  };

  const siteListElement = document.getElementById("siteList");
  const detailPanelElement = document.getElementById("detailPanel");
  const panelTitleElement = document.getElementById("panelTitle");
  const panelSubtitleElement = document.getElementById("panelSubtitle");
  const activeSummaryElement = document.getElementById("activeSummary");
  const usageCountElement = document.getElementById("usageCount");
  const statusTextElement = document.getElementById("statusText");
  const limitRangeElement = document.getElementById("limitRange");
  const limitNumberElement = document.getElementById("limitNumber");
  const progressFillElement = document.getElementById("progressFill");
  const resetSiteButton = document.getElementById("resetSiteButton");
  const resetAllButton = document.getElementById("resetAllButton");

  let state = null;
  let selectedSite = SITE_ORDER[0];

  function createPlatformRow(siteKey) {
    const site = SITE_META[siteKey];
    const navMeta = NAV_META[siteKey];
    const row = document.createElement("div");
    row.className = "platform-row";
    row.dataset.siteKey = siteKey;
    row.style.setProperty("--row-accent", site.accent);
    row.innerHTML = `
      <button class="platform-select" data-role="select" type="button">
        <span class="platform-icon">${navMeta.icon}</span>
        <span class="platform-name">${navMeta.navLabel}</span>
      </button>

      <label class="switch">
        <input class="toggle-input" data-role="toggle" type="checkbox" aria-label="Bat tat ${site.label}">
        <span class="switch-slider"></span>
      </label>
    `;

    return row;
  }

  function createFutureRow() {
    const row = document.createElement("div");
    row.className = "platform-row is-soon";
    row.innerHTML = `
      <div class="platform-soon">
        <span class="platform-icon">${FUTURE_PLATFORM.icon}</span>
        <span class="platform-name">${FUTURE_PLATFORM.label}</span>
        <span class="soon-badge">${FUTURE_PLATFORM.badge}</span>
      </div>
    `;

    return row;
  }

  function renderStaticSidebar() {
    const fragment = document.createDocumentFragment();

    for (const siteKey of SITE_ORDER) {
      fragment.appendChild(createPlatformRow(siteKey));
    }

    fragment.appendChild(createFutureRow());
    siteListElement.appendChild(fragment);
  }

  function syncLimitInputs(limit) {
    limitRangeElement.value = limit;
    limitNumberElement.value = limit;
  }

  function renderSelectedSite() {
    const site = SITE_META[selectedSite];
    const navMeta = NAV_META[selectedSite];
    const settings = state.siteSettings[selectedSite];
    const usage = state.usage.sites[selectedSite];
    const progressPercent = Math.min(
      100,
      Math.round((usage.count / Math.max(settings.limit, 1)) * 100)
    );

    detailPanelElement.style.setProperty("--site-accent", site.accent);
    panelTitleElement.textContent = site.label;
    panelSubtitleElement.textContent = navMeta.subtitle;
    activeSummaryElement.textContent = settings.enabled
      ? `${usage.count}/${settings.limit} scrolls used today on ${site.label}.`
      : `${site.label} is paused. Toggle it on to continue counting.`;
    usageCountElement.textContent = `${usage.count} / ${settings.limit} scrolls used today`;
    progressFillElement.style.width = `${progressPercent}%`;
    syncLimitInputs(settings.limit);

    limitRangeElement.disabled = !settings.enabled;
    limitNumberElement.disabled = !settings.enabled;
    resetSiteButton.disabled = usage.count === 0;
  }

  function applyState(nextState) {
    state = normalizeState(nextState);
    const totalUsed = SITE_ORDER.reduce(
      (sum, siteKey) => sum + state.usage.sites[siteKey].count,
      0
    );
    const activeSites = SITE_ORDER.filter((siteKey) => state.siteSettings[siteKey].enabled);

    if (!SITE_ORDER.includes(selectedSite)) {
      selectedSite = SITE_ORDER[0];
    }

    statusTextElement.textContent = `Hom nay da dung ${totalUsed} luot scroll tren ${activeSites.length} platform dang bat.`;

    for (const siteKey of SITE_ORDER) {
      const row = siteListElement.querySelector(`[data-site-key="${siteKey}"]`);
      if (!row) {
        continue;
      }

      row.classList.toggle("is-active", siteKey === selectedSite);
      row.querySelector('[data-role="toggle"]').checked = state.siteSettings[siteKey].enabled;
    }

    renderSelectedSite();
  }

  function setSelectedSite(siteKey) {
    if (!SITE_ORDER.includes(siteKey)) {
      return;
    }

    selectedSite = siteKey;
    if (state) {
      applyState(state);
    }
  }

  async function sendRequest(message) {
    const response = await chrome.runtime.sendMessage(message);
    if (!response?.ok || !response.state) {
      throw new Error(response?.error || "Khong the cap nhat trang thai.");
    }

    applyState(response.state);
  }

  async function safeRequest(message) {
    try {
      await sendRequest(message);
    } catch (_error) {
      statusTextElement.textContent =
        "Khong the dong bo trang thai. Thu dong popup hoac tai lai extension.";
    }
  }

  async function loadState() {
    await safeRequest({
      type: "get-state"
    });
  }

  function commitLimit(rawValue) {
    if (!state) {
      return;
    }

    const nextLimit = clampLimit(rawValue, state.siteSettings[selectedSite].limit);
    syncLimitInputs(nextLimit);
    void safeRequest({
      type: "set-site-setting",
      siteKey: selectedSite,
      patch: {
        limit: nextLimit
      }
    });
  }

  siteListElement.addEventListener("click", (event) => {
    const target = event.target;
    const selectButton = target.closest('[data-role="select"]');
    if (!selectButton) {
      return;
    }

    const row = selectButton.closest("[data-site-key]");
    if (!row) {
      return;
    }

    setSelectedSite(row.dataset.siteKey);
  });

  siteListElement.addEventListener("change", (event) => {
    const target = event.target;
    if (!target || target.dataset.role !== "toggle") {
      return;
    }

    const row = target.closest("[data-site-key]");
    if (!row) {
      return;
    }

    const siteKey = row.dataset.siteKey;
    void safeRequest({
      type: "set-site-setting",
      siteKey,
      patch: {
        enabled: target.checked
      }
    });
  });

  limitRangeElement.addEventListener("input", () => {
    limitNumberElement.value = limitRangeElement.value;
  });

  limitRangeElement.addEventListener("change", () => {
    commitLimit(limitRangeElement.value);
  });

  limitNumberElement.addEventListener("change", () => {
    commitLimit(limitNumberElement.value);
  });

  resetSiteButton.addEventListener("click", () => {
    void safeRequest({
      type: "reset-site-usage",
      siteKey: selectedSite
    });
  });

  resetAllButton.addEventListener("click", () => {
    void safeRequest({
      type: "reset-all-usage"
    });
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") {
      return;
    }

    if (!changes.siteSettings && !changes.usage) {
      return;
    }

    if (!state) {
      return;
    }

    applyState({
      siteSettings: changes.siteSettings?.newValue || state.siteSettings,
      usage: changes.usage?.newValue || state.usage
    });
  });

  limitRangeElement.min = LIMIT_RANGE.min;
  limitRangeElement.max = LIMIT_RANGE.max;
  limitNumberElement.min = LIMIT_RANGE.min;
  limitNumberElement.max = LIMIT_RANGE.max;

  renderStaticSidebar();
  await loadState();
})();
