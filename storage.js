export const DEFAULT_SETTINGS = {
  grayscale: false,
  invert: false,
  colorblind: "none",
  contrast: "none",
  theme: "system",
  textScale: 1,
  bold: false,
  font: "default",
  lineHeight: 1.5,
  letterSpacing: 0,
  simplified: false,
  pageZoom: 1,
  reduceMotion: false,
  highlightInteractive: false,
  cursor: "default",
  lens: false,
};

export function getBrowserApi() {
  return globalThis.browser ?? globalThis.chrome;
}

export function getHostname(url = "") {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.hostname;
    }
  } catch {
    // Restricted browser pages do not have a usable site hostname.
  }
  return "";
}

export async function readSettingsStore() {
  const api = getBrowserApi();
  const keys = ["globalSettings", "siteSettings"];
  try {
    return await api.storage.sync.get(keys);
  } catch {
    return await api.storage.local.get(keys);
  }
}

export async function writeSettingsStore(values) {
  const api = getBrowserApi();
  try {
    await api.storage.sync.set(values);
  } catch {
    await api.storage.local.set(values);
  }
}

export function resolveSettings(store, hostname) {
  const globalSettings = store?.globalSettings ?? {};
  const siteSettings = store?.siteSettings?.[hostname] ?? {};
  return { ...DEFAULT_SETTINGS, ...globalSettings, ...siteSettings };
}