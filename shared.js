const StopScrollingShared = (() => {
  const SITE_ORDER = ["facebook", "instagram", "tiktok"];

  const SITE_META = {
    facebook: {
      label: "Facebook",
      domain: "facebook.com",
      accent: "#1877f2",
      description: "News Feed, Reels va bai viet ngan"
    },
    instagram: {
      label: "Instagram",
      domain: "instagram.com",
      accent: "#ff5c8a",
      description: "Feed, Reels va Explore"
    },
    tiktok: {
      label: "TikTok",
      domain: "tiktok.com",
      accent: "#111111",
      description: "For You, Following va video ngan"
    }
  };

  const LIMIT_RANGE = {
    min: 1,
    max: 500
  };

  const DEFAULT_SITE_SETTINGS = {
    facebook: {
      enabled: true,
      limit: 200
    },
    instagram: {
      enabled: true,
      limit: 200
    },
    tiktok: {
      enabled: true,
      limit: 30
    }
  };

  function getTodayKey() {
    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function clampLimit(value, fallback) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return fallback;
    }

    return Math.min(
      LIMIT_RANGE.max,
      Math.max(LIMIT_RANGE.min, Math.round(numericValue))
    );
  }

  function createDefaultSiteSettings() {
    const settings = {};

    for (const siteKey of SITE_ORDER) {
      settings[siteKey] = {
        enabled: DEFAULT_SITE_SETTINGS[siteKey].enabled,
        limit: DEFAULT_SITE_SETTINGS[siteKey].limit
      };
    }

    return settings;
  }

  function createDefaultUsage(today = getTodayKey(), version = 1) {
    const usage = {
      date: today,
      version,
      sites: {}
    };

    for (const siteKey of SITE_ORDER) {
      usage.sites[siteKey] = {
        count: 0
      };
    }

    return usage;
  }

  function normalizeState(rawState = {}) {
    const normalizedSettings = createDefaultSiteSettings();
    const today = getTodayKey();
    const currentSettings = rawState.siteSettings || {};

    for (const siteKey of SITE_ORDER) {
      const incoming = currentSettings[siteKey] || {};
      normalizedSettings[siteKey] = {
        enabled:
          typeof incoming.enabled === "boolean"
            ? incoming.enabled
            : DEFAULT_SITE_SETTINGS[siteKey].enabled,
        limit: clampLimit(incoming.limit, DEFAULT_SITE_SETTINGS[siteKey].limit)
      };
    }

    const currentUsage = rawState.usage || {};
    const storedVersion =
      typeof currentUsage.version === "number" && currentUsage.version > 0
        ? Math.trunc(currentUsage.version)
        : 1;
    const isNewDay = currentUsage.date !== today;
    const normalizedUsage = createDefaultUsage(
      today,
      isNewDay ? storedVersion + 1 : storedVersion
    );

    for (const siteKey of SITE_ORDER) {
      const incomingCount = currentUsage.sites?.[siteKey]?.count;
      normalizedUsage.sites[siteKey].count =
        !isNewDay && Number.isFinite(incomingCount) && incomingCount >= 0
          ? Math.trunc(incomingCount)
          : 0;
    }

    return {
      siteSettings: normalizedSettings,
      usage: normalizedUsage
    };
  }

  function detectSiteFromHostname(hostname) {
    const normalizedHost = String(hostname || "").toLowerCase();

    if (!normalizedHost) {
      return null;
    }

    for (const siteKey of SITE_ORDER) {
      const domain = SITE_META[siteKey].domain;
      if (normalizedHost === domain || normalizedHost.endsWith(`.${domain}`)) {
        return siteKey;
      }
    }

    return null;
  }

  return {
    DEFAULT_SITE_SETTINGS,
    LIMIT_RANGE,
    SITE_META,
    SITE_ORDER,
    clampLimit,
    createDefaultSiteSettings,
    createDefaultUsage,
    detectSiteFromHostname,
    getTodayKey,
    normalizeState
  };
})();
