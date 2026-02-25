/* WorkTime Converter - app.js (PWA friendly for GitHub Pages) */

const STORAGE_KEY = "worktime_settings_v2";

const i18n = {
  it: {
    tagline: "Converti prezzi in ore di lavoro",
    hourlyWageLabel: "Paga oraria",
    hourlyWageHint: "Inserisci quanto guadagni per ogni ora di lavoro.",
    converterTitle: "Convertitore",
    priceLabel: "Prezzo",
    clear: "Pulisci",
    copy: "Copia",
    note: "Nota: il calcolo è “prezzo ÷ paga oraria”.",
    settingsTitle: "Impostazioni",
    themeLabel: "Tema",
    themeSystem: "Sistema",
    themeLight: "Chiaro",
    themeDark: "Scuro",
    languageLabel: "Lingua",
    currencyLabel: "Valuta",
    currencyHint: "Serve solo per mostrare il simbolo.",
    save: "Salva",
    resultEmpty: "Inserisci paga e prezzo",
    resultInvalid: "Valori non validi",
    resultMain: (h, m) => `${h}h ${m}m`,
    resultSub: (hoursDec) => `≈ ${formatNumber(hoursDec, 2)} ore`,
    copied: "Copiato!"
  },
  en: {
    tagline: "Convert prices into work hours",
    hourlyWageLabel: "Hourly wage",
    hourlyWageHint: "Enter how much you earn per hour.",
    converterTitle: "Converter",
    priceLabel: "Price",
    clear: "Clear",
    copy: "Copy",
    note: "Note: calculation is “price ÷ hourly wage”.",
    settingsTitle: "Settings",
    themeLabel: "Theme",
    themeSystem: "System",
    themeLight: "Light",
    themeDark: "Dark",
    languageLabel: "Language",
    currencyLabel: "Currency",
    currencyHint: "Only used to display the symbol.",
    save: "Save",
    resultEmpty: "Enter wage and price",
    resultInvalid: "Invalid values",
    resultMain: (h, m) => `${h}h ${m}m`,
    resultSub: (hoursDec) => `≈ ${formatNumber(hoursDec, 2)} hours`,
    copied: "Copied!"
  }
};

const currencySymbols = { EUR: "€", USD: "$", GBP: "£" };

function getDefaultSettings() {
  return { wage: "", theme: "system", lang: "it", currency: "EUR" };
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...getDefaultSettings(), ...JSON.parse(raw) } : getDefaultSettings();
  } catch {
    return getDefaultSettings();
  }
}

function saveSettings(s) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

function setThemeColor(color) {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", color);
}

function syncThemeColorWithSystem() {
  const prefersDark =
    window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  setThemeColor(prefersDark ? "#0b1220" : "#ffffff");
}

function setTheme(theme) {
  const root = document.documentElement;
  if (theme === "system") {
    root.removeAttribute("data-theme");
    syncThemeColorWithSystem();
    return;
  }
  root.setAttribute("data-theme", theme);
  setThemeColor(theme === "dark" ? "#0b1220" : "#ffffff");
}

function applyLanguage(lang) {
  document.documentElement.lang = lang;
  const dict = i18n[lang] || i18n.it;

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (dict[key]) el.textContent = dict[key];
  });

  const wageInput = document.getElementById("wageInput");
  const priceInput = document.getElementById("priceInput");
  if (wageInput) wageInput.placeholder = (lang === "en") ? "e.g. 12.50" : "es. 12,50";
  if (priceInput) priceInput.placeholder = (lang === "en") ? "e.g. 79.99" : "es. 79,99";
}

function formatNumber(n, decimals = 2) {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

// Accept both "12,50" and "12.50"
function parseFlexibleNumber(str) {
  if (typeof str !== "string") return NaN;
  let s = str.trim().replace(/\s/g, "");
  if (!s) return NaN;

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");

  if (hasComma && !hasDot) {
    s = s.replace(",", ".");
  } else if (hasComma && hasDot) {
    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");
    const decSep = lastComma > lastDot ? "," : ".";
    const thouSep = decSep === "," ? "." : ",";
    s = s.split(thouSep).join("");
    if (decSep === ",") s = s.replace(",", ".");
  }

  const v = Number(s);
  return v;
}

function hoursToHM(hoursDec) {
  const totalMinutes = Math.round(hoursDec * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return { h, m };
}

function updateCurrencyUI(currency) {
  const sym = currencySymbols[currency] || "€";
  const currencyPrefix = document.getElementById("currencyPrefix");
  const currencySuffix = document.getElementById("currencySuffix");
  if (currencyPrefix) currencyPrefix.textContent = sym;
  if (currencySuffix) currencySuffix.textContent = `${sym}/h`;
}

function computeAndRender(settings) {
  const wageInput = document.getElementById("wageInput");
  const priceInput = document.getElementById("priceInput");
  const resultMain = document.getElementById("resultMain");
  const resultSub = document.getElementById("resultSub");

  const dict = i18n[settings.lang] || i18n.it;

  const wageRaw = wageInput.value.trim();
  const priceRaw = priceInput.value.trim();

  if (!wageRaw || !priceRaw) {
    resultMain.textContent = "—";
    resultSub.textContent = dict.resultEmpty;
    return;
  }

  const wage = parseFlexibleNumber(wageRaw);
  const price = parseFlexibleNumber(priceRaw);

  if (!Number.isFinite(wage) || !Number.isFinite(price) || wage <= 0 || price < 0) {
    resultMain.textContent = "—";
    resultSub.textContent = dict.resultInvalid;
    return;
  }

  const hoursDec = price / wage;
  const { h, m } = hoursToHM(hoursDec);

  resultMain.textContent = dict.resultMain(h, m);
  resultSub.textContent = dict.resultSub(hoursDec);
}

function openModal() {
  document.getElementById("settingsBackdrop").hidden = false;
  document.getElementById("settingsModal").hidden = false;
}
function closeModal() {
  document.getElementById("settingsBackdrop").hidden = true;
  document.getElementById("settingsModal").hidden = true;
}

/**
 * PWA installability checks + SW registration (GitHub Pages friendly)
 * - scope forced to "./"
 * - logs any missing requirement (manifest unreachable, SW not controlling, etc.)
 */
async function setupServiceWorkerAndDiagnostics() {
  // Basic diagnostics to help you in DevTools console
  const log = (...args) => console.log("[WorkTime PWA]", ...args);
  const warn = (...args) => console.warn("[WorkTime PWA]", ...args);

  // 1) Check manifest reachable
  try {
    const res = await fetch("./manifest.webmanifest", { cache: "no-store" });
    if (!res.ok) warn("Manifest non raggiungibile:", res.status, res.statusText);
    else log("Manifest OK");
  } catch (e) {
    warn("Manifest fetch error:", e);
  }

  // 2) Register SW with explicit scope
  if ("serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.register("./service-worker.js", { scope: "./" });
      log("Service Worker registrato. Scope:", reg.scope);

      // Wait for control
      if (!navigator.serviceWorker.controller) {
        log("SW non controlla ancora la pagina (normale al primo load). Ricarica una volta.");
      } else {
        log("SW sta controllando la pagina ✅");
      }

      // Optional: update check
      reg.update().catch(() => {});
    } catch (e) {
      warn("Service Worker registration error:", e);
    }
  } else {
    warn("Service Worker non supportato dal browser");
  }

  // 3) Install prompt diagnostics
  window.addEventListener("beforeinstallprompt", (e) => {
    log("beforeinstallprompt ricevuto ✅ (installazione disponibile)");
    // We don't call e.preventDefault() to not block Chrome's default behavior
  });

  window.addEventListener("appinstalled", () => {
    log("App installata ✅");
  });

  // 4) Quick checks for secure context / display mode
  const isSecure = window.isSecureContext;
  if (!isSecure) warn("Non sei in un contesto sicuro (HTTPS). Senza HTTPS niente installazione.");

  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
  log("Display-mode standalone:", isStandalone);

  // Note: On some Android builds, if criteria fail, Chrome shows only "Create shortcut".
}

(function init() {
  let settings = loadSettings();

  const wageInput = document.getElementById("wageInput");
  const priceInput = document.getElementById("priceInput");

  const openSettingsBtn = document.getElementById("openSettings");
  const closeSettingsBtn = document.getElementById("closeSettings");
  const backdrop = document.getElementById("settingsBackdrop");

  const themeSelect = document.getElementById("themeSelect");
  const langSelect = document.getElementById("langSelect");
  const currencySelect = document.getElementById("currencySelect");
  const saveSettingsBtn = document.getElementById("saveSettings");

  const clearBtn = document.getElementById("clearBtn");
  const copyBtn = document.getElementById("copyBtn");

  // Apply saved
  wageInput.value = settings.wage || "";
  themeSelect.value = settings.theme || "system";
  langSelect.value = settings.lang || "it";
  currencySelect.value = settings.currency || "EUR";

  setTheme(themeSelect.value);
  applyLanguage(langSelect.value);
  updateCurrencyUI(currencySelect.value);

  // system theme listener
  const mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  if (mq) {
    mq.addEventListener("change", () => {
      if ((settings.theme || "system") === "system") syncThemeColorWithSystem();
    });
  }

  wageInput.addEventListener("input", () => {
    settings.wage = wageInput.value;
    saveSettings(settings);
    computeAndRender(settings);
  });

  priceInput.addEventListener("input", () => computeAndRender(settings));

  openSettingsBtn.addEventListener("click", openModal);
  closeSettingsBtn.addEventListener("click", closeModal);
  backdrop.addEventListener("click", closeModal);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  saveSettingsBtn.addEventListener("click", () => {
    settings.theme = themeSelect.value;
    settings.lang = langSelect.value;
    settings.currency = currencySelect.value;
    saveSettings(settings);

    setTheme(settings.theme);
    applyLanguage(settings.lang);
    updateCurrencyUI(settings.currency);

    computeAndRender(settings);
    closeModal();
  });

  clearBtn.addEventListener("click", () => {
    priceInput.value = "";
    computeAndRender(settings);
    priceInput.focus();
  });

  copyBtn.addEventListener("click", async () => {
    const dict = i18n[settings.lang] || i18n.it;
    const text =
      `${document.getElementById("resultMain").textContent} (${document.getElementById("resultSub").textContent})`;
    try {
      await navigator.clipboard.writeText(text);
      const old = copyBtn.textContent;
      copyBtn.textContent = dict.copied;
      setTimeout(() => (copyBtn.textContent = old), 900);
    } catch {}
  });

  computeAndRender(settings);

  // Run SW + diagnostics AFTER load (safer on some devices)
  window.addEventListener("load", () => {
    setupServiceWorkerAndDiagnostics();
  });
})();
