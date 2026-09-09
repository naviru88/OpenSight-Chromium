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

const STYLE_ID = "opensight-accessibility-styles";
const FILTER_ID = "opensight-color-filter";
const LENS_ID = "opensight-lens";
const POINTER_ID = "opensight-pointer-ring";
let currentSettings = { ...DEFAULT_SETTINGS };
let lensElement;
let pointerRing;
let lensFrame = 0;

function injectFilterSvg() {
  if (document.getElementById(FILTER_ID)) return;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.id = FILTER_ID;
  svg.setAttribute("aria-hidden", "true");
  svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
  svg.innerHTML = `
    <defs>
      <filter id="protanopia">
        <feColorMatrix type="matrix" values=".567 .433 0 0 0 .558 .442 0 0 0 0  .242 .758 0 0 0 0 0 1 0"/>
      </filter>
      <filter id="deuteranopia">
        <feColorMatrix type="matrix" values=".625 .375 0 0 0 .7 .3 0 0 0 0 .3 .7 0 0 0 0 0 1 0"/>
      </filter>
      <filter id="tritanopia">
        <feColorMatrix type="matrix" values=".95 .05 0 0 0 0 .433 .567 0 0 0 .475 .525 0 0 0 0 0 1 0"/>
      </filter>
    </defs>
  `;
  document.documentElement.appendChild(svg);
}

function ensureStyles() {
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.documentElement.appendChild(style);
  }
  style.textContent = `
    html.os-grayscale { filter: grayscale(1) !important; }
    html.os-invert { filter: invert(1) hue-rotate(180deg) !important; }
    html.os-color-protanopia { filter: url("#protanopia") !important; }
    html.os-color-deuteranopia { filter: url("#deuteranopia") !important; }
    html.os-color-tritanopia { filter: url("#tritanopia") !important; }
    html.os-contrast-dark, html.os-contrast-dark body {
      background: #0d1117 !important;
      color: #f4f7fb !important;
      color-scheme: dark !important;
    }
    html.os-contrast-dark body *:not(img):not(video):not(canvas):not(svg) {
      background-color: #0d1117 !important;
      color: #f4f7fb !important;
      border-color: #9aa6b2 !important;
    }
    html.os-contrast-light, html.os-contrast-light body {
      background: #fffdf6 !important;
      color: #15171a !important;
      color-scheme: light !important;
    }
    html.os-contrast-light body *:not(img):not(video):not(canvas):not(svg) {
      background-color: #fffdf6 !important;
      color: #15171a !important;
      border-color: #383f46 !important;
    }
    html.os-theme-dark { color-scheme: dark !important; }
    html.os-theme-light { color-scheme: light !important; }
    html.os-theme-dark body { background-color: #121820 !important; color: #edf2f7 !important; }
    html.os-theme-light body { background-color: #fffdf8 !important; color: #17191c !important; }
    html.os-font-dyslexia, html.os-font-dyslexia body, html.os-font-dyslexia body * {
      font-family: "Atkinson Hyperlegible", "OpenDyslexic", Verdana, sans-serif !important;
    }
    html.os-bold body, html.os-bold body * { font-weight: 700 !important; }
    html.os-readable body, html.os-readable body * {
      line-height: var(--opensight-line-height) !important;
      letter-spacing: var(--opensight-letter-spacing) !important;
    }
    html.os-simplified body img, html.os-simplified body video,
    html.os-simplified body picture, html.os-simplified body iframe,
    html.os-simplified body canvas, html.os-simplified body svg:not([aria-label]):not([role="img"]),
    html.os-simplified body [role="banner"], html.os-simplified body [role="complementary"],
    html.os-simplified body [role="navigation"], html.os-simplified body [class*="ad-"],
    html.os-simplified body [id*="ad-"], html.os-simplified body [class*="advert"] {
      display: none !important;
    }
    html.os-reduce-motion *, html.os-reduce-motion *::before, html.os-reduce-motion *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      scroll-behavior: auto !important;
      transition-duration: 0.01ms !important;
    }
    html.os-reduce-motion video, html.os-reduce-motion audio {
      animation-play-state: paused !important;
    }
    html.os-highlight body a, html.os-highlight body button,
    html.os-highlight body input, html.os-highlight body select,
    html.os-highlight body textarea, html.os-highlight body [role="button"],
    html.os-highlight body [tabindex] {
      outline: 3px solid #ffb454 !important;
      outline-offset: 3px !important;
      box-shadow: 0 0 0 5px rgba(255,180,84,.28) !important;
    }
    html.os-cursor-large, html.os-cursor-large body,
    html.os-cursor-large body * {
      cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 36 36'%3E%3Cpath d='M7 3l20 18-9 1 6 10-5 3-6-11-6 7z' fill='%23ffffff' stroke='%230f1720' stroke-width='3' stroke-linejoin='round'/%3E%3C/svg%3E") 4 3, auto !important;
    }
    html.os-page-zoom { zoom: var(--opensight-page-zoom); }
    #${POINTER_ID} {
      position: fixed; z-index: 2147483647; width: 26px; height: 26px;
      border: 3px solid #7de2c2; border-radius: 50%; pointer-events: none;
      transform: translate(-50%, -50%); box-shadow: 0 0 0 5px rgba(125,226,194,.24), 0 5px 18px rgba(0,0,0,.32);
      display: none;
    }
    #${LENS_ID} {
      position: fixed; z-index: 2147483646; width: 230px; height: 150px;
      border: 3px solid #7de2c2; border-radius: 16px; overflow: hidden; pointer-events: none;
      background: rgba(20, 29, 38, .96); box-shadow: 0 18px 36px rgba(0,0,0,.32), 0 0 0 5px rgba(125,226,194,.2);
      display: none; color: white; font: 600 14px/1.4 system-ui, sans-serif;
    }
    #${LENS_ID}::after { content: ""; position: absolute; inset: 50% 0 auto; border-top: 1px solid rgba(125,226,194,.45); }
    #${LENS_ID} .opensight-lens-content {
      position: relative; z-index: 1; display: block; width: max-content; max-width: 204px;
      min-height: 100%; transform: scale(1.35); transform-origin: top left; padding: 14px;
      color: #f6fffb !important; background: linear-gradient(145deg, #263b46, #17262f) !important;
      font: 600 14px/1.45 system-ui, sans-serif !important;
      text-shadow: 0 1px 2px rgba(0,0,0,.72);
    }
    #${LENS_ID} .opensight-lens-content * {
      color: #f6fffb !important; opacity: 1 !important; filter: none !important;
      text-shadow: 0 1px 2px rgba(0,0,0,.72);
    }
    #${LENS_ID} .opensight-lens-content img,
    #${LENS_ID} .opensight-lens-content video,
    #${LENS_ID} .opensight-lens-content canvas,
    #${LENS_ID} .opensight-lens-content svg {
      background: transparent !important; filter: none !important;
    }
  `;
}

function applySettings(nextSettings) {
  currentSettings = { ...DEFAULT_SETTINGS, ...nextSettings };
  injectFilterSvg();
  ensureStyles();
  const root = document.documentElement;
  const classNames = [
    "os-grayscale", "os-invert", "os-color-protanopia", "os-color-deuteranopia",
    "os-color-tritanopia", "os-contrast-dark", "os-contrast-light", "os-theme-dark",
    "os-theme-light", "os-font-dyslexia", "os-bold", "os-readable", "os-simplified",
    "os-reduce-motion", "os-highlight", "os-cursor-large", "os-page-zoom",
  ];
  root.classList.remove(...classNames);
  if (currentSettings.grayscale) root.classList.add("os-grayscale");
  if (currentSettings.invert) root.classList.add("os-invert");
  if (currentSettings.colorblind !== "none") root.classList.add(`os-color-${currentSettings.colorblind}`);
  if (currentSettings.contrast !== "none") root.classList.add(`os-contrast-${currentSettings.contrast}`);
  if (currentSettings.theme !== "system") root.classList.add(`os-theme-${currentSettings.theme}`);
  if (currentSettings.font === "dyslexia") root.classList.add("os-font-dyslexia");
  if (currentSettings.bold) root.classList.add("os-bold");
  if (currentSettings.lineHeight !== 1.5 || currentSettings.letterSpacing !== 0) root.classList.add("os-readable");
  if (currentSettings.simplified) root.classList.add("os-simplified");
  if (currentSettings.reduceMotion) root.classList.add("os-reduce-motion");
  if (currentSettings.highlightInteractive) root.classList.add("os-highlight");
  if (currentSettings.cursor === "large") root.classList.add("os-cursor-large");
  if (currentSettings.pageZoom !== 1) {
    root.classList.add("os-page-zoom");
    root.style.setProperty("--opensight-page-zoom", String(currentSettings.pageZoom));
  } else {
    root.style.removeProperty("--opensight-page-zoom");
  }
  root.style.setProperty("--opensight-text-scale", String(currentSettings.textScale));
  root.style.setProperty("--opensight-line-height", String(currentSettings.lineHeight));
  root.style.setProperty("--opensight-letter-spacing", `${currentSettings.letterSpacing}em`);
  if (currentSettings.textScale !== 1) {
    root.style.setProperty("font-size", `${currentSettings.textScale * 100}%`);
  } else {
    root.style.removeProperty("font-size");
  }
  if (currentSettings.lens) enableLens();
  else disableLens();
  if (currentSettings.cursor === "large") enablePointerRing();
  else disablePointerRing();
}

function enablePointerRing() {
  if (!pointerRing) {
    pointerRing = document.createElement("div");
    pointerRing.id = POINTER_ID;
    document.documentElement.appendChild(pointerRing);
    document.addEventListener("pointermove", updatePointerRing, { passive: true });
  }
  pointerRing.style.display = "block";
}

function disablePointerRing() {
  if (pointerRing) pointerRing.style.display = "none";
}

function updatePointerRing(event) {
  if (pointerRing) {
    pointerRing.style.left = `${event.clientX}px`;
    pointerRing.style.top = `${event.clientY}px`;
  }
  if (lensElement && currentSettings.lens) updateLens(event);
}

function enableLens() {
  if (!lensElement) {
    lensElement = document.createElement("div");
    lensElement.id = LENS_ID;
    lensElement.innerHTML = '<div class="opensight-lens-content">Move over text or controls to magnify.</div>';
    document.documentElement.appendChild(lensElement);
    document.addEventListener("pointermove", updateLens, { passive: true });
  }
  lensElement.style.display = "block";
}

function disableLens() {
  if (lensElement) lensElement.style.display = "none";
}

function updateLens(event) {
  if (!lensElement) return;
  lensElement.style.left = `${Math.min(event.clientX + 24, window.innerWidth - 250)}px`;
  lensElement.style.top = `${Math.min(event.clientY + 24, window.innerHeight - 170)}px`;
  if (lensFrame) cancelAnimationFrame(lensFrame);
  lensFrame = requestAnimationFrame(() => {
    const target = document.elementFromPoint(event.clientX, event.clientY);
    if (!target || target === lensElement || target.id === POINTER_ID) return;
    const content = lensElement.querySelector(".opensight-lens-content");
    if (!content) return;
    const clone = target.cloneNode(true);
    clone.removeAttribute("id");
    clone.querySelectorAll?.("[id]").forEach((node) => node.removeAttribute("id"));
    const computed = getComputedStyle(target);
    clone.classList.add("opensight-lens-clone");
    clone.style.cssText = `
      display:block;
      width:${Math.min(target.getBoundingClientRect().width, 204)}px;
      min-height:${Math.max(target.getBoundingClientRect().height, 22)}px;
      color:#f6fffb !important;
      background:transparent !important;
      font-family:${computed.fontFamily};
      font-size:${computed.fontSize};
      line-height:${computed.lineHeight};
    `;
    clone.querySelectorAll?.("*").forEach((node) => {
      const tagName = node.tagName?.toLowerCase();
      if (!["img", "video", "canvas", "svg"].includes(tagName)) {
        node.style.setProperty("color", "#f6fffb", "important");
        node.style.setProperty("background-color", "transparent", "important");
        node.style.setProperty("opacity", "1", "important");
        node.style.setProperty("filter", "none", "important");
      }
    });
    content.replaceChildren(clone);
  });
}

async function loadSettings() {
  const keys = ["globalSettings", "siteSettings"];
  let store;
  try {
    store = await browserApi.storage.sync.get(keys);
  } catch {
    store = await browserApi.storage.local.get(keys);
  }
  const hostname = window.location.hostname;
  applySettings({ ...DEFAULT_SETTINGS, ...(store.globalSettings ?? {}), ...(store.siteSettings?.[hostname] ?? {}) });
}

browserApi.runtime?.onMessage?.addListener((message) => {
  if (message?.type === "apply-settings") applySettings(message.settings);
});

browserApi.storage?.onChanged?.addListener((changes) => {
  if (changes.globalSettings || changes.siteSettings) void loadSettings();
});

if (document.documentElement) {
  void loadSettings();
} else {
  document.addEventListener("DOMContentLoaded", () => void loadSettings(), { once: true });
}