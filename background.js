const browserApi = globalThis.browser ?? globalThis.chrome;

const DEFAULT_SETTINGS = {
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

function hostnameFromUrl(url = "") {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.hostname : "";
  } catch {
    return "";
  }
}

async function readStore() {
  try {
    return await browserApi.storage.sync.get(["globalSettings", "siteSettings"]);
  } catch {
    return await browserApi.storage.local.get(["globalSettings", "siteSettings"]);
  }
}

async function writeStore(values) {
  try {
    await browserApi.storage.sync.set(values);
  } catch {
    await browserApi.storage.local.set(values);
  }
}

async function getActiveTab() {
  const tabs = await browserApi.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

async function toggleSiteSetting(tab, setting) {
  const hostname = hostnameFromUrl(tab?.url);
  if (!hostname) return;
  const store = await readStore();
  const siteSettings = { ...(store.siteSettings ?? {}) };
  const current = { ...DEFAULT_SETTINGS, ...(store.globalSettings ?? {}), ...(siteSettings[hostname] ?? {}) };
  siteSettings[hostname] = { ...(siteSettings[hostname] ?? {}), [setting]: !current[setting] };
  await writeStore({ siteSettings });
}

browserApi.commands?.onCommand?.addListener(async (command) => {
  const tab = await getActiveTab();
  if (command === "toggle-grayscale") await toggleSiteSetting(tab, "grayscale");
  if (command === "toggle-invert") await toggleSiteSetting(tab, "invert");
});

browserApi.runtime?.onInstalled?.addListener(() => {
  void readStore();
});