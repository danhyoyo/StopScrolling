(async () => {
  const { SITE_META, normalizeState, getTodayKey, detectSiteFromHostname } =
    StopScrollingShared;

  const siteKey = detectSiteFromHostname(window.location.hostname);
  if (!siteKey) {
    return;
  }

  let state = null;
  let toastTimeoutId = null;
  let scrollLocked = false;
  let lockedScrollY = 0;

  function getSiteState() {
    if (!state) {
      return null;
    }

    return {
      settings: state.siteSettings[siteKey],
      usage: state.usage.sites[siteKey]
    };
  }

  function applyState(nextState) {
    state = normalizeState(nextState);
    renderFloatingCounter();
    syncScrollLock();
  }

  function ensureFloatingCounter() {
    let counter = document.getElementById("stop-scrolling-counter");
    if (counter) {
      return counter;
    }

    counter = document.createElement("div");
    counter.id = "stop-scrolling-counter";
    counter.style.position = "fixed";
    counter.style.right = "74px";
    counter.style.bottom = "16px";
    counter.style.zIndex = "2147483646";
    counter.style.maxWidth = "320px";
    counter.style.padding = "12px 16px";
    counter.style.borderRadius = "16px";
    counter.style.fontFamily =
      "\"Segoe UI Variable\", \"Segoe UI\", sans-serif";
    counter.style.fontSize = "14px";
    counter.style.fontWeight = "700";
    counter.style.lineHeight = "1.4";
    counter.style.color = "#ffffff";
    counter.style.boxShadow = "0 12px 30px rgba(0, 0, 0, 0.26)";
    counter.style.transition =
      "opacity 140ms ease, transform 140ms ease, background 140ms ease";
    counter.style.opacity = "0";
    counter.style.transform = "translateY(8px)";
    counter.style.pointerEvents = "none";
    document.documentElement.appendChild(counter);
    return counter;
  }

  function renderFloatingCounter() {
    const counter = ensureFloatingCounter();
    const siteState = getSiteState();

    if (!siteState) {
      counter.style.opacity = "0";
      counter.style.transform = "translateY(8px)";
      return;
    }

    const { settings, usage } = siteState;
    const remaining = Math.max(settings.limit - usage.count, 0);
    const scrollLabel = remaining === 1 ? "scroll" : "scrolls";

    if (!settings.enabled) {
      counter.textContent = `Stop Scrolling is paused on ${SITE_META[siteKey].label}.`;
      counter.style.background = "rgba(62, 62, 77, 0.94)";
    } else if (remaining === 0) {
      counter.textContent = `0 scrolls remaining on ${SITE_META[siteKey].label}.`;
      counter.style.background = "rgba(23, 23, 23, 0.94)";
    } else if (remaining <= 3) {
      counter.textContent = `${remaining} ${scrollLabel} remaining on ${SITE_META[siteKey].label}.`;
      counter.style.background = "rgba(190, 88, 24, 0.96)";
    } else {
      counter.textContent = `${remaining} ${scrollLabel} remaining on ${SITE_META[siteKey].label}.`;
      counter.style.background = "rgba(36, 87, 242, 0.94)";
    }

    counter.style.opacity = "1";
    counter.style.transform = "translateY(0)";
  }

  function showToast(message, tone = "info") {
    let toast = document.getElementById("stop-scrolling-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "stop-scrolling-toast";
      toast.style.position = "fixed";
      toast.style.right = "16px";
      toast.style.bottom = "76px";
      toast.style.zIndex = "2147483647";
      toast.style.maxWidth = "320px";
      toast.style.padding = "12px 14px";
      toast.style.borderRadius = "14px";
      toast.style.fontFamily =
        "\"Segoe UI Variable\", \"Segoe UI\", sans-serif";
      toast.style.fontSize = "13px";
      toast.style.lineHeight = "1.4";
      toast.style.color = "#ffffff";
      toast.style.boxShadow = "0 10px 30px rgba(0, 0, 0, 0.24)";
      toast.style.transition = "opacity 140ms ease, transform 140ms ease";
      toast.style.opacity = "0";
      toast.style.transform = "translateY(8px)";
      document.documentElement.appendChild(toast);
    }

    toast.textContent = message;
    toast.style.background =
      tone === "danger" ? "rgba(23, 23, 23, 0.92)" : "rgba(36, 87, 242, 0.92)";
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";

    if (toastTimeoutId) {
      clearTimeout(toastTimeoutId);
    }

    toastTimeoutId = window.setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(8px)";
    }, 2200);
  }

  async function requestState() {
    const response = await chrome.runtime.sendMessage({
      type: "get-state"
    });

    if (response?.ok && response.state) {
      applyState(response.state);
    }
  }

  async function persistUsage(nextCount, version) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "update-usage-count",
        siteKey,
        count: nextCount,
        version
      });

      if (response?.ok && response.state) {
        applyState(response.state);
      }
    } catch (_error) {
      // Ignore transient messaging errors and keep the current page responsive.
    }
  }

  function blockWheel(event) {
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === "function") {
      event.stopImmediatePropagation();
    }
  }

  function ensureLockStyle() {
    let styleTag = document.getElementById("stop-scrolling-lock-style");
    if (styleTag) {
      return styleTag;
    }

    styleTag = document.createElement("style");
    styleTag.id = "stop-scrolling-lock-style";
    styleTag.textContent = `
      html.stop-scrolling-locked,
      body.stop-scrolling-locked {
        overscroll-behavior: none !important;
        scrollbar-width: none !important;
        -ms-overflow-style: none !important;
      }

      html.stop-scrolling-locked::-webkit-scrollbar,
      body.stop-scrolling-locked::-webkit-scrollbar {
        width: 0 !important;
        height: 0 !important;
      }
    `;
    document.documentElement.appendChild(styleTag);
    return styleTag;
  }

  function lockPageScroll() {
    if (scrollLocked) {
      return;
    }

    lockedScrollY = window.scrollY;
    ensureLockStyle();
    document.documentElement.classList.add("stop-scrolling-locked");
    document.body?.classList.add("stop-scrolling-locked");
    scrollLocked = true;
    window.scrollTo({
      top: lockedScrollY,
      left: window.scrollX,
      behavior: "auto"
    });
  }

  function unlockPageScroll() {
    if (!scrollLocked) {
      return;
    }

    document.documentElement.classList.remove("stop-scrolling-locked");
    document.body?.classList.remove("stop-scrolling-locked");
    scrollLocked = false;
  }

  function syncScrollLock() {
    if (!state) {
      unlockPageScroll();
      return;
    }

    const siteState = getSiteState();
    const shouldLock =
      !!siteState &&
      siteState.settings.enabled &&
      siteState.usage.count >= siteState.settings.limit;

    if (shouldLock) {
      lockPageScroll();
      return;
    }

    unlockPageScroll();
  }

  function handleKeydown(event) {
    if (!scrollLocked) {
      return;
    }

    const blockedKeys = new Set([
      "ArrowDown",
      "ArrowUp",
      "PageDown",
      "PageUp",
      "Home",
      "End",
      " ",
      "Spacebar"
    ]);

    if (!blockedKeys.has(event.key)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
  }

  function handleTouchMove(event) {
    if (!scrollLocked) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
  }

  function handleLockedScroll() {
    if (!scrollLocked) {
      return;
    }

    if (window.scrollY !== lockedScrollY) {
      window.scrollTo({
        top: lockedScrollY,
        left: window.scrollX,
        behavior: "auto"
      });
    }
  }

  function handleWheel(event) {
    if (!state) {
      return;
    }

    if (state.usage.date !== getTodayKey()) {
      void requestState();
      return;
    }

    if (event.ctrlKey) {
      return;
    }

    const siteState = getSiteState();
    if (!siteState || !siteState.settings.enabled) {
      return;
    }

    const { settings, usage } = siteState;
    if (usage.count >= settings.limit) {
      syncScrollLock();
      blockWheel(event);
      showToast(
        `You have reached today's ${settings.limit}-scroll limit on ${SITE_META[siteKey].label}.`,
        "danger"
      );
      return;
    }

    if (event.deltaY <= 0) {
      return;
    }

    const nextCount = usage.count + 1;
    state = {
      ...state,
      usage: {
        ...state.usage,
        sites: {
          ...state.usage.sites,
          [siteKey]: {
            count: nextCount
          }
        }
      }
    };
    renderFloatingCounter();
    syncScrollLock();

    if (settings.limit - nextCount === 0) {
      showToast(
        `You just used your full ${settings.limit}-scroll limit on ${SITE_META[siteKey].label}.`
      );
    }

    void persistUsage(nextCount, state.usage.version);
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") {
      return;
    }

    if (!changes.siteSettings && !changes.usage) {
      return;
    }

    applyState({
      siteSettings: changes.siteSettings?.newValue || state?.siteSettings,
      usage: changes.usage?.newValue || state?.usage
    });
  });

  await requestState();

  document.addEventListener("wheel", handleWheel, {
    capture: true,
    passive: false
  });
  document.addEventListener("keydown", handleKeydown, {
    capture: true
  });
  document.addEventListener("touchmove", handleTouchMove, {
    capture: true,
    passive: false
  });
  window.addEventListener("scroll", handleLockedScroll, {
    capture: true,
    passive: true
  });
})();
