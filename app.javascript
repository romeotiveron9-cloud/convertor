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
    install: "Installa",
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
    install: "Install",
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
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  setThemeColor(prefersDark ? "#0b1220" : "#ffffff");
}

function setTheme(theme) {
  const root = document.documentElement;
  if (theme === "system") {
    root.removeAttribute("data-theme");
    syncThemeColorWithSystem();
  } else {
    root.setAttribute("data-theme", theme);
    setThemeColor(theme === "dark" ? "#0b1220" : "#ffffff");
  }
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
  wageInput.placeholder = (lang === "en") ? "e.g. 12.50" : "es. 12,50";
  priceInput.placeholder = (lang === "en") ? "e.g. 79.99" : "es. 79,99";
}

function formatNumber(n, decimals = 2) {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function parseFlexibleNumber(str) {
  if (typeof str !== "string") return NaN;
  const cleaned = str.trim().replace(/\s/g, "");
  if (!cleaned) return NaN;

  let normalized = cleaned;
  const hasComma = normalized.includes(",");
  const hasDot = normalized.includes(".");

  if (hasComma && !hasDot) {
    normalized = normalized.replace(",", ".");
  } else if (hasComma && hasDot) {
    const lastComma = normalized.lastIndexOf(",");
    const lastDot = normalized.lastIndexOf(".");
    const decSep = lastComma > lastDot ? "," : ".";
    const thouSep = decSep === "," ? "." : ",";
    normalized = normalized.split(thouSep).join("");
    if (decSep === ",") normalized = normalized.replace(",", ".");
  }

  return Number(normalized);
}

function hoursToHM(hoursDec) {
  const totalMinutes = Math.round(hoursDec * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return { h, m };
}

function updateCurrencyUI(currency) {
  const sym = currencySymbols[currency] || "€";
  document.getElementById("priceSuffix").textContent = sym;
  document.getElementById("wageSuffix").textContent = `${sym}/h`;
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

/* ---------- Modal ---------- */
function openModal() {
  document.getElementById("settingsBackdrop").hidden = false;
  document.getElementById("settingsModal").hidden = false;
}
function closeModal() {
  document.getElementById("settingsBackdrop").hidden = true;
  document.getElementById("settingsModal").hidden = true;
}

/* ---------- Service Worker ---------- */
function setupServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register("./service-worker.js");
    } catch {}
  });
}

/* ---------- Install Prompt (Android/Chromium) ---------- */
function setupInstallButton() {
  const installBtn = document.getElementById("installBtn");
  let deferredPrompt = null;

  window.addEventListener("beforeinstallprompt", (e) => {
    // Chrome: intercettiamo e mostriamo bottone custom
    e.preventDefault();
    deferredPrompt = e;
    installBtn.hidden = false;
  });

  installBtn.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try {
      await deferredPrompt.userChoice;
    } finally {
      deferredPrompt = null;
      installBtn.hidden = true;
    }
  });

  // Se già installata (o su iOS), nascondi il bottone
  window.addEventListener("appinstalled", () => {
    installBtn.hidden = true;
    deferredPrompt = null;
  });
}

/* ---------- Init ---------- */
(function init() {
  const settings = loadSettings();

  const wageInput = document.getElementById("wageInput");
  const priceInput = document.getElementById("priceInput");

  const themeSelect = document.getElementById("themeSelect");
  const langSelect = document.getElementById("langSelect");
  const currencySelect = document.getElementById("currencySelect");

  // Apply saved settings
  wageInput.value = settings.wage || "";
  themeSelect.value = settings.theme || "system";
  langSelect.value = settings.lang || "it";
  currencySelect.value = settings.currency || "EUR";

  setTheme(settings.theme);
  applyLanguage(settings.lang);
  updateCurrencyUI(settings.currency);

  // Keep system theme meta updated
  const mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  if (mq) {
    mq.addEventListener("change", () => {
      if ((settings.theme || "system") === "system") syncThemeColorWithSystem();
    });
  }

  // Input handlers
  wageInput.addEventListener("input", () => {
    settings.wage = wageInput.value;
    saveSettings(settings);
    computeAndRender(settings);
  });

  priceInput.addEventListener("input", () => computeAndRender(settings));

  // Buttons
  document.getElementById("clearBtn").addEventListener("click", () => {
    priceInput.value = "";
    computeAndRender(settings);
    priceInput.focus();
  });

  document.getElementById("copyBtn").addEventListener("click", async () => {
    const dict = i18n[settings.lang] || i18n.it;
    const text = `${document.getElementById("resultMain").textContent} (${document.getElementById("resultSub").textContent})`;
    try {
      await navigator.clipboard.writeText(text);
      const btn = document.getElementById("copyBtn");
      const old = btn.textContent;
      btn.textContent = dict.copied;
      setTimeout(() => (btn.textContent = old), 900);
    } catch {}
  });

  // Modal handlers
  document.getElementById("openSettings").addEventListener("click", openModal);
  document.getElementById("closeSettings").addEventListener("click", closeModal);
  document.getElementById("settingsBackdrop").addEventListener("click", closeModal);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

  document.getElementById("saveSettings").addEventListener("click", () => {
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

  // First render
  computeAndRender(settings);

  // PWA bits
  setupServiceWorker();
  setupInstallButton();
})();
