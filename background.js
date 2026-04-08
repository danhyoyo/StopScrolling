importScripts("shared.js");

const {
  SITE_ORDER,
  clampLimit,
  createDefaultUsage,
  normalizeState
} = StopScrollingShared;

function isValidSite(siteKey) {
  return SITE_ORDER.includes(siteKey);
}

function stateChanged(rawState, normalizedState) {
  return (
    JSON.stringify(rawState.siteSettings || null) !==
      JSON.stringify(normalizedState.siteSettings) ||
    JSON.stringify(rawState.usage || null) !==
      JSON.stringify(normalizedState.usage)
  );
}

async function loadState() {
  const rawState = await chrome.storage.local.get(["siteSettings", "usage"]);
  const normalizedState = normalizeState(rawState);

  if (stateChanged(rawState, normalizedState)) {
    await chrome.storage.local.set(normalizedState);
  }

  return normalizedState;
}

async function updateSiteSetting(siteKey, patch) {
  const currentState = await loadState();
  if (!isValidSite(siteKey)) {
    return currentState;
  }

  const nextState = {
    siteSettings: {
      ...currentState.siteSettings,
      [siteKey]: {
        enabled:
          typeof patch.enabled === "boolean"
            ? patch.enabled
            : currentState.siteSettings[siteKey].enabled,
        limit: clampLimit(
          patch.limit,
          currentState.siteSettings[siteKey].limit
        )
      }
    },
    usage: currentState.usage
  };

  await chrome.storage.local.set({
    siteSettings: nextState.siteSettings
  });

  return nextState;
}

async function resetUsage(siteKey) {
  const currentState = await loadState();
  const nextUsage = {
    ...currentState.usage,
    version: currentState.usage.version + 1,
    sites: {
      ...currentState.usage.sites
    }
  };

  if (siteKey && isValidSite(siteKey)) {
    nextUsage.sites[siteKey] = {
      count: 0
    };
  } else {
    const clearedUsage = createDefaultUsage(
      currentState.usage.date,
      nextUsage.version
    );
    nextUsage.sites = clearedUsage.sites;
  }

  await chrome.storage.local.set({
    usage: nextUsage
  });

  return {
    siteSettings: currentState.siteSettings,
    usage: nextUsage
  };
}

async function updateUsageCount(siteKey, count, version) {
  const currentState = await loadState();
  if (!isValidSite(siteKey)) {
    return currentState;
  }

  if (currentState.usage.version !== version) {
    return currentState;
  }

  const nextCount = Number.isFinite(count) && count >= 0 ? Math.trunc(count) : 0;
  if (currentState.usage.sites[siteKey].count === nextCount) {
    return currentState;
  }

  const nextUsage = {
    ...currentState.usage,
    sites: {
      ...currentState.usage.sites,
      [siteKey]: {
        count: nextCount
      }
    }
  };

  await chrome.storage.local.set({
    usage: nextUsage
  });

  return {
    siteSettings: currentState.siteSettings,
    usage: nextUsage
  };
}

chrome.runtime.onInstalled.addListener(() => {
  void loadState();
});

chrome.runtime.onStartup.addListener(() => {
  void loadState();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const request = message || {};

  void (async () => {
    switch (request.type) {
      case "get-state": {
        sendResponse({
          ok: true,
          state: await loadState()
        });
        return;
      }

      case "set-site-setting": {
        sendResponse({
          ok: true,
          state: await updateSiteSetting(request.siteKey, request.patch || {})
        });
        return;
      }

      case "reset-site-usage": {
        sendResponse({
          ok: true,
          state: await resetUsage(request.siteKey)
        });
        return;
      }

      case "reset-all-usage": {
        sendResponse({
          ok: true,
          state: await resetUsage(null)
        });
        return;
      }

      case "update-usage-count": {
        sendResponse({
          ok: true,
          state: await updateUsageCount(
            request.siteKey,
            request.count,
            request.version
          )
        });
        return;
      }

      default: {
        sendResponse({
          ok: false,
          error: "Unknown request type."
        });
      }
    }
  })().catch((error) => {
    sendResponse({
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    });
  });

  return true;
});
