const STORAGE = "worktime_min_pwa_v1";
const RATES_STORAGE = "worktime_rates_cache_v1";
const RATES_TTL_MS = 1000 * 60 * 60 * 12; // 12h

const i18n = {
  it: {
    tagline: "Prezzo → tempo di lavoro",
    install: "Installa",
    wageLabel: "Paga oraria",
    wageHint: "Quanto guadagni per 1 ora.",
    costLabel: "Costo",
    costHint: "Quanto costa l’oggetto.",
    clear: "Pulisci",
    copy: "Copia",
    settings: "Impostazioni",
    theme: "Tema",
    system: "Sistema",
    light: "Chiaro",
    dark: "Scuro",
    language: "Lingua",
    save: "Salva",
    copied: "Copiato!",
    needValues: "Inserisci paga e costo",
    invalid: "Valori non validi",
    calcMoney: (cost, cur) => `Costo convertito: ${cost} ${cur}`,
    calcRate: (from, to, r, source) => `Cambio: 1 ${from} = ${r} ${to} (${source})`,
    manualRateTitle: "Tasso di cambio (manuale)",
    tryLive: "Prova live",
    manualRateLabel: (from, to) => `1 ${from} = ? ${to}`
  },
  en: {
    tagline: "Price → work time",
    install: "Install",
    wageLabel: "Hourly wage",
    wageHint: "How much you earn per hour.",
    costLabel: "Cost",
    costHint: "How much the item costs.",
    clear: "Clear",
    copy: "Copy",
    settings: "Settings",
    theme: "Theme",
    system: "System",
    light: "Light",
    dark: "Dark",
    language: "Language",
    save: "Save",
    copied: "Copied!",
    needValues: "Enter wage and cost",
    invalid: "Invalid values",
    calcMoney: (cost, cur) => `Converted cost: ${cost} ${cur}`,
    calcRate: (from, to, r, source) => `FX: 1 ${from} = ${r} ${to} (${source})`,
    manualRateTitle: "Exchange rate (manual)",
    tryLive: "Try live",
    manualRateLabel: (from, to) => `1 ${from} = ? ${to}`
  }
};

const $ = (id) => document.getElementById(id);

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE);
    return raw ? JSON.parse(raw) : { theme:"system", lang:"it", wageCur:"EUR", costCur:"EUR", wage:"", cost:"" };
  }catch{
    return { theme:"system", lang:"it", wageCur:"EUR", costCur:"EUR", wage:"", cost:"" };
  }
}
function saveState(s){ localStorage.setItem(STORAGE, JSON.stringify(s)); }

function setTheme(theme){
  const root = document.documentElement;
  if(theme === "system"){
    root.removeAttribute("data-theme");
    syncThemeColorWithSystem();
  }else{
    root.setAttribute("data-theme", theme);
    setThemeColor(theme === "dark" ? "#0b0f18" : "#ffffff");
  }
}
function setThemeColor(c){
  const meta = document.querySelector('meta[name="theme-color"]');
  if(meta) meta.setAttribute("content", c);
}
function syncThemeColorWithSystem(){
  const dark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  setThemeColor(dark ? "#0b0f18" : "#ffffff");
}

function applyLang(lang){
  const dict = i18n[lang] || i18n.it;
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach(el=>{
    const k = el.getAttribute("data-i18n");
    if(dict[k]) el.textContent = dict[k];
  });

  $("wage").placeholder = (lang === "en") ? "e.g. 12.50" : "es. 12,50";
  $("cost").placeholder = (lang === "en") ? "e.g. 79.99" : "es. 79,99";
}

function formatNum(n, digits=2){
  if(!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/* accetta 12,50 e 12.50 */
function parseFlex(s){
  if(typeof s !== "string") return NaN;
  const t = s.trim().replace(/\s/g,"");
  if(!t) return NaN;

  let x = t;
  const hasC = x.includes(",");
  const hasD = x.includes(".");
  if(hasC && !hasD) x = x.replace(",", ".");
  else if(hasC && hasD){
    const lc = x.lastIndexOf(",");
    const ld = x.lastIndexOf(".");
    const dec = lc > ld ? "," : ".";
    const thou = dec === "," ? "." : ",";
    x = x.split(thou).join("");
    if(dec === ",") x = x.replace(",", ".");
  }
  return Number(x);
}

function hmFromHours(hours){
  const mins = Math.round(hours * 60);
  const h = Math.floor(mins/60);
  const m = mins % 60;
  return {h,m};
}

/* ---------- FX RATES (live + cache) ----------
   Usiamo Frankfurter (ECB-based). Se offline o errore: fallback a rate manuale.
*/
function loadRatesCache(){
  try{
    const raw = localStorage.getItem(RATES_STORAGE);
    return raw ? JSON.parse(raw) : null;
  }catch{return null;}
}
function saveRatesCache(obj){
  localStorage.setItem(RATES_STORAGE, JSON.stringify(obj));
}
function cacheValid(cache){
  return cache && cache.ts && (Date.now() - cache.ts) < RATES_TTL_MS && cache.rates;
}

async function fetchRates(base){
  // Frankfurter API: https://api.frankfurter.app/latest?from=EUR
  const url = `https://api.frankfurter.app/latest?from=${encodeURIComponent(base)}`;
  const res = await fetch(url, { cache:"no-store" });
  if(!res.ok) throw new Error("rates_fetch_failed");
  const data = await res.json();
  // data.rates: { USD: 1.09, ... } meaning 1 base = rate target
  return { base: data.base, date: data.date, rates: data.rates };
}

async function getRate(from, to){
  if(from === to) return { rate: 1, source: "same" };

  // 1) cache
  const cache = loadRatesCache();
  if(cacheValid(cache) && cache.base === from && cache.rates[to]){
    return { rate: cache.rates[to], source: "cache" };
  }

  // 2) live fetch
  try{
    const data = await fetchRates(from);
    saveRatesCache({ ts: Date.now(), base: from, date: data.date, rates: data.rates });
    if(data.rates[to]) return { rate: data.rates[to], source: "live" };
  }catch{
    // ignore
  }

  return { rate: null, source: "none" };
}

/* ---------- UI / CALC ---------- */
function openSettings(){
  $("backdrop").hidden = false;
  $("modal").hidden = false;
}
function closeSettings(){
  $("backdrop").hidden = true;
  $("modal").hidden = true;
}

function updateManualRateUI(state){
  const dict = i18n[state.lang] || i18n.it;
  $("manualRateLabel").textContent = dict.manualRateLabel(state.costCur, state.wageCur);
}

async function compute(state){
  const dict = i18n[state.lang] || i18n.it;

  const wage = parseFlex($("wage").value);
  const cost = parseFlex($("cost").value);

  const wageCur = $("wageCur").value;
  const costCur = $("costCur").value;

  state.wageCur = wageCur;
  state.costCur = costCur;
  state.wage = $("wage").value;
  state.cost = $("cost").value;
  saveState(state);

  $("moneyOut").textContent = "";
  $("rateOut").textContent = "";
  $("timeOut").textContent = "—";

  if(!$("wage").value.trim() || !$("cost").value.trim()){
    $("moneyOut").textContent = dict.needValues;
    $("manualRateBox").hidden = true;
    return;
  }

  if(!Number.isFinite(wage) || !Number.isFinite(cost) || wage <= 0 || cost < 0){
    $("moneyOut").textContent = dict.invalid;
    $("manualRateBox").hidden = true;
    return;
  }

  // CALCOLO 1: conversione valuta costo -> valuta paga
  const { rate, source } = await getRate(costCur, wageCur);

  let costInWage = null;
  let usedRate = rate;

  if(usedRate === null){
    // prova manuale
    $("manualRateBox").hidden = false;
    updateManualRateUI(state);

    const manual = parseFlex($("manualRate").value);
    if(Number.isFinite(manual) && manual > 0){
      usedRate = manual;
      costInWage = cost * usedRate;
      $("rateOut").textContent = dict.calcRate(costCur, wageCur, formatNum(usedRate, 6), "manual");
    }else{
      $("moneyOut").textContent = dict.invalid;
      $("rateOut").textContent = dict.calcRate(costCur, wageCur, "—", "manual");
      return;
    }
  }else{
    $("manualRateBox").hidden = true;
    costInWage = cost * usedRate;
    $("rateOut").textContent = dict.calcRate(costCur, wageCur, formatNum(usedRate, 6), source);
  }

  $("moneyOut").textContent = dict.calcMoney(formatNum(costInWage, 2), wageCur);

  // CALCOLO 2: tempo necessario
  const hours = costInWage / wage;
  const { h, m } = hmFromHours(hours);
  $("timeOut").textContent = `${h}h ${m}m`;
}

/* ---------- Install prompt ---------- */
function setupInstall(){
  const btn = $("installBtn");
  let deferred = null;

  window.addEventListener("beforeinstallprompt", (e)=>{
    e.preventDefault();
    deferred = e;
    btn.hidden = false;
  });

  btn.addEventListener("click", async ()=>{
    if(!deferred) return;
    deferred.prompt();
    try{ await deferred.userChoice; } finally{
      deferred = null;
      btn.hidden = true;
    }
  });

  window.addEventListener("appinstalled", ()=>{
    deferred = null;
    btn.hidden = true;
  });
}

/* ---------- Service Worker ---------- */
function setupSW(){
  if(!("serviceWorker" in navigator)) return;
  window.addEventListener("load", async ()=>{
    try{ await navigator.serviceWorker.register("./service-worker.js"); }catch{}
  });
}

/* ---------- Init ---------- */
(function init(){
  const state = loadState();

  // apply state
  $("themeSel").value = state.theme || "system";
  $("langSel").value  = state.lang || "it";
  $("wageCur").value  = state.wageCur || "EUR";
  $("costCur").value  = state.costCur || "EUR";
  $("wage").value     = state.wage || "";
  $("cost").value     = state.cost || "";

  setTheme(state.theme || "system");
  applyLang(state.lang || "it");

  // theme system changes
  const mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  if(mq){
    mq.addEventListener("change", ()=>{ if(($("themeSel").value||"system")==="system") syncThemeColorWithSystem(); });
  }

  // settings modal
  $("settingsBtn").addEventListener("click", openSettings);
  $("closeBtn").addEventListener("click", closeSettings);
  $("backdrop").addEventListener("click", closeSettings);
  document.addEventListener("keydown", (e)=>{ if(e.key==="Escape") closeSettings(); });

  $("saveBtn").addEventListener("click", ()=>{
    state.theme = $("themeSel").value;
    state.lang = $("langSel").value;
    saveState(state);
    setTheme(state.theme);
    applyLang(state.lang);
    closeSettings();
    compute(state);
  });

  // inputs
  ["wage","cost","wageCur","costCur","manualRate"].forEach(id=>{
    $(id).addEventListener("input", ()=> compute(state));
    $(id).addEventListener("change", ()=> compute(state));
  });

  $("clearBtn").addEventListener("click", ()=>{
    $("cost").value = "";
    $("manualRate").value = "";
    compute(state);
    $("cost").focus();
  });

  $("copyBtn").addEventListener("click", async ()=>{
    const dict = i18n[state.lang] || i18n.it;
    const t = `${$("timeOut").textContent} • ${$("moneyOut").textContent}`;
    try{
      await navigator.clipboard.writeText(t);
      const old = $("copyBtn").textContent;
      $("copyBtn").textContent = dict.copied;
      setTimeout(()=> $("copyBtn").textContent = old, 900);
    }catch{}
  });

  $("useLiveBtn").addEventListener("click", async ()=>{
    // forziamo un refresh cache facendo una fetch subito
    try{
      const from = $("costCur").value;
      const data = await fetchRates(from);
      saveRatesCache({ ts: Date.now(), base: from, date: data.date, rates: data.rates });
    }catch{}
    compute(state);
  });

  // first render
  compute(state);

  setupSW();
  setupInstall();
})();
