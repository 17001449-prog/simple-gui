/* ═══════════════════════════════════════════════════════════════
   BeautifulUI · UI-редактор
   Живое превью окна + генератор Lua + импорт кода.
   Зависимости: themes.js (window.THEMES, генерируется sync-themes.mjs)
   ═══════════════════════════════════════════════════════════════ */
(() => {
  "use strict";

  const THEMES = window.THEMES || {};
  const THEME_NAMES = Object.keys(THEMES);
  const LS_KEY = "beautifului-editor-v1";

  /* ─────────────── типы элементов ─────────────── */
  const ELEMENT_TYPES = {
    button:      { icon: "🔘", label: "Кнопка",       fields: ["text", "style", "icon"] },
    toggle:      { icon: "🎚", label: "Тумблер",      fields: ["text", "default", "flag"] },
    slider:      { icon: "📏", label: "Слайдер",      fields: ["text", "min", "max", "default", "step", "suffix", "flag"] },
    dropdown:    { icon: "📋", label: "Дропдаун",     fields: ["text", "options", "multi", "flag"] },
    input:       { icon: "⌨️", label: "Поле ввода",   fields: ["text", "placeholder", "flag"] },
    label:       { icon: "🏷", label: "Заголовок",    fields: ["text"] },
    paragraph:   { icon: "📄", label: "Абзац",        fields: ["text"] },
    status:      { icon: "📌", label: "Статус",       fields: ["text", "value", "kind"] },
    hint:        { icon: "💡", label: "Подсказка",    fields: ["text"] },
    separator:   { icon: "➖", label: "Разделитель",  fields: [] },
    colorpicker: { icon: "🎨", label: "Выбор цвета",  fields: ["text", "color", "flag"] },
    keybind:     { icon: "⌨", label: "Кейбинд",       fields: ["text", "key", "flag"] },
    progress:    { icon: "📊", label: "Прогресс",     fields: ["text", "max", "value"] },
    graph:       { icon: "📈", label: "График",       fields: ["text", "graphType", "height"] },
    subtab:      { icon: "📦", label: "Подраздел",    fields: ["text", "icon"] },
  };

  const BUTTON_STYLES = ["Primary", "Success", "Danger", "Warning", "Gradient", "Ghost", "Outline"];
  const STATUS_KINDS = ["Success", "Danger", "Warning", "Info", "Accent"];
  const GRAPH_TYPES = ["line", "area", "bar"];

  /* ─────────────── состояние ─────────────── */
  const uid = () => Math.random().toString(36).slice(2, 9);

  function defaultState() {
    return {
      window: {
        title: "My Hub",
        subtitle: "v1.0",
        icon: "⚡",
        theme: THEME_NAMES.includes("Cyber") ? "Cyber" : THEME_NAMES[0] || "Purple",
        width: 780,
        height: 580,
        showConfig: true,
        backdrop: false,
        discord: false,
        discordInvite: "",
        compact: false,
        libUrl: "https://raw.githubusercontent.com/17001449-prog/simple-gui/refs/heads/arena/acdd1950-simple-gui/SimpleUI.txt",
        font: "",
        fontScale: 100,
        fontPicker: false,
      },
      colors: {},
      tabs: [
        { id: uid(), name: "Главная", icon: "🏠", badge: 0, elements: [] },
      ],
      activeTabId: null,
      activeElementId: null,
      scenarios: [],
      activeScenarioId: null,
      view: "ui",
      device: "desktop",
      appTheme: "dark",
      showGrid: false,
    };
  }

  let state = defaultState();
  state.activeTabId = state.tabs[0].id;

  /* ─────────────── утилиты ─────────────── */
  const $ = (sel) => document.querySelector(sel);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  const luaStr = (s) => '"' + String(s == null ? "" : s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n") + '"';
  const luaKey = (k) => (/^[A-Za-z_]\w*$/.test(k) ? k : '["' + k.replace(/"/g, '\\"') + '"]');

  function activeTab() {
    return state.tabs.find((t) => t.id === state.activeTabId) || state.tabs[0] || null;
  }

  function currentPalette() {
    const base = THEMES[state.window.theme] || {};
    return { ...base, ...(state.colors || {}) };
  }

  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.hidden = false;
    requestAnimationFrame(() => t.classList.add("show"));
    clearTimeout(t._timer);
    t._timer = setTimeout(() => {
      t.classList.remove("show");
      setTimeout(() => { t.hidden = true; }, 220);
    }, 1900);
  }

  /* ─────────────── сохранение ─────────────── */
  // На file:// (двойной клик по index.html) Chrome иногда запрещает localStorage
  // и бросает SecurityError. Работаем через обёртку, чтобы редактор не падал.
  const store = {
    get(key) {
      try { return window.localStorage.getItem(key); } catch (_) { return null; }
    },
    set(key, value) {
      try { window.localStorage.setItem(key, value); return true; } catch (_) { return false; }
    },
  };
  let storageWarned = false;

  async function copyText(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_) {}
    // запасной путь: работает и на file://
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;left:-9999px;top:0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch (_) {
      return false;
    }
  }

  let saveTimer;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const ok = store.set(LS_KEY, JSON.stringify(state));
      if (!ok && !storageWarned) {
        storageWarned = true;
        toast("Сохранение недоступно (file://) — скачай .lua перед закрытием");
      }
    }, 250);
  }
  function load() {
    try {
      const raw = store.get(LS_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (!data || !Array.isArray(data.tabs)) return;
      state = { ...defaultState(), ...data };
      if (!state.tabs.length) state.tabs = defaultState().tabs;
      if (!state.tabs.find((t) => t.id === state.activeTabId)) state.activeTabId = state.tabs[0].id;
      state.colors = state.colors || {};
    } catch (_) {}
  }

  /* ═══════════════════════════════════════════════
     ПАНЕЛЬ: тема и палитра
     ═══════════════════════════════════════════════ */
  const COLOR_KEYS = ["Background", "Secondary", "Tertiary", "Accent", "AccentDark", "Text", "SubText", "Success", "Danger", "Warning", "Info", "Gradient1", "Gradient2"];

  function renderThemeSelect() {
    const sel = $("#win-theme");
    sel.innerHTML = "";
    for (const name of THEME_NAMES) {
      const o = el("option", null, name);
      o.value = name;
      if (name === state.window.theme) o.selected = true;
      sel.appendChild(o);
    }
  }

  function renderPalette() {
    const wrap = $("#palette");
    wrap.innerHTML = "";
    const palette = currentPalette();
    for (const key of COLOR_KEYS) {
      const value = palette[key] || "#000000";
      const row = el("div", "swatch");
      row.title = `${key} — ${value} (клик: скопировать)`;
      const chip = el("span", "chip");
      chip.style.background = value;
      const name = el("span", "name", key);
      const input = document.createElement("input");
      input.type = "color";
      input.value = value;
      input.dataset.key = key;
      input.addEventListener("input", () => {
        state.colors[key] = input.value;
        chip.style.background = input.value;
        applyPreviewTheme();
        renderCode();
        save();
      });
      row.append(chip, name, input);
      row.addEventListener("click", (e) => {
        if (e.target === input) return;
        input.click();
      });
      row.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        copyText(value).then((ok) => toast(ok ? `${key}: ${value}` : "Не удалось скопировать"));
      });
      wrap.appendChild(row);
    }
  }

  /* шрифт превью: ближайшее к Roblox семейство + масштаб из настроек */
  const PREVIEW_FONTS = {
    GothamBlack: '"Inter", "Segoe UI", system-ui, sans-serif',
    GothamBold: '"Inter", "Segoe UI", system-ui, sans-serif',
    GothamSemibold: '"Inter", "Segoe UI", system-ui, sans-serif',
    GothamMedium: '"Inter", "Segoe UI", system-ui, sans-serif',
    Gotham: '"Inter", "Segoe UI", system-ui, sans-serif',
    Code: '"JetBrains Mono", "Cascadia Code", "Consolas", monospace',
    RobotoMono: '"JetBrains Mono", "Cascadia Code", "Consolas", monospace',
    Roboto: 'Roboto, "Segoe UI", system-ui, sans-serif',
    SourceSans: '"Source Sans Pro", "Segoe UI", system-ui, sans-serif',
    SourceSansBold: '"Source Sans Pro", "Segoe UI", system-ui, sans-serif',
    Cartoon: '"Comic Sans MS", "Chalkboard SE", cursive',
    Fantasy: '"Papyrus", "Luminari", fantasy',
    SciFi: '"Orbitron", "Eurostile", "Michroma", sans-serif',
    Michroma: '"Michroma", "Orbitron", sans-serif',
    Oswald: '"Oswald", "Impact", sans-serif',
    PressStart2P: '"Press Start 2P", "Courier New", monospace',
    LuckiestGuy: '"Luckiest Guy", "Impact", fantasy',
    Bangers: '"Bangers", Impact, fantasy',
    IndieFlower: '"Indie Flower", "Comic Sans MS", cursive',
    PermanentMarker: '"Permanent Marker", "Comic Sans MS", cursive',
  };

  function applyPreviewFont() {
    const w = state.window;
    const stack = PREVIEW_FONTS[w.font] || PREVIEW_FONTS.Gotham;
    const scale = (Number(w.fontScale) || 100) / 100;
    const win = $("#win");
    win.style.setProperty("--win-font", stack);
    win.style.setProperty("--win-font-scale", String(scale));
    // жирность даёт сам Roblox-шрифт: в превью это наклон/вес через класс
    const boldLike = /Bold|Black|Semibold|SemiBold|Luckiest|Bangers|Oswald/.test(w.font || "Gotham");
    win.classList.toggle("font-bold", boldLike);
    win.classList.toggle("font-mono", /Code|Mono/.test(w.font || ""));
    const label = $("#win-font-state");
    if (label) label.textContent = w.font ? `${w.font} · ${Math.round(scale * 100)}%` : "по умолчанию";
  }

  function applyPreviewTheme() {
    const p = currentPalette();
    const win = $("#win");
    const setVar = (k, v) => v && win.style.setProperty(k, v);
    setVar("--accent", p.Accent);
    setVar("--accent-dark", p.AccentDark);
    setVar("--bg-win", p.Background);
    setVar("--secondary", p.Secondary);
    setVar("--tertiary", p.Tertiary);
    setVar("--text", p.Text);
    setVar("--subtext", p.SubText);
    setVar("--success", p.Success);
    setVar("--danger", p.Danger);
    setVar("--warning", p.Warning);
    setVar("--info", p.Info);
    setVar("--grad-1", p.Gradient1);
    setVar("--grad-2", p.Gradient2);
    win.style.setProperty("--win-w", `${state.window.width}px`);
    win.style.setProperty("--win-h", `${state.window.height}px`);
  }

  /* ═══════════════════════════════════════════════
     ПАНЕЛЬ: вкладки и элементы
     ═══════════════════════════════════════════════ */
  function renderTabList() {
    const wrap = $("#tabs-list");
    wrap.innerHTML = "";
    for (const tab of state.tabs) {
      const row = el("div", "tab-row" + (tab.id === state.activeTabId ? " active" : ""));
      row.append(el("span", "ico", tab.icon || "📄"), el("span", "nm", tab.name || "Вкладка"));
      const acts = el("div", "row-actions");
      const btnRename = el("button", null, "✎");
      btnRename.title = "Переименовать";
      btnRename.onclick = (e) => {
        e.stopPropagation();
        const name = prompt("Название вкладки:", tab.name);
        if (name != null) { tab.name = name; renderAll(); save(); }
      };
      const btnIcon = el("button", null, "🙂");
      btnIcon.title = "Иконка";
      btnIcon.onclick = (e) => {
        e.stopPropagation();
        const icon = prompt("Иконка (эмодзи, пусто — без иконки):", tab.icon || "");
        if (icon != null) { tab.icon = icon; renderAll(); save(); }
      };
      const btnDel = el("button", null, "✕");
      btnDel.title = "Удалить";
      btnDel.onclick = (e) => {
        e.stopPropagation();
        if (state.tabs.length === 1) return toast("Нужна хотя бы одна вкладка");
        state.tabs = state.tabs.filter((t) => t.id !== tab.id);
        if (state.activeTabId === tab.id) state.activeTabId = state.tabs[0].id;
        renderAll(); save();
      };
      acts.append(btnRename, btnIcon, btnDel);
      row.append(acts);
      row.onclick = () => { state.activeTabId = tab.id; renderAll(); save(); };
      wrap.appendChild(row);
    }
  }

  function renderAddGrid() {
    const wrap = $("#add-grid");
    wrap.innerHTML = "";
    for (const [type, meta] of Object.entries(ELEMENT_TYPES)) {
      const b = el("button", "add-btn");
      b.append(el("span", null, meta.icon), el("span", null, meta.label));
      b.onclick = () => addElement(type);
      wrap.appendChild(b);
    }
  }

  function defaultElement(type) {
    const base = { id: uid(), type };
    switch (type) {
      case "button": return { ...base, text: "Кнопка", style: "Primary", icon: "" };
      case "toggle": return { ...base, text: "Тумблер", default: false, flag: "" };
      case "slider": return { ...base, text: "Слайдер", min: 0, max: 100, default: 50, step: 1, suffix: "", flag: "" };
      case "dropdown": return { ...base, text: "Список", options: "Опция 1, Опция 2, Опция 3", multi: false, flag: "" };
      case "input": return { ...base, text: "Поле", placeholder: "Введите…", flag: "" };
      case "label": return { ...base, text: "Заголовок" };
      case "paragraph": return { ...base, text: "Описание для пользователя: что делает эта функция и чем полезна." };
      case "status": return { ...base, text: "Статус", value: "Онлайн", kind: "Success" };
      case "hint": return { ...base, text: "Подсказка: настройки сохраняются автоматически." };
      case "separator": return { ...base };
      case "colorpicker": return { ...base, text: "Цвет", color: "#FF5050", flag: "" };
      case "keybind": return { ...base, text: "Клавиша", key: "F", flag: "" };
      case "progress": return { ...base, text: "Прогресс", max: 100, value: 35 };
      case "graph": return { ...base, text: "FPS", graphType: "line", height: 160 };
      case "subtab": return { ...base, text: "Подраздел", icon: "📦" };
      default: return { ...base, text: type };
    }
  }

  function addElement(type) {
    const tab = activeTab();
    if (!tab) return toast("Сначала создайте вкладку");
    const item = defaultElement(type);
    tab.elements.push(item);
    state.activeElementId = item.id;
    renderAll(); save();
  }

  function renderElementList() {
    const wrap = $("#elements-list");
    wrap.innerHTML = "";
    const tab = activeTab();
    if (!tab || !tab.elements.length) {
      wrap.appendChild(el("p", "hint", "Пока пусто — добавь элементы кнопками выше."));
      return;
    }
    tab.elements.forEach((item, idx) => {
      const meta = ELEMENT_TYPES[item.type] || { icon: "❓", label: item.type };
      const row = el("div", "el-row" + (item.id === state.activeElementId ? " sel" : ""));
      row.append(el("span", "ico", meta.icon), el("span", "nm", item.text || meta.label));
      const acts = el("div", "row-actions");
      const up = el("button", null, "↑");
      up.onclick = (e) => { e.stopPropagation(); if (idx > 0) { [tab.elements[idx - 1], tab.elements[idx]] = [tab.elements[idx], tab.elements[idx - 1]]; renderAll(); save(); } };
      const down = el("button", null, "↓");
      down.onclick = (e) => { e.stopPropagation(); if (idx < tab.elements.length - 1) { [tab.elements[idx + 1], tab.elements[idx]] = [tab.elements[idx], tab.elements[idx + 1]]; renderAll(); save(); } };
      const del = el("button", null, "✕");
      del.onclick = (e) => { e.stopPropagation(); tab.elements.splice(idx, 1); renderAll(); save(); };
      acts.append(up, down, del);
      row.append(acts);
      row.onclick = () => {
        state.activeElementId = item.id;
        openElementEditor(item);
        renderElementList();
      };
      wrap.appendChild(row);
    });
  }

  /* ─── модалка-редактор свойств элемента ─── */
  function openElementEditor(item) {
    const meta = ELEMENT_TYPES[item.type] || { fields: [], label: item.type };
    const modal = $("#modal");
    const textarea = $("#modal-textarea");
    textarea.hidden = true;
    $("#modal-title").textContent = `Свойства: ${meta.label || item.type}`;
    $("#modal-hint").textContent = "Меняй значения — превью обновится после «Готово».";

    modal.querySelector(".props-form")?.remove();
    const form = el("div", "props-form");
    form.style.cssText = "display:grid;gap:9px;max-height:52vh;overflow:auto";

    const inputs = {};
    for (const field of meta.fields) {
      const row = el("label", "field");
      row.append(el("span", null, FIELD_LABELS[field] || field));
      let input;
      const makeSelect = (values, current) => {
        const node = el("select");
        for (const v of values) { const o = el("option", null, String(v)); o.value = String(v); node.appendChild(o); }
        node.value = String(current);
        return node;
      };
      if (field === "style") input = makeSelect(BUTTON_STYLES, item.style || "Primary");
      else if (field === "kind") input = makeSelect(STATUS_KINDS, item.kind || "Success");
      else if (field === "graphType") input = makeSelect(GRAPH_TYPES, item.graphType || "line");
      else if (field === "default" && item.type === "toggle") input = makeSelect(["false", "true"], item.default ? "true" : "false");
      else if (field === "multi") input = makeSelect(["false", "true"], item.multi ? "true" : "false");
      else if (field === "color") {
        input = document.createElement("input");
        input.type = "color";
        input.value = item.color || "#FF5050";
      } else if (["min", "max", "default", "step", "height", "value"].includes(field)) {
        input = document.createElement("input");
        input.type = "number";
        input.value = item[field] ?? "";
      } else {
        input = document.createElement("input");
        input.type = "text";
        input.value = item[field] ?? "";
      }
      inputs[field] = input;
      row.appendChild(input);
      form.appendChild(row);
    }
    if (!meta.fields.length) form.appendChild(el("p", "hint", "У этого элемента нет настроек."));
    textarea.after(form);

    const ok = $("#modal-ok");
    const cancel = $("#modal-cancel");
    const closeBtn = $("#modal-close");

    const close = () => {
      modal.hidden = true;
      form.remove();
      textarea.hidden = false;
      ok.onclick = null;
    };

    ok.textContent = "Готово";
    cancel.textContent = "Закрыть";
    ok.onclick = () => {
      for (const [field, input] of Object.entries(inputs)) {
        if (field === "default" && item.type === "toggle") item.default = input.value === "true";
        else if (field === "multi") item.multi = input.value === "true";
        else if (["min", "max", "default", "step", "height", "value"].includes(field)) item[field] = Number(input.value) || 0;
        else item[field] = input.value;
      }
      close();
      renderAll();
      save();
    };
    closeBtn.onclick = close;
    cancel.onclick = close;
    modal.hidden = false;
    form.querySelector("input, select")?.focus();
  }

  const FIELD_LABELS = {
    text: "Название", style: "Стиль", icon: "Иконка", default: "По умолчанию",
    flag: "Флаг (для конфига)", min: "Минимум", max: "Максимум", step: "Шаг",
    suffix: "Суффикс", options: "Опции (через запятую)", multi: "Мультивыбор",
    placeholder: "Плейсхолдер", value: "Значение", kind: "Тип", color: "Цвет",
    key: "Клавиша", graphType: "Тип графика", height: "Высота",
  };

  /* ═══════════════════════════════════════════════
     ПРЕВЬЮ
     ═══════════════════════════════════════════════ */
  function renderPreviewTabs() {
    const wrap = $("#preview-tabs");
    wrap.innerHTML = "";
    for (const tab of state.tabs) {
      const b = el("button", "tab" + (tab.id === state.activeTabId ? " active" : ""));
      if (tab.icon) b.append(el("span", "tab-icon", tab.icon));
      b.append(el("span", "tab-label", tab.name || "Вкладка"));
      if (tab.badge > 0) b.append(el("span", "tab-badge", String(tab.badge)));
      b.onclick = () => { state.activeTabId = tab.id; renderAll(); save(); };
      wrap.appendChild(b);
    }
  }

  function renderPreviewElements() {
    const pages = $("#pages");
    pages.innerHTML = "";
    const tab = activeTab();
    const hint = $("#empty-hint");
    if (!tab || !tab.elements.length) {
      if (hint) hint.hidden = false;
      return;
    }
    if (hint) hint.hidden = true;

    const page = el("div", "page");
    for (const item of tab.elements) {
      const node = buildElement(item);
      if (node) page.appendChild(node);
      node?.addEventListener("click", (e) => {
        e.stopPropagation();
        state.activeElementId = item.id;
        openElementEditor(item);
        renderElementList();
      });
    }
    pages.appendChild(page);
  }

  function buildElement(item) {
    const p = currentPalette();
    switch (item.type) {
      case "button": {
        const b = el("div", `el el-button style-${(item.style || "Primary").toLowerCase()}`, (item.icon ? item.icon + "  " : "") + (item.text || ""));
        return b;
      }
      case "toggle": {
        const row = el("div", "el el-row-card");
        row.append(el("span", "grow", item.text || ""));
        const sw = el("span", "switch" + (item.default ? " on" : ""));
        row.append(sw);
        return row;
      }
      case "slider": {
        const min = Number(item.min) || 0, max = Number(item.max) || 100;
        const val = Number(item.default) || 0;
        const pct = max > min ? Math.min(100, Math.max(0, ((val - min) / (max - min)) * 100)) : 0;
        const box = el("div", "el el-slider");
        const head = el("div", "head");
        head.append(el("span", null, item.text || ""));
        head.append(el("b", null, `${val}${item.suffix ? " " + item.suffix : ""}`));
        const bar = el("div", "bar");
        bar.style.setProperty("--pos", pct + "%");
        const fill = el("i");
        fill.style.width = pct + "%";
        bar.appendChild(fill);
        box.append(head, bar);
        return box;
      }
      case "dropdown": {
        const row = el("div", "el el-dropdown");
        const opts = String(item.options || "").split(",").map((s) => s.trim()).filter(Boolean);
        row.append(el("span", null, `${item.text || "Список"}: ${opts[0] || "—"}`));
        if (item.multi) row.append(el("span", "chip info", "мульти"));
        row.append(el("span", "arrow", "▼"));
        return row;
      }
      case "input": {
        const row = el("div", "el el-input");
        row.append(el("span", null, item.text || ""));
        row.append(el("span", "ph", item.placeholder || ""));
        return row;
      }
      case "label": return el("div", "el el-label", item.text || "");
      case "paragraph": return el("div", "el el-paragraph", item.text || "");
      case "status": {
        const row = el("div", "el el-status");
        row.append(el("span", null, item.text || ""));
        row.append(el("span", "chip " + (item.kind || "Success").toLowerCase(), item.value || ""));
        return row;
      }
      case "hint": {
        const box = el("div", "el el-hint");
        box.append(el("b", null, "i"), el("span", null, item.text || ""));
        return box;
      }
      case "separator": return el("div", "el el-sep");
      case "colorpicker": {
        const row = el("div", "el el-color");
        row.append(el("span", null, item.text || "Цвет"));
        const prev = el("span", "prev");
        prev.style.background = item.color || "#FF5050";
        row.append(prev);
        return row;
      }
      case "keybind": {
        const row = el("div", "el el-row-card");
        row.append(el("span", "grow", item.text || ""));
        const v = el("span", "value", item.key || "F");
        v.style.cssText = "padding:2px 8px;border-radius:6px;background:color-mix(in oklab, var(--tertiary) 80%, transparent)";
        row.append(v);
        return row;
      }
      case "progress": {
        const max = Number(item.max) || 100;
        const val = Math.min(Number(item.value) || 0, max);
        const pct = max > 0 ? (val / max) * 100 : 0;
        const box = el("div", "el el-progress");
        const head = el("div", "head");
        head.append(el("span", null, item.text || ""));
        head.append(el("b", null, `${val}/${max}`));
        const bar = el("div", "bar");
        bar.style.setProperty("--pos", pct + "%");
        const fill = el("i");
        fill.style.width = pct + "%";
        bar.appendChild(fill);
        box.append(head, bar);
        return box;
      }
      case "graph": {
        const box = el("div", "el el-graph");
        const head = el("div", "head");
        head.append(el("span", null, item.text || "График"));
        head.append(el("span", null, item.graphType || "line"));
        box.append(head);
        box.append(sparkline(item.graphType || "line", p.Accent || "#8a2be2", p.AccentDark || "#641eb4"));
        return box;
      }
      case "subtab": {
        const row = el("div", "el el-subtab");
        row.textContent = `${item.icon || ""} ${item.text || "Подраздел"}`.trim();
        return row;
      }
      default: return null;
    }
  }

  function sparkline(type, c1, c2) {
    const W = 320, H = 70, N = 24;
    const pts = Array.from({ length: N }, (_, i) => 0.5 + 0.32 * Math.sin(i / 2.3) + 0.14 * Math.sin(i / 0.8));
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("preserveAspectRatio", "none");
    const grad = document.createElementNS(svgNS, "linearGradient");
    const gid = "g" + uid();
    grad.setAttribute("id", gid);
    grad.setAttribute("x1", "0"); grad.setAttribute("x2", "0");
    grad.setAttribute("y1", "0"); grad.setAttribute("y2", "1");
    for (const [off, col, op] of [[0, c1, 0.55], [1, c1, 0]]) {
      const st = document.createElementNS(svgNS, "stop");
      st.setAttribute("offset", String(off));
      st.setAttribute("stop-color", col);
      st.setAttribute("stop-opacity", String(op));
      grad.appendChild(st);
    }
    const defs = document.createElementNS(svgNS, "defs");
    defs.appendChild(grad);
    svg.appendChild(defs);

    const step = W / (N - 1);
    const xy = pts.map((v, i) => [i * step, H - 6 - Math.min(1, Math.max(0, v)) * (H - 14)]);

    if (type === "bar") {
      const bw = Math.max(3, step * 0.55);
      pts.forEach((v, i) => {
        const h = Math.max(3, Math.min(1, Math.max(0, v)) * (H - 12));
        const r = document.createElementNS(svgNS, "rect");
        r.setAttribute("x", String(i * step));
        r.setAttribute("y", String(H - 4 - h));
        r.setAttribute("width", String(bw));
        r.setAttribute("height", String(h));
        r.setAttribute("rx", "2");
        r.setAttribute("fill", c1);
        r.setAttribute("opacity", "0.85");
        svg.appendChild(r);
      });
      return svg;
    }

    if (type === "area") {
      const area = document.createElementNS(svgNS, "path");
      const d = `M${xy[0][0]},${H - 4} ` + xy.map(([x, y]) => `L${x},${y}`).join(" ") + ` L${W},${H - 4} Z`;
      area.setAttribute("d", d);
      area.setAttribute("fill", `url(#${gid})`);
      svg.appendChild(area);
    }

    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", xy.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" "));
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", c1);
    path.setAttribute("stroke-width", "2");
    path.setAttribute("stroke-linecap", "round");
    svg.appendChild(path);

    xy.filter((_, i) => i % 4 === 0).forEach(([x, y]) => {
      const c = document.createElementNS(svgNS, "circle");
      c.setAttribute("cx", String(x)); c.setAttribute("cy", String(y));
      c.setAttribute("r", "2.5");
      c.setAttribute("fill", c2);
      svg.appendChild(c);
    });
    return svg;
  }

  function renderPreviewWindow() {
    const w = state.window;
    $("#win-title-label").textContent = w.title || "Без названия";
    $("#win-subtitle-label").textContent = w.subtitle || "";
    $("#win-logo").textContent = w.icon || "⚡";
    $("#win-discord-btn").hidden = !w.discord;

    const footer = $("#sidebar-footer");
    footer.innerHTML = "";
    footer.append(el("span", "ver-label", "BeautifulUI v6.3"));
    if (w.showConfig) {
      const btns = el("div", "footer-btns");
      btns.append(el("span", null, "💾"), el("span", null, "📂"));
      footer.append(btns);
    }
    $("#device").classList.toggle("mobile", state.device === "mobile");
    $("#win").style.setProperty("--win-w", `${w.width}px`);
    $("#win").style.setProperty("--win-h", `${w.height}px`);
  }

  const FONT_PRESETS = [
    "Gotham", "GothamMedium", "GothamBold", "GothamSemibold", "GothamBlack",
    "Code", "Roboto", "RobotoMono", "SourceSans", "SourceSansBold",
    "Cartoon", "SciFi", "Fantasy", "Antique", "Arcade", "Bangers", "Creepster",
    "LuckiestGuy", "Michroma", "Oswald", "PressStart2P", "PermanentMarker",
    "SpecialElite", "IndieFlower", "GrenzeGotisch", "FredokaOne", "Nunito",
  ];

  function renderFontPresets() {
    const list = $("#font-presets");
    if (!list) return;
    list.innerHTML = "";
    for (const name of FONT_PRESETS) {
      const o = document.createElement("option");
      o.value = name;
      list.appendChild(o);
    }
  }

  /* фильтрация вкладок поиском в превью */
  function bindPreviewSearch() {
    const input = $("#preview-search");
    input.oninput = () => {
      const q = input.value.trim().toLowerCase();
      document.querySelectorAll("#preview-tabs .tab").forEach((btn, i) => {
        const tab = state.tabs[i];
        btn.style.display = !q || (tab && tab.name.toLowerCase().includes(q)) ? "" : "none";
      });
    };
  }

  /* ═══════════════════════════════════════════════
     ГЕНЕРАТОР LUA
     ═══════════════════════════════════════════════ */
  function generateLua() {
    const w = state.window;
    elementVars = {};
    const lines = [];
    const push = (s = "") => lines.push(s);

    push("-- ═══════════════════════════════════════════════════════");
    push("--  Сгенерировано BeautifulUI UI-редактором");
    push("-- ═══════════════════════════════════════════════════════");
    const libUrl = (w.libUrl || "").trim();
    push(`local BeautifulUI = loadstring(game:HttpGet(${luaStr(libUrl || "ВАШ_URL/SimpleUI.txt")}))()`);
    push("");
    push("local Window = BeautifulUI:CreateWindow({");
    push(`    Title = ${luaStr(w.title)},`);
    if (w.subtitle) push(`    Subtitle = ${luaStr(w.subtitle)},`);
    if (w.icon) push(`    Icon = ${luaStr(w.icon)},`);
    push(`    Theme = ${luaStr(w.theme)},`);
    push(`    Size = UDim2.fromOffset(${Number(w.width) || 780}, ${Number(w.height) || 580}),`);
    if (w.showConfig) push("    ShowConfig = true,");
    if (w.backdrop) push("    Backdrop = true,");
    if (w.compact) push("    Compact = true,");
    if (w.discord && w.discordInvite) push(`    Discord = ${luaStr(w.discordInvite)},`);
    if (w.font) push(`    Font = ${luaStr(w.font)},`);
    if (w.font && Number(w.fontScale) && Number(w.fontScale) !== 100) {
      push(`    FontSizeScale = ${Number(w.fontScale) / 100},`);
    }
    push("})");
    push("");

    if (w.discord && w.discordInvite) {
      push("-- Discord-модуль: кнопка в шапке, виджет в сайдбаре и напоминание");
      push(`BeautifulUI:SetDiscord({Invite = ${luaStr(w.discordInvite)}})`);
      push("");
    }

    for (let i = 0; i < state.tabs.length; i++) {
      const tab = state.tabs[i];
      push(`local ${varForTab(tab)} = Window:Tab(${luaStr(tab.name)}${tab.icon ? ", " + luaStr(tab.icon) : ""})`);
      if (i === 0 && w.fontPicker) {
        push(`-- готовый экран: шрифт, масштаб, свой ID, жирность, тест`);
        push(`local Fonts = ${varForTab(tab)}:FontPicker({Default = ${luaStr(w.font || "GothamBold")}})`);
      }
      for (const item of tab.elements) {
        const code = elementLua(item, tab);
        if (code) code.forEach((l) => push(l));
      }
      push("");
    }

    // ── сценарии из визуального редактора ──
    state.__elementVars = elementVars;
    if (window.Scenarios && typeof window.Scenarios.generateLua === "function") {
      try {
        const scen = window.Scenarios.generateLua();
        if (scen) {
          push("");
          push(scen);
        }
      } catch (err) {
        push("-- [!] ошибка генерации сценариев: " + err.message);
      }
    }

    push("");
    push("-- Готово! Окно создано, элементы подключены.");
    return lines.join("\n");
  }

  const usedVars = new Set();
  const varForElement = (item, prefix) => {
    let base = prefix + String(item.id).replace(/[^a-z0-9]/gi, "").slice(0, 5);
    base = prefix + base.charAt(prefix.length).toUpperCase() + base.slice(prefix.length + 1);
    let name = base, i = 2;
    while (usedVars.has(name)) name = base + i++;
    usedVars.add(name);
    return name;
  };

  const varForTab = (() => {
    const cache = new Map();
    const used = new Set();
    return (tab) => {
      if (cache.has(tab.id)) return cache.get(tab.id);
      let base = "Tab" + (tab.name || "").replace(/[^A-Za-z0-9]/g, "");
      if (base === "Tab" || !/^[A-Za-z]/.test(base)) base = "Tab";
      if (/^[A-Za-z]/.test(tab.name || "")) {
        base = (tab.name || "").replace(/[^A-Za-z0-9]/g, "");
        base = base.charAt(0).toUpperCase() + base.slice(1);
      }
      let name = base, i = 2;
      while (used.has(name)) name = base + i++;
      used.add(name);
      cache.set(tab.id, name);
      return name;
    };
  })();

  /* id элемента → имя Lua-переменной, чтобы сценарии могли на него ссылаться */
  let elementVars = {};

  function elementLua(item, tab) {
    const T = varForTab(tab);
    const flagArg = item.flag ? `, ${luaStr(item.flag)}` : "";
    switch (item.type) {
      case "button": {
        const style = item.style && item.style !== "Primary" ? `, ${luaStr(item.style)}` : "";
        const bv = varForElement(item, "btn");
        elementVars[item.id] = bv;
        const icon = item.icon ? `, ${luaStr(item.icon)}` : "";
        return [`local ${bv} = ${T}:Button(${luaStr(item.text)}, function()`, `    -- TODO: действие кнопки`, `end${style}${icon})`];
      }
      case "toggle": {
        const v = varForElement(item, "toggle");
        elementVars[item.id] = v;
        return [`local ${v} = ${T}:Toggle(${luaStr(item.text)}, ${item.default ? "true" : "false"}, function(value)`, `    print(${luaStr(item.text)}, value)`, `end${flagArg})`];
      }
      case "slider": {
        const opts = [];
        if (Number(item.step) && Number(item.step) !== 1) opts.push(`step = ${Number(item.step)}`);
        if (item.suffix) opts.push(`suffix = ${luaStr(" " + String(item.suffix).trim())}`);
        const optStr = opts.length ? `, {${opts.join(", ")}}` : "";
        const v = varForElement(item, "slider");
        elementVars[item.id] = v;
        return [`local ${v} = ${T}:Slider(${luaStr(item.text)}, ${Number(item.min) || 0}, ${Number(item.max) || 100}, ${Number(item.default) || 0}, function(value)`, `    print(${luaStr(item.text)}, value)`, `end${flagArg}${optStr})`];
      }
      case "dropdown": {
        const opts = String(item.options || "").split(",").map((s) => s.trim()).filter(Boolean);
        const list = "{" + opts.map(luaStr).join(", ") + "}";
        const multi = item.multi ? `, {multi = true}` : "";
        const v = varForElement(item, "dropdown");
        elementVars[item.id] = v;
        return [`local ${v} = ${T}:Dropdown(${luaStr(item.text)}, ${list}, function(value)`, `    print(${luaStr(item.text)}, value)`, `end${flagArg}${multi})`];
      }
      case "input":
        const v = varForElement(item, "input");
        elementVars[item.id] = v;
        return [`local ${v} = ${T}:Input(${luaStr(item.text)}, ${luaStr(item.placeholder || "Введите…")}, function(value)`, `    print(${luaStr(item.text)}, value)`, `end${flagArg})`];
      case "label": return [`${T}:Label(${luaStr(item.text)})`];
      case "paragraph": return [`${T}:Paragraph(${luaStr(item.text)})`];
      case "status": return [`local ${varForElement(item, "status")} = ${T}:Status(${luaStr(item.text)}, ${luaStr(item.value)}, ${luaStr(item.kind)})`];
      case "hint": return [`${T}:Hint(${luaStr(item.text)})`];
      case "separator": return [`${T}:Separator()`];
      case "colorpicker": return [`${T}:ColorPicker(${luaStr(item.text)}, ${luaStr(item.color || "#FF5050")}, function(color)`, `    print(${luaStr(item.text)}, color)`, `end${flagArg})`];
      case "keybind": return [`${T}:Keybind(${luaStr(item.text)}, Enum.KeyCode.${item.key || "F"}, function()`, `    -- клавиша нажата`, `end${flagArg})`];
      case "progress": {
        const v = varForElement(item, "progress");
        return [`local ${v} = ${T}:ProgressBar(${luaStr(item.text)}, ${Number(item.max) || 100})`, `${v}:Set(${Number(item.value) || 0})`];
      }
      case "graph": {
        const v = varForElement(item, "graph");
        return [`local ${v} = ${T}:Graph(${luaStr(item.text)}, ${luaStr(item.graphType || "line")}, ${Number(item.height) || 160})`, `-- ${v}:AddPoint(value) в цикле обновления`];
      }
      case "subtab": {
        const sub = varForElement(item, "sub");
        return [`local ${sub} = ${T}:SubTab(${luaStr(item.text)}${item.icon ? ", " + luaStr(item.icon) : ""})`, `-- дальше используй ${sub}:Button(...) и другие элементы`];
      }
      default: return [`-- неизвестный элемент: ${item.type}`];
    }
  }

  /* — подсветка Lua — */
  function highlightLua(code) {
    const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const KW = "local|function|end|if|then|else|elseif|for|in|do|while|return|and|or|not|nil|true|false|break|repeat|until|continue";
    const pattern = new RegExp(
      `(--[^\\n]*)|("(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*')|\\b(${KW})\\b|\\b(\\d+(?:\\.\\d+)?)\\b|\\b([A-Za-z_][\\w]*)\\s*(?=\\()`,
      "g"
    );
    return esc(code).replace(pattern, (m, com, str, kw, num, fn) => {
      if (com) return `<span class="tok-com">${com}</span>`;
      if (str) return `<span class="tok-str">${str}</span>`;
      if (kw) return `<span class="tok-kw">${kw}</span>`;
      if (num) return `<span class="tok-num">${num}</span>`;
      if (fn) return `<span class="tok-fn">${fn}</span>`;
      return m;
    });
  }

  window.__highlightLua = highlightLua;

  function renderCode() {
    const code = generateLua();
    $("#code-out").innerHTML = highlightLua(code);
    $("#code-out").dataset.raw = code;
    const size = new Blob([code]).size;
    $("#code-stats").textContent = `${code.split("\n").length} строк · ${(size / 1024).toFixed(1)} КБ`;
    return code;
  }

  /* ═══════════════════════════════════════════════
     ИМПОРТ LUA (парсер сгенерированного формата)
     ═══════════════════════════════════════════════ */
  function unquote(s) {
    return s.replace(/^["']|["']$/g, "").replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }

  function importLua(rawSrc) {
    // Убираем тела колбэков: `function(...) ... end` → FN,
    // иначе одна строка с элементом «разрезает» аргументы на несколько строк
    const src = rawSrc
      .replace(/^\s*--.*$/gm, "")                              // полные комментарии
      .replace(/function\s*[\w.]*\s*\([^)]*\)\s*end/g, "FN")  // однострочные колбэки
      .replace(/function\s*[\w.]*\s*\([^)]*\)[\s\S]*?\n\s*end/g, "FN"); // многострочные

    const next = defaultState();
    const errors = [];
    const num = (v) => (v == null ? 0 : Number(String(v).trim()));

    // окно
    const winMatch = src.match(/CreateWindow\(\{([\s\S]*?)\n\}\)/) || src.match(/CreateWindow\(\{(.*?)\}\)/s);
    if (winMatch) {
      const body = winMatch[1];
      const get = (key) => {
        const m = body.match(new RegExp(`\\b${key}\\s*=\\s*(.+?)[,\\n]`, "s"));
        return m ? m[1].trim() : null;
      };
      const title = get("Title");
      if (title) next.window.title = unquote(title);
      const subtitle = get("Subtitle");
      if (subtitle) next.window.subtitle = unquote(subtitle);
      const icon = get("Icon");
      if (icon) next.window.icon = unquote(icon);
      const theme = get("Theme");
      if (theme) {
        const name = unquote(theme);
        if (THEMES[name]) next.window.theme = name;
      }
      next.window.showConfig = /ShowConfig\s*=\s*true/.test(body);
      next.window.backdrop = /Backdrop\s*=\s*true/.test(body);
      next.window.compact = /Compact\s*=\s*true/.test(body);
      const font = body.match(/\bFont\s*=\s*"([^"]*)"/);
      if (font) next.window.font = font[1];
      const fscale = body.match(/FontSizeScale\s*=\s*([\d.]+)/);
      if (fscale) next.window.fontScale = Math.round(Number(fscale[1]) * 100);
      next.window.fontPicker = /:FontPicker\(/.test(src);
      const url = src.match(/game:HttpGet\("([^"]+)"\)/);
      if (url && !/ВАШ_URL/.test(url[1])) next.window.libUrl = url[1];
      const discord = body.match(/Discord\s*=\s*"([^"]*)"/);
      if (discord) { next.window.discord = true; next.window.discordInvite = discord[1]; }
    } else {
      errors.push("Не нашёл вызов CreateWindow");
    }

    // вкладки
    const tabRe = /local\s+(\w+)\s*=\s*Window:Tab\((.*?)\)\s*\n([\s\S]*?)(?=\nlocal\s+\w+\s*=\s*Window:Tab\(|$)/g;
    let tm;
    const tabs = [];
    while ((tm = tabRe.exec(src))) {
      const [, varName, argsRaw, body] = tm;
      const args = splitArgs(argsRaw);
      const tab = { id: uid(), name: unquote(args[0] || "Вкладка"), icon: args[1] ? unquote(args[1]) : "", badge: 0, elements: [] };
      tabs.push({ varName, tab, body });
    }

    if (!tabs.length) {
      // fallback: вкладки без элементов
      const simple = /Window:Tab\(("([^"]*)"|[^)]*)\)/g;
      let sm;
      while ((sm = simple.exec(src))) {
        const m = sm[1].match(/"([^"]*)"/);
        tabs.push({ varName: "Tab" + tabs.length, tab: { id: uid(), name: m ? m[1] : "Вкладка", icon: "", badge: 0, elements: [] }, body: "" });
      }
    }

    for (const { tab, body } of tabs) {
      const lines = body.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("--")) continue;
        const call = trimmed.match(/^(?:local\s+\w+\s*=\s*)?\w+:(Button|Toggle|Slider|Dropdown|Input|Label|Paragraph|Status|Hint|Separator|ColorPicker|Keybind|ProgressBar|Graph|SubTab)\((.*?)\)?\s*$/);
        if (!call) continue;
        const kind = call[1];
        const args = splitArgs(call[2]);
        const item = (() => {
          switch (kind) {
            case "Button": return { type: "button", text: unquote(args[0] || "Кнопка"), style: ["Primary","Success","Danger","Warning","Gradient","Ghost","Outline"].includes(unquote(args[1] || "")) ? unquote(args[1]) : "Primary", icon: args[2] ? unquote(args[2]) : "" };
            case "Toggle": return { type: "toggle", text: unquote(args[0] || "Тумблер"), default: /true/.test(args[1] || ""), flag: unquote(args[3] || "") };
            case "Slider": {
              const opt = args[5] || "";
              const step = opt.match(/step\s*=\s*([\d.]+)/);
              const suffix = opt.match(/suffix\s*=\s*"([^"]*)"/);
              return {
                type: "slider", text: unquote(args[0] || "Слайдер"),
                min: num(args[1]), max: num(args[2]), default: num(args[3]),
                step: step ? Number(step[1]) : 1,
                suffix: suffix ? suffix[1].trim() : "",
                flag: unquote(args[4] || ""),
              };
            }
            case "Dropdown": {
              const opts = (args[1] || "").match(/"([^"]*)"/g)?.map(unquote) || [];
              const opt = args[4] || "";
              return {
                type: "dropdown", text: unquote(args[0] || "Список"),
                options: opts.join(", "),
                multi: /multi\s*=\s*true/.test(opt),
                flag: unquote(args[3] || ""),
              };
            }
            case "Input": return { type: "input", text: unquote(args[0] || "Поле"), placeholder: unquote(args[1] || ""), flag: unquote(args[3] || "") };
            case "Label": return { type: "label", text: unquote(args[0] || "") };
            case "Paragraph": return { type: "paragraph", text: unquote(args[0] || "") };
            case "Status": return { type: "status", text: unquote(args[0] || ""), value: unquote(args[1] || ""), kind: ["Success","Danger","Warning","Info","Accent"].includes(unquote(args[2] || "")) ? unquote(args[2]) : "Success" };
            case "Hint": return { type: "hint", text: unquote(args[0] || "") };
            case "Separator": return { type: "separator" };
            case "ColorPicker": return { type: "colorpicker", text: unquote(args[0] || "Цвет"), color: unquote(args[1] || "#FF5050"), flag: unquote(args[3] || "") };
            case "Keybind": {
              const key = (args[1] || "").match(/KeyCode\.(\w+)/);
              return { type: "keybind", text: unquote(args[0] || "Клавиша"), key: key ? key[1] : "F", flag: unquote(args[3] || "") };
            }
            case "ProgressBar": return { type: "progress", text: unquote(args[0] || "Прогресс"), max: num(args[1]) || 100, value: 0 };
            case "Graph": return { type: "graph", text: unquote(args[0] || "График"), graphType: unquote(args[1] || "line"), height: num(args[2]) || 160 };
            case "SubTab": return { type: "subtab", text: unquote(args[0] || "Подраздел"), icon: args[1] ? unquote(args[1]) : "📦" };
            default: return null;
          }
        })();
        if (item) tab.elements.push({ id: uid(), ...item });
      }
    }

    if (tabs.length) {
      next.tabs = tabs.map((t) => t.tab);
      next.activeTabId = next.tabs[0].id;
    }

    return { state: next, errors };
  }

  /* разбивает "a, b, {x = 1, y = 2}" по запятым верхнего уровня */
  function splitArgs(raw) {
    const out = [];
    if (!raw) return out;
    let depth = 0, cur = "", inStr = false, esc = false;
    for (const ch of raw) {
      if (esc) { cur += ch; esc = false; continue; }
      if (ch === "\\") { cur += ch; esc = true; continue; }
      if (ch === '"') { inStr = !inStr; cur += ch; continue; }
      if (!inStr) {
        if (ch === "{" || ch === "(" || ch === "[") depth++;
        if (ch === "}" || ch === ")" || ch === "]") depth--;
        if (ch === "," && depth === 0) { out.push(cur.trim()); cur = ""; continue; }
      }
      cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }

  /* ═══════════════════════════════════════════════
     МОДАЛКА
     ═══════════════════════════════════════════════ */
  function openImport() {
    const modal = $("#modal");
    const textarea = $("#modal-textarea");
    modal.querySelector(".props-form")?.remove();
    textarea.hidden = false;
    $("#modal-title").textContent = "Импорт Lua";
    $("#modal-hint").textContent = "Вставь код, сгенерированный этим редактором — окно, вкладки и элементы восстановятся.";
    textarea.value = "";
    textarea.placeholder = 'local BeautifulUI = loadstring(...)()\n\nlocal Window = BeautifulUI:CreateWindow({...})\nlocal Tab = Window:Tab("Главная", "🏠")\nTab:Button("Кнопка", function() end, "Gradient")';
    const ok = $("#modal-ok");
    ok.textContent = "Импортировать";
    $("#modal-cancel").textContent = "Отмена";

    const close = () => { modal.hidden = true; ok.onclick = null; };
    ok.onclick = () => {
      const src = textarea.value.trim();
      if (!src) return toast("Вставь код");
      const { state: parsed, errors } = importLua(src);
      state = parsed;
      close();
      renderAll();
      save();
      toast(errors.length ? `Импортировано, но: ${errors[0]}` : "Импортировано ✅");
    };
    $("#modal-close").onclick = close;
    $("#modal-cancel").onclick = close;
    modal.hidden = false;
    textarea.focus();
  }

  function openCodePreview() {
    const modal = $("#modal");
    const textarea = $("#modal-textarea");
    modal.querySelector(".props-form")?.remove();
    textarea.hidden = false;
    $("#modal-title").textContent = "Предпросмотр Lua";
    $("#modal-hint").textContent = "Это именно то, что нужно вставить в Roblox.";
    textarea.value = renderCode();
    const ok = $("#modal-ok");
    ok.textContent = "Скопировать";
    const close = () => { modal.hidden = true; ok.onclick = null; };
    ok.onclick = async () => {
      const done = await copyText(textarea.value);
      toast(done ? "Скопировано ✅" : "Не удалось скопировать — выдели текст и Ctrl+C");
    };
    $("#modal-close").onclick = close;
    $("#modal-cancel").onclick = close;
    modal.hidden = false;
  }

  /* ═══════════════════════════════════════════════
     СОБЫТИЯ ПАНЕЛИ
     ═══════════════════════════════════════════════ */
  function bindPanel() {
    // важно: state.window читаем в момент события — импорт заменяет state целиком
    const W = () => state.window;
    const bindText = (sel, key, after) => {
      const node = $(sel);
      node.value = W()[key] ?? "";
      node.oninput = () => { W()[key] = node.value; (after || renderPreviewWindow)(); renderCode(); save(); };
    };
    bindText("#win-title", "title");
    bindText("#win-subtitle", "subtitle");
    bindText("#win-icon", "icon");
    bindText("#win-discord-invite", "discordInvite");
    bindText("#win-lib-url", "libUrl");
    bindText("#win-font", "font", () => { applyPreviewFont(); renderPreviewWindow(); });
    bindText("#win-font-scale", "fontScale", applyPreviewFont);
    $("#win-fontpicker").onchange = (e) => {
      W().fontPicker = e.target.value === "1";
      renderCode(); save();
    };

    const themeSel = $("#win-theme");
    themeSel.onchange = () => {
      W().theme = themeSel.value;
      state.colors = {};
      renderPalette(); applyPreviewTheme(); renderPreviewElements(); renderCode(); save();
    };

    $("#win-w").value = W().width;
    $("#win-h").value = W().height;
    $("#win-w").oninput = (e) => { W().width = Math.max(280, Number(e.target.value) || 780); applyPreviewTheme(); renderPreviewWindow(); renderCode(); save(); };
    $("#win-h").oninput = (e) => { W().height = Math.max(220, Number(e.target.value) || 580); applyPreviewTheme(); renderPreviewWindow(); renderCode(); save(); };

    const bindCheck = (sel, key, after) => {
      const node = $(sel);
      node.checked = !!W()[key];
      node.onchange = () => { W()[key] = node.checked; (after || renderPreviewWindow)(); renderCode(); save(); };
    };
    bindCheck("#win-config", "showConfig");
    bindCheck("#win-backdrop", "backdrop");
    bindCheck("#win-compact", "compact", () => { renderPreviewWindow(); state.device = W().compact ? "mobile" : "desktop"; syncDeviceButtons(); renderPreviewWindow(); });
    bindCheck("#win-discord", "discord", () => {
      $("#discord-field").hidden = !W().discord;
      renderPreviewWindow(); renderCode();
    });
    $("#discord-field").hidden = !W().discord;

    $("#btn-reset-theme").onclick = () => {
      state.colors = {};
      renderPalette(); applyPreviewTheme(); renderPreviewElements(); renderCode(); save();
      toast("Цвета темы восстановлены");
    };

    $("#btn-add-tab").onclick = () => {
      const name = prompt("Название вкладки:", `Вкладка ${state.tabs.length + 1}`);
      if (name == null) return;
      const tab = { id: uid(), name: name || "Вкладка", icon: "📄", badge: 0, elements: [] };
      state.tabs.push(tab);
      state.activeTabId = tab.id;
      renderAll(); save();
    };

    $("#btn-copy").onclick = async () => {
      const code = renderCode();
      const ok = await copyText(code);
      toast(ok ? "Lua-код скопирован ✅" : "Буфер обмена недоступен — скачай файл");
    };

    $("#btn-download").onclick = () => {
      const code = renderCode();
      const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${(state.window.title || "hub").replace(/[^\wа-яА-Я\- ]/g, "").trim() || "hub"}.lua`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast("Файл .lua скачан");
    };

    $("#btn-refresh-code").onclick = () => { renderCode(); toast("Код обновлён"); };
    $("#btn-import").onclick = openImport;
    $("#btn-preview-code").onclick = openCodePreview;

    $("#devices" )?.addEventListener?.("click", () => {});
    document.querySelectorAll("[data-device]").forEach((b) => {
      b.onclick = () => {
        state.device = b.dataset.device;
        syncDeviceButtons();
        renderPreviewWindow();
        save();
      };
    });

    document.querySelectorAll("[data-app-theme]").forEach((b) => {
      b.onclick = () => {
        state.appTheme = b.dataset.appTheme;
        document.body.classList.toggle("light", state.appTheme === "light");
        syncAppThemeButtons();
        save();
      };
    });

    $("#show-grid").onchange = (e) => {
      state.showGrid = e.target.checked;
      $("#stage").classList.toggle("with-grid", state.showGrid);
      save();
    };

    $("#btn-reset-layout").onclick = () => {
      state.window.width = 780;
      state.window.height = 580;
      state.window.compact = false;
      state.device = "desktop";
      $("#win-w").value = 780;
      $("#win-h").value = 580;
      $("#win-compact").checked = false;
      syncDeviceButtons();
      applyPreviewTheme(); renderPreviewWindow(); renderCode(); save();
      toast("Раскладка сброшена");
    };

    $("#btn-clear").onclick = () => {
      if (!confirm("Удалить все вкладки и элементы?")) return;
      const fresh = defaultState();
      state.tabs = fresh.tabs;
      state.activeTabId = state.tabs[0].id;
      state.activeElementId = null;
      state.colors = {};
      renderAll(); save();
      toast("Всё очищено");
    };
  }

  function syncDeviceButtons() {
    document.querySelectorAll("[data-device]").forEach((b) => {
      b.classList.toggle("active", b.dataset.device === state.device);
    });
  }
  function syncAppThemeButtons() {
    document.querySelectorAll("[data-app-theme]").forEach((b) => {
      b.classList.toggle("active", b.dataset.appTheme === state.appTheme);
    });
  }

  /* ═══════════════════════════════════════════════
     СБОРКА
     ═══════════════════════════════════════════════ */
  /* ═══════════ РЕЖИМЫ ═══════════ */
  function applyView() {
    const scen = state.view === "scen";
    const uiView = $("#ui-view");
    const scenView = $("#scen-view");
    if (!uiView || !scenView) return;
    uiView.hidden = scen;
    scenView.hidden = !scen;
    document.querySelectorAll("[data-view]").forEach((b) => {
      b.classList.toggle("active", b.dataset.view === state.view);
    });
    if (scen) renderScenarios();
    else renderCode();
  }

  function renderScenarios() {
    if (!window.Scenarios) return;
    const host = $("#scen-host");
    if (!host) return;
    window.Scenarios.render(host);
    renderScenariosSidebar();
    renderScenarioCode();
  }

  function renderScenariosSidebar() {
    const list = $("#scen-list");
    const sum = $("#scen-summary");
    if (!list) return;
    list.innerHTML = "";
    const scenarios = state.scenarios || [];
    for (const sc of scenarios) {
      const row = el("div", "tab-row" + (sc.id === state.activeScenarioId ? " active" : ""));
      const on = sc.enabled !== false;
      row.append(el("span", "ico", on ? "▶" : "⏸"), el("span", "nm", sc.name));
      const acts = el("div", "row-actions");
      const go = el("button", null, "✎");
      go.title = "Открыть";
      go.onclick = (e) => {
        e.stopPropagation();
        state.activeScenarioId = sc.id;
        renderScenarios();
        save();
      };
      const del = el("button", null, "✕");
      del.title = "Удалить";
      del.onclick = (e) => {
        e.stopPropagation();
        if (scenarios.length === 1) return toast("Нужен хотя бы один сценарий");
        state.scenarios = scenarios.filter((x) => x.id !== sc.id);
        if (state.activeScenarioId === sc.id) state.activeScenarioId = state.scenarios[0].id;
        renderScenarios();
        save();
      };
      acts.append(go, del);
      row.append(acts);
      row.onclick = () => { state.activeScenarioId = sc.id; renderScenarios(); save(); };
      list.appendChild(row);
    }
    if (sum && window.Scenarios) {
      const info = window.Scenarios.summary();
      sum.textContent = `${info.scenarios} сценар. · ${info.nodes} блоков · ${info.links} связей`;
    }
  }

  function renderScenarioCode() {
    const out = $("#scen-code");
    const stats = $("#scen-stats");
    if (!out || !window.Scenarios) return;
    let code = "";
    try {
      code = window.Scenarios.generateLua() || "-- пока нет блоков: добавьте событие и действие";
    } catch (err) {
      code = "-- ошибка: " + err.message;
    }
    /* подсветка уже реализована для общего кода — переиспользуем */
    out.innerHTML = window.__highlightLua ? window.__highlightLua(code) : code;
    if (stats) stats.textContent = `${code.split("\n").length} строк`;
  }

  window.__renderScenarios = renderScenarios;
  window.__renderScenarioCode = renderScenarioCode;
  window.__renderScenarioSidebar = renderScenariosSidebar;

  function renderAll() {
    renderThemeSelect();
    $("#win-title").value = state.window.title;
    $("#win-subtitle").value = state.window.subtitle;
    $("#win-icon").value = state.window.icon;
    $("#win-w").value = state.window.width;
    $("#win-h").value = state.window.height;
    $("#win-config").checked = !!state.window.showConfig;
    $("#win-backdrop").checked = !!state.window.backdrop;
    $("#win-discord").checked = !!state.window.discord;
    $("#win-compact").checked = !!state.window.compact;
    $("#win-discord-invite").value = state.window.discordInvite || "";
    $("#win-lib-url").value = state.window.libUrl || "";
    $("#win-font").value = state.window.font || "";
    $("#win-font-scale").value = state.window.fontScale || 100;
    $("#win-fontpicker").value = state.window.fontPicker ? "1" : "0";
    $("#discord-field").hidden = !state.window.discord;
    document.body.classList.toggle("light", state.appTheme === "light");
    $("#stage").classList.toggle("with-grid", !!state.showGrid);
    $("#show-grid").checked = !!state.showGrid;
    syncDeviceButtons();
    syncAppThemeButtons();

    renderPalette();
    applyPreviewTheme();
    applyPreviewFont();
    renderTabList();
    renderAddGrid();
    renderElementList();
    renderPreviewTabs();
    renderPreviewElements();
    renderPreviewWindow();
    renderCode();
  }

  function init() {
    load();
    if (window.Scenarios && window.Scenarios.api) {
      window.Scenarios.api({
        getState: () => state,
        save,
        toast,
        luaStr,
        varForTab,
        el,
      });
    }
    bindPanel();
    bindPreviewSearch();
    document.querySelectorAll("[data-view]").forEach((b) => {
      b.onclick = () => { state.view = b.dataset.view; applyView(); save(); };
    });
    const scenCopy = $("#scen-copy");
    if (scenCopy) {
      scenCopy.onclick = async () => {
        const code = window.Scenarios ? window.Scenarios.generateLua() || "" : "";
        const ok = await copyText(code || "# нет сценариев");
        toast(ok ? "Код сценариев скопирован ✅" : "Скопируйте вручную");
      };
    }
    applyView();
    renderFontPresets();
    renderAll();
    if (!store.get(LS_KEY)) {
      seedDemo();
      renderAll();
    }
  }

  /* демо-содержимое при первом запуске — чтобы сразу было видно, как красиво */
  function seedDemo() {
    const tab = state.tabs[0];
    tab.name = "Главная";
    tab.icon = "🏠";
    tab.elements = [
      { id: uid(), type: "label", text: "Быстрый старт" },
      { id: uid(), type: "paragraph", text: "Собери интерфейс мышкой: добавляй элементы, меняй тему и цвета, затем скопируй готовый Lua." },
      { id: uid(), type: "button", text: "Начать", style: "Gradient", icon: "🚀" },
      { id: uid(), type: "toggle", text: "Автофарм", default: true, flag: "AutoFarm" },
      { id: uid(), type: "slider", text: "Скорость", min: 16, max: 120, default: 48, step: 4, suffix: "studs/s", flag: "Speed" },
      { id: uid(), type: "dropdown", text: "Режим", options: "Тихий, Обычный, Агрессивный", multi: false, flag: "Mode" },
      { id: uid(), type: "status", text: "Статус", value: "Готово", kind: "Success" },
      { id: uid(), type: "hint", text: "Ctrl+K в самой библиотеке открывает палитру команд." },
    ];
    const tab2 = { id: uid(), name: "Настройки", icon: "⚙", badge: 2, elements: [
      { id: uid(), type: "toggle", text: "Показывать HUD", default: true, flag: "HUD" },
      { id: uid(), type: "colorpicker", text: "Цвет акцента", color: "#00FFDC", flag: "AccentColor" },
      { id: uid(), type: "keybind", text: "Меню", key: "RightShift", flag: "MenuKey" },
      { id: uid(), type: "separator" },
      { id: uid(), type: "graph", text: "FPS", graphType: "area", height: 160 },
    ]};
    state.tabs.push(tab2);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
