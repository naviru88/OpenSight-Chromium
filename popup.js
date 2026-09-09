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

let activeTab;
let hostname = "";
let scope = "site";
let store = { globalSettings: {}, siteSettings: {} };
let settings = { ...DEFAULT_SETTINGS };
let toastTimer;

function siteFromUrl(url = "") {
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

function settingsForScope() {
  const globalSettings = store.globalSettings ?? {};
  const siteSettings = store.siteSettings?.[hostname] ?? {};
  return { ...DEFAULT_SETTINGS, ...globalSettings, ...(scope === "site" ? siteSettings : {}) };
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 1800);
}

async function sendToPage() {
  if (!activeTab?.id) return;
  try {
    await browserApi.tabs.sendMessage(activeTab.id, { type: "apply-settings", settings });
  } catch {
    showToast("This browser page cannot be adjusted.");
  }
}

async function persistSetting(key, value) {
  settings[key] = value;
  if (scope === "global") {
    store.globalSettings = { ...(store.globalSettings ?? {}), [key]: value };
    await writeStore({ globalSettings: store.globalSettings });
  } else if (hostname) {
    store.siteSettings = { ...(store.siteSettings ?? {}), [hostname]: { ...(store.siteSettings?.[hostname] ?? {}), [key]: value } };
    await writeStore({ siteSettings: store.siteSettings });
  }
  await sendToPage();
}

function setRangeOutput(key, value) {
  const output = document.getElementById(`${key}-value`);
  if (!output) return;
  if (key === "textScale") output.textContent = `${Math.round(Number(value) * 100)}%`;
  if (key === "lineHeight") output.textContent = `${Number(value).toFixed(1)}×`;
  if (key === "letterSpacing") output.textContent = Number(value) === 0 ? "0" : `${Math.round(Number(value) * 100)}%`;
}

function render() {
  settings = settingsForScope();
  document.querySelectorAll("[data-setting]").forEach((control) => {
    const key = control.dataset.setting;
    if (control.type === "checkbox") {
      control.checked = key === "cursor" ? settings.cursor === control.dataset.booleanValue : Boolean(settings[key]);
    } else {
      control.value = String(settings[key]);
      setRangeOutput(key, settings[key]);
    }
  });
  document.getElementById("pageZoom-value").textContent = `${Math.round(settings.pageZoom * 100)}%`;
  document.querySelectorAll(".scope-button").forEach((button) => button.classList.toggle("active", button.dataset.scope === scope));
}

async function updateControl(event) {
  const control = event.currentTarget;
  const key = control.dataset.setting;
  let value;
  if (control.type === "checkbox") {
    value = key === "cursor" ? (control.checked ? control.dataset.booleanValue : "default") : control.checked;
  } else if (control.type === "range") {
    value = Number(control.value);
    setRangeOutput(key, value);
  } else {
    value = control.value;
  }
  await persistSetting(key, value);
}

async function updateZoom(amount) {
  const next = Math.min(1.6, Math.max(0.8, Math.round((settings.pageZoom + amount) * 10) / 10));
  await persistSetting("pageZoom", next);
  render();
}

async function resetCurrent() {
  if (scope === "global") {
    store.globalSettings = {};
    await writeStore({ globalSettings: {} });
  } else if (hostname) {
    const siteSettings = { ...(store.siteSettings ?? {}) };
    delete siteSettings[hostname];
    store.siteSettings = siteSettings;
    await writeStore({ siteSettings });
  }
  settings = settingsForScope();
  render();
  await sendToPage();
  showToast(scope === "site" ? "Site settings reset" : "Global settings reset");
}

async function init() {
  const tabs = await browserApi.tabs.query({ active: true, currentWindow: true });
  activeTab = tabs[0];
  hostname = siteFromUrl(activeTab?.url);
  document.getElementById("site-host").textContent = hostname || "Browser page";
  store = await readStore();
  settings = settingsForScope();
  render();
}

document.querySelectorAll("[data-setting]").forEach((control) => {
  control.addEventListener("change", updateControl);
  if (control.type === "range") control.addEventListener("input", updateControl);
});
document.querySelectorAll(".scope-button").forEach((button) => {
  button.addEventListener("click", () => {
    scope = button.dataset.scope;
    render();
  });
});
document.querySelectorAll("[data-zoom]").forEach((button) => {
  button.addEventListener("click", () => void updateZoom(Number(button.dataset.zoom)));
});
document.getElementById("reset").addEventListener("click", () => void resetCurrent());
void init();