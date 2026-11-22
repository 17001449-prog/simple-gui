/* ═══════════════════════════════════════════════════════════════
   BeautifulUI · Сценарный редактор
   Ноды + связи линиями + свой Lua в каждом блоке.
   Подключается как <script src="scenarios.js"> после app.js.
   Общается с редактором через window.Scenarios:
     Scenarios.api({ getState, save, toast, luaStr, varForTab })
     Scenarios.render(container)      — отрисовать
     Scenarios.generateLua()          — вставить блок сценариев в код
     Scenarios.summary()              — короткая сводка для UI
   ═══════════════════════════════════════════════════════════════ */
(() => {
  "use strict";

  let API = null;
  let root = null;          // контейнер сцены
  let svgLayer = null;      // слой линий
  let nodesLayer = null;    // слой нод
  let dragging = null;      // { node, dx, dy }
  let connecting = null;    // { from, temp }

  /* ─────────────── типы нод ─────────────── */
  const NODE_TYPES = {
    event: {
      icon: "⚡", label: "Событие", color: "#f0b232", width: 190, maxIn: 0,
      params: [
        { key: "source", label: "Источник", kind: "element" },
        { key: "signal", label: "Сигнал", kind: "select", options: ["Clicked", "Changed", "Submitted", "Toggled", "KeyPressed"] },
        { key: "code", label: "Свой код (Lua)", kind: "code" },
      ],
    },
    action: {
      icon: "🎬", label: "Действие", color: "#22c55e", width: 190, maxIn: 1,
      params: [
        { key: "kind", label: "Действие", kind: "select", options: ["Notify", "Toast", "Toggle", "Set", "Run", "Custom"] },
        { key: "target", label: "Цель", kind: "element" },
        { key: "value", label: "Значение", kind: "text" },
        { key: "code", label: "Свой код (Lua)", kind: "code" },
      ],
    },
    condition: {
      icon: "❓", label: "Условие", color: "#8b5cf6", width: 210, maxIn: 1,
      params: [
        { key: "expression", label: "Условие (Lua)", kind: "code", placeholder: "value == true" },
        { key: "branch", label: "Ветка", kind: "select", options: ["если да", "если нет"] },
      ],
    },
    delay: {
      icon: "⏱", label: "Пауза", color: "#38bdf8", width: 160, maxIn: 1,
      params: [{ key: "seconds", label: "Секунд", kind: "number", placeholder: "0.5" }],
    },
    custom: {
      icon: "𝒇", label: "Код", color: "#f472b6", width: 230, maxIn: 1,
      params: [{ key: "code", label: "Lua-код", kind: "code-big" }],
    },
  };

  const SIGNAL_LUA = {
    Clicked: "MouseButton1Click",
    Changed: "Changed",
    Submitted: "FocusLost",
    Toggled: "Changed",
    KeyPressed: "InputBegan",
  };

  const uid = () => Math.random().toString(36).slice(2, 9);

  /* ─────────────── состояние ─────────────── */
  function saveSync() {
    API.save();
    sync();
  }

  function sync() {
    try { window.__renderScenarioCode && window.__renderScenarioCode(); } catch (_) {}
    try { window.__renderScenarioSidebar && window.__renderScenarioSidebar(); } catch (_) {}
  }

  function st() {
    const s = API.getState();
    if (!Array.isArray(s.scenarios)) s.scenarios = [];
    if (!s.activeScenarioId || !s.scenarios.find((x) => x.id === s.activeScenarioId)) {
      s.activeScenarioId = s.scenarios[0]?.id || null;
    }
    return s;
  }

  function activeScenario(createIfMissing = true) {
    const s = st();
    let sc = s.scenarios.find((x) => x.id === s.activeScenarioId);
    if (!sc && createIfMissing) {
      sc = { id: uid(), name: "Сценарий " + (s.scenarios.length + 1), nodes: [], links: [], enabled: true };
      s.scenarios.push(sc);
      s.activeScenarioId = sc.id;
    }
    return sc;
  }

  /* ─────────────── список целей (элементы из UI) ─────────────── */
  function elementTargets() {
    const s = API.getState();
    const out = [];
    for (const tab of s.tabs || []) {
      for (const el of tab.elements || []) {
        if (!["button", "toggle", "slider", "dropdown", "input", "colorpicker", "keybind", "progress", "graph", "label"].includes(el.type)) continue;
        if (!el.flag && !el.text) continue;
        out.push({
          id: el.id,
          tabId: tab.id,
          name: el.text || el.type,
          type: el.type,
          tab: tab.name,
          flag: el.flag || "",
        });
      }
    }
    return out;
  }

  function targetLabel(t) {
    if (!t) return "—";
    return `${t.type}: ${t.name}${t.flag ? " [" + t.flag + "]" : ""} (${t.tab})`;
  }

  /* ─────────────── отрисовка ─────────────── */
  function render(container) {
    root = container;
    const s = st();
    const sc = activeScenario();

    container.innerHTML = "";
    container.className = "sc-stage";

    // панель сверху: выбор сценария
    const bar = document.createElement("div");
    bar.className = "sc-bar";
    const sel = document.createElement("select");
    sel.className = "sc-select";
    for (const item of s.scenarios) {
      const o = document.createElement("option");
      o.value = item.id;
      o.textContent = `${item.enabled === false ? "⏸ " : "▶ "}${item.name}`;
      if (item.id === sc.id) o.selected = true;
      sel.appendChild(o);
    }
    sel.onchange = () => { st().activeScenarioId = sel.value; render(container); };

    const nameInput = document.createElement("input");
    nameInput.className = "sc-name";
    nameInput.value = sc.name;
    nameInput.placeholder = "Имя сценария";
    nameInput.oninput = () => { sc.name = nameInput.value || "Сценарий"; saveSync(); };

    const addBtn = (label, title, fn, cls = "") => {
      const b = document.createElement("button");
      b.className = "btn ghost small " + cls;
      b.textContent = label;
      b.title = title;
      b.onclick = fn;
      return b;
    };

    bar.append(
      sel,
      nameInput,
      addBtn("+ Сценарий", "Новый сценарий", () => {
        const fresh = { id: uid(), name: "Сценарий " + (s.scenarios.length + 1), nodes: [], links: [], enabled: true };
        s.scenarios.push(fresh);
        s.activeScenarioId = fresh.id;
        saveSync(); render(container);
      }),
      addBtn("⧉", "Дублировать сценарий", () => {
        const copy = JSON.parse(JSON.stringify(sc));
        copy.id = uid();
        copy.name = sc.name + " (копия)";
        const map = {};
        copy.nodes.forEach((n) => { const old = n.id; n.id = uid(); map[old] = n.id; n.x += 30; n.y += 30; });
        copy.links = copy.links.map((l) => ({ id: uid(), from: map[l.from], to: map[l.to] }));
        s.scenarios.push(copy);
        s.activeScenarioId = copy.id;
        saveSync(); render(container);
      }),
      addBtn("🗑", "Удалить сценарий", () => {
        if (s.scenarios.length === 1) return API.toast("Нужен хотя бы один сценарий");
        s.scenarios = s.scenarios.filter((x) => x.id !== sc.id);
        s.activeScenarioId = s.scenarios[0].id;
        saveSync(); render(container);
      }),
      addBtn(sc.enabled === false ? "▶ Включить" : "⏸ Выключить", "Сценарий попадает в код только если включён", () => {
        sc.enabled = sc.enabled === false;
        saveSync(); render(container);
      }),
      addBtn("✨ Пример", "Собрать демо-сценарий (кнопка → уведомление)", () => {
        demo(sc);
        saveSync(); render(container);
      })
    );

    // палитра добавления нод
    const palette = document.createElement("div");
    palette.className = "sc-palette";
    const palLabel = document.createElement("span");
    palLabel.className = "sc-palette-label";
    palLabel.textContent = "Блоки:";
    palette.appendChild(palLabel);
    for (const [type, meta] of Object.entries(NODE_TYPES)) {
      const b = document.createElement("button");
      b.className = "sc-add";
      b.innerHTML = `<b>${meta.icon}</b> ${meta.label}`;
      b.style.setProperty("--node-color", meta.color);
      b.onclick = () => {
        const n = {
          id: uid(), type,
          x: 60 + (sc.nodes.length % 5) * 40,
          y: 60 + (sc.nodes.length % 7) * 34,
          title: meta.label,
          params: {},
        };
        sc.nodes.push(n);
        saveSync(); render(container);
      };
      palette.appendChild(b);
    }

    // сцена
    const canvas = document.createElement("div");
    canvas.className = "sc-canvas";
    svgLayer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgLayer.setAttribute("class", "sc-links");
    nodesLayer = document.createElement("div");
    nodesLayer.className = "sc-nodes";

    canvas.append(svgLayer, nodesLayer);

    // пустое состояние
    if (!sc.nodes.length) {
      const hint = document.createElement("div");
      hint.className = "sc-empty";
      hint.innerHTML = "<b>Пусто</b><br>Добавьте блоки сверху или нажмите «✨ Пример».<br>Соединяйте блоки — тяните от точки справа к точке слева.";
      canvas.appendChild(hint);
    }

    container.append(bar, palette, canvas);

    // ноды
    for (const node of sc.nodes) nodesLayer.appendChild(buildNode(node, sc));

    // инспектор
    const inspector = document.createElement("div");
    inspector.className = "sc-inspector";
    container.appendChild(inspector);
    renderInspector(inspector, sc);

    drawLinks(sc);
    bindCanvasPan(canvas, sc);
  }

  /* ─────────────── нода ─────────────── */
  function buildNode(node, sc) {
    const meta = NODE_TYPES[node.type] || NODE_TYPES.action;
    const el = document.createElement("div");
    el.className = "sc-node" + (node.params && node.params.code ? " has-code" : "");
    el.dataset.id = node.id;
    el.style.left = node.x + "px";
    el.style.top = node.y + "px";
    el.style.width = meta.width + "px";
    el.style.setProperty("--node-color", meta.color);

    const head = document.createElement("div");
    head.className = "sc-node-head";
    const badge = document.createElement("span");
    badge.className = "sc-node-icon";
    badge.textContent = meta.icon;
    const title = document.createElement("span");
    title.className = "sc-node-title";
    title.textContent = node.title || meta.label;
    const del = document.createElement("button");
    del.className = "sc-node-del";
    del.textContent = "✕";
    del.title = "Удалить блок";
    del.onpointerdown = (e) => e.stopPropagation();
    del.onclick = (e) => {
      e.stopPropagation();
      sc.links = sc.links.filter((l) => l.from !== node.id && l.to !== node.id);
      sc.nodes = sc.nodes.filter((n) => n.id !== node.id);
      if (sc.selectedId === node.id) sc.selectedId = null;
      saveSync(); render(root);
    };
    head.append(badge, title, del);

    const body = document.createElement("div");
    body.className = "sc-node-body";
    body.textContent = summaryOf(node);

    el.append(head, body);

    // порты
    if (meta.maxIn !== 0) {
      const inPort = document.createElement("div");
      inPort.className = "sc-port sc-port-in";
      inPort.dataset.node = node.id;
      inPort.dataset.dir = "in";
      el.appendChild(inPort);
    }
    const outPort = document.createElement("div");
    outPort.className = "sc-port sc-port-out";
    outPort.dataset.node = node.id;
    outPort.dataset.dir = "out";
    el.appendChild(outPort);

    // выделение
    if (sc.selectedId === node.id) el.classList.add("selected");
    el.onpointerdown = (e) => {
      if (e.target.classList.contains("sc-port") || e.target.classList.contains("sc-node-del")) return;
      e.stopPropagation();
      sc.selectedId = node.id;
      nodesLayer.querySelectorAll(".sc-node").forEach((n) => n.classList.remove("selected"));
      el.classList.add("selected");
      renderInspector(root.querySelector(".sc-inspector"), sc);
      dragging = { node, startX: e.clientX, startY: e.clientY, origX: node.x, origY: node.y, moved: false };
      el.setPointerCapture(e.pointerId);
    };
    el.onpointermove = (e) => {
      if (!dragging || dragging.node !== node) return;
      const dx = e.clientX - dragging.startX;
      const dy = e.clientY - dragging.startY;
      if (Math.abs(dx) + Math.abs(dy) > 3) dragging.moved = true;
      node.x = Math.max(0, dragging.origX + dx);
      node.y = Math.max(0, dragging.origY + dy);
      el.style.left = node.x + "px";
      el.style.top = node.y + "px";
      drawLinks(sc);
    };
    el.onpointerup = (e) => {
      if (dragging && dragging.node === node) {
        if (dragging.moved) saveSync();
        dragging = null;
        el.releasePointerCapture?.(e.pointerId);
      }
    };

    // соединение от выходного порта
    outPort.onpointerdown = (e) => {
      e.stopPropagation();
      e.preventDefault();
      connecting = { from: node.id, x: e.clientX, y: e.clientY };
      svgLayer.classList.add("connecting");
      const move = (ev) => {
        if (!connecting) return;
        connecting.x = ev.clientX;
        connecting.y = ev.clientY;
        drawLinks(sc, true);
      };
      const up = (ev) => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        svgLayer.classList.remove("connecting");
        const target = document.elementFromPoint(ev.clientX, ev.clientY);
        const port = target?.closest?.(".sc-port-in");
        if (port) connect(sc, node.id, port.dataset.node);
        connecting = null;
        drawLinks(sc);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    };

    // клик по входному порту: удалить входящую связь
    const inPort = el.querySelector(".sc-port-in");
    if (inPort) {
      inPort.onclick = (e) => {
        e.stopPropagation();
        const before = sc.links.length;
        sc.links = sc.links.filter((l) => l.to !== node.id);
        if (sc.links.length !== before) { saveSync(); drawLinks(sc); }
        else API.toast("У этого блока нет входящих связей");
      };
    }

    return el;
  }

  function connect(sc, fromId, toId) {
    if (!fromId || !toId || fromId === toId) return;
    const target = sc.nodes.find((n) => n.id === toId);
    const meta = NODE_TYPES[target?.type] || {};
    if (meta.maxIn === 0) { API.toast("У «события» нет входа — от него только выходят связи"); return; }
    if (meta.maxIn === 1) sc.links = sc.links.filter((l) => l.to !== toId);
    const exists = sc.links.some((l) => l.from === fromId && l.to === toId);
    if (exists) { API.toast("Такая связь уже есть"); return; }
    sc.links.push({ id: uid(), from: fromId, to: toId });
    saveSync();
    drawLinks(sc);
    renderInspector(root.querySelector(".sc-inspector"), sc);
  }

  /* ─────────────── линии ─────────────── */
  function portPos(node, dir) {
    const el = nodesLayer.querySelector(`.sc-node[data-id="${node.id}"]`);
    if (!el) return null;
    const base = nodesLayer.getBoundingClientRect();
    const port = el.querySelector(".sc-port-" + dir);
    if (!port) return null;
    const r = port.getBoundingClientRect();
    return { x: r.left - base.left + r.width / 2, y: r.top - base.top + r.height / 2 };
  }

  function drawLinks(sc, withTemp) {
    if (!svgLayer || !nodesLayer) return;
    const nodes = nodesLayer.querySelectorAll(".sc-node");
    const w = nodesLayer.scrollWidth || nodesLayer.clientWidth;
    const h = nodesLayer.scrollHeight || nodesLayer.clientHeight;
    svgLayer.setAttribute("viewBox", `0 0 ${Math.max(w, 600)} ${Math.max(h, 400)}`);
    svgLayer.setAttribute("width", Math.max(w, 600));
    svgLayer.setAttribute("height", Math.max(h, 400));
    svgLayer.innerHTML = "";

    const NS = "http://www.w3.org/2000/svg";
    const mk = (tag, attrs) => {
      const n = document.createElementNS(NS, tag);
      for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
      return n;
    };

    const curve = (a, b) => {
      const dx = Math.max(40, Math.abs(b.x - a.x) * 0.5);
      return `M${a.x},${a.y} C${a.x + dx},${a.y} ${b.x - dx},${b.y} ${b.x},${b.y}`;
    };

    for (const link of sc.links) {
      const a = sc.nodes.find((n) => n.id === link.from);
      const b = sc.nodes.find((n) => n.id === link.to);
      if (!a || !b) continue;
      const pa = portPos(a, "out");
      const pb = portPos(b, "in");
      if (!pa || !pb) continue;
      const color = (NODE_TYPES[a.type] || {}).color || "#8b5cf6";
      svgLayer.appendChild(mk("path", {
        d: curve(pa, pb), class: "sc-link",
        stroke: color, "stroke-width": "2.5", fill: "none",
      }));
      // точка на середине (клик — удалить связь)
      const mid = { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 };
      const dot = mk("circle", { cx: mid.x, cy: mid.y, r: "7", class: "sc-link-dot", fill: color });
      dot.style.cursor = "pointer";
      dot.onclick = (e) => {
        e.stopPropagation();
        sc.links = sc.links.filter((l) => l.id !== link.id);
        saveSync(); drawLinks(sc);
      };
      const tip = mk("title", {});
      tip.textContent = "Клик — удалить связь";
      dot.appendChild(tip);
      svgLayer.appendChild(dot);
    }

    // временная линия при перетаскивании
    if (connecting && connecting.from) {
      const fromNode = sc.nodes.find((n) => n.id === connecting.from);
      const pa = fromNode && portPos(fromNode, "out");
      if (pa) {
        const base = nodesLayer.getBoundingClientRect();
        const pb = { x: connecting.x - base.left, y: connecting.y - base.top };
        svgLayer.appendChild(mk("path", {
          d: curve(pa, pb), class: "sc-link sc-link-temp",
          stroke: "#fff", "stroke-width": "2", "stroke-dasharray": "6 5", fill: "none",
        }));
      }
    }
  }

  /* ─────────────── инспектор ─────────────── */
  function summaryOf(node) {
    const p = node.params || {};
    switch (node.type) {
      case "event": return `${p.sourceName || "элемент"} · ${p.signal || "Clicked"}`;
      case "action": return `${p.kind || "Notify"}${p.targetName ? " → " + p.targetName : ""}`;
      case "condition": return p.expression || "(условие)";
      case "delay": return `${p.seconds || 0.5} c`;
      case "custom": return p.code ? firstLine(p.code) : "(пустой код)";
      default: return "";
    }
  }

  const firstLine = (s) => String(s).split("\n")[0].slice(0, 46);

  function renderInspector(box, sc) {
    if (!box) return;
    box.innerHTML = "";
    const node = sc.nodes.find((n) => n.id === sc.selectedId);
    if (!node) {
      box.innerHTML = `<div class="sc-insp-empty">Выберите блок на холсте, чтобы настроить его.<br>
        <span>Связи: ${sc.links.length} · блоков: ${sc.nodes.length}</span></div>`;
      return;
    }
    const meta = NODE_TYPES[node.type] || {};
    const head = document.createElement("div");
    head.className = "sc-insp-head";
    head.style.setProperty("--node-color", meta.color);
    head.innerHTML = `<b>${meta.icon || ""} ${meta.label || node.type}</b>`;
    box.appendChild(head);

    for (const param of meta.params || []) {
      const row = document.createElement("label");
      row.className = "sc-field";
      const lbl = document.createElement("span");
      lbl.textContent = param.label;
      row.appendChild(lbl);

      let input;
      if (param.kind === "element") {
        input = document.createElement("select");
        const none = document.createElement("option");
        none.value = "";
        none.textContent = "— не выбрано —";
        input.appendChild(none);
        for (const t of elementTargets()) {
          const o = document.createElement("option");
          o.value = t.id;
          o.textContent = targetLabel(t);
          if (node.params[param.key] === t.id) o.selected = true;
          input.appendChild(o);
        }
        input.onchange = () => {
          node.params[param.key] = input.value;
          const t = elementTargets().find((x) => x.id === input.value);
          node.params[param.key.replace("source", "sourceName").replace("target", "targetName")] = t ? (t.flag ? t.flag : t.name) : "";
          refresh();
        };
      } else if (param.kind === "select") {
        input = document.createElement("select");
        for (const opt of param.options) {
          const o = document.createElement("option");
          o.value = opt;
          o.textContent = opt;
          if ((node.params[param.key] || param.options[0]) === opt) o.selected = true;
          input.appendChild(o);
        }
        input.onchange = () => { node.params[param.key] = input.value; refresh(); };
      } else if (param.kind === "number") {
        input = document.createElement("input");
        input.type = "number";
        input.step = "0.1";
        input.value = node.params[param.key] ?? "";
        input.placeholder = param.placeholder || "";
        input.oninput = () => { node.params[param.key] = input.value; refresh(); };
      } else if (param.kind === "code" || param.kind === "code-big") {
        input = document.createElement("textarea");
        input.className = "sc-code";
        if (param.kind === "code-big") input.rows = 8;
        else input.rows = 3;
        input.spellcheck = false;
        input.placeholder = param.placeholder || "-- Lua: value доступен как переменная";
        input.value = node.params[param.key] || "";
        input.oninput = () => {
          node.params[param.key] = input.value;
          saveSync();
          const n = nodesLayer?.querySelector(`.sc-node[data-id="${node.id}"] .sc-node-body`);
          if (n) n.textContent = summaryOf(node);
        };
      } else {
        input = document.createElement("input");
        input.type = "text";
        input.value = node.params[param.key] ?? "";
        input.placeholder = param.placeholder || "";
        input.oninput = () => { node.params[param.key] = input.value; refresh(); };
      }
      row.appendChild(input);
      box.appendChild(row);
    }

    const actions = document.createElement("div");
    actions.className = "sc-insp-actions";
    const dup = document.createElement("button");
    dup.className = "btn ghost small";
    dup.textContent = "⧉ Дублировать";
    dup.onclick = () => {
      const copy = JSON.parse(JSON.stringify(node));
      copy.id = uid();
      copy.x += 26; copy.y += 26;
      sc.nodes.push(copy);
      sc.selectedId = copy.id;
      saveSync(); render(root);
    };
    actions.appendChild(dup);
    box.appendChild(actions);

    function refresh() {
      saveSync();
      const body = nodesLayer?.querySelector(`.sc-node[data-id="${node.id}"] .sc-node-body`);
      if (body) body.textContent = summaryOf(node);
    }
  }

  /* ─────────────── холст: пан/зум ─────────────── */
  function bindCanvasPan(canvas, sc) {
    canvas.onclick = (e) => {
      if (e.target === canvas || e.target === nodesLayer) {
        sc.selectedId = null;
        nodesLayer.querySelectorAll(".sc-node").forEach((n) => n.classList.remove("selected"));
        renderInspector(root.querySelector(".sc-inspector"), sc);
      }
    };
    canvas.onwheel = (e) => {
      if (e.ctrlKey || e.metaKey) e.preventDefault();
    };
  }

  /* ─────────────── демо-сценарий ─────────────── */
  function demo(sc) {
    const targets = elementTargets();
    const btn = targets.find((t) => t.type === "button") || targets[0];
    const toggle = targets.find((t) => t.type === "toggle");
    sc.nodes = [];
    sc.links = [];
    const evt = {
      id: uid(), type: "event", x: 40, y: 60, title: "Кнопка нажата",
      params: { source: btn?.id || "", sourceName: btn?.flag || "кнопка", signal: "Clicked" },
    };
    const act = {
      id: uid(), type: "action", x: 300, y: 40, title: "Уведомление",
      params: {
        kind: "Notify", target: toggle?.id || "", targetName: toggle?.flag || "",
        value: "Привет из сценария!", code: "",
      },
    };
    const custom = {
      id: uid(), type: "custom", x: 300, y: 190, title: "Свой код",
      params: { code: 'print("сработало:", value)' },
    };
    sc.nodes.push(evt, act, custom);
    sc.links.push({ id: uid(), from: evt.id, to: act.id }, { id: uid(), from: evt.id, to: custom.id });
    sc.selectedId = act.id;
  }

  /* ─────────────── генерация Lua ─────────────── */
  function generateLua() {
    const s = API.getState();
    const scenarios = (s.scenarios || []).filter((x) => x.enabled !== false && x.nodes && x.nodes.length);
    if (!scenarios.length) return null;

    const L = [];
    const push = (line = "") => L.push(line);
    const luaStr = API.luaStr;

    push("-- ═══════════════════════════════════════════════════════");
    push("-- 🎬 СЦЕНАРИИ (сгенерированы визуальным редактором)");
    push("-- ═══════════════════════════════════════════════════════");

    // реестр переменных элементов: берём из сгенерированных объявлений
    const varOf = s.__elementVars || {};
    const resolve = (id) => {
      if (!id) return null;
      const v = varOf[id];
      return v || null;
    };

    const indent = (code, n) => String(code || "").split("\n").map((l) => (l.trim() ? "    ".repeat(n) + l : "")).join("\n");

    for (const sc of scenarios) {
      push("");
      push(`-- ▸ ${sc.name}`);
      const byId = Object.fromEntries(sc.nodes.map((n) => [n.id, n]));
      const outs = (id) => sc.links.filter((l) => l.from === id).map((l) => byId[l.to]).filter(Boolean);

      const emit = (node, depth, ctxVar) => {
        if (!node) return;
        const pad = "    ".repeat(depth);
        const p = node.params || {};
        switch (node.type) {
          case "action": {
            const target = resolve(p.target);
            if (p.kind === "Notify") {
              push(`${pad}BeautifulUI:Notify("Сценарий", ${luaStr(p.value || "Готово")}, 3, "Success")`);
            } else if (p.kind === "Toast") {
              push(`${pad}BeautifulUI:Toast(${luaStr(p.value || "Готово")}, "Info")`);
            } else if (p.kind === "Toggle" && target) {
              push(`${pad}pcall(function() ${target}:Set(not ${target}:Get()) end)`);
            } else if (p.kind === "Set" && target) {
              push(`${pad}pcall(function() ${target}:Set(${p.value || "true"}) end)`);
            } else if (p.kind === "Run") {
              const inline = String(p.value || "").trim();
              if (inline) push(indent(inline, depth));
              else push(`${pad}-- Run: укажите код в поле «Значение»`);
            }
            if (p.code && p.code.trim()) {
              push(`${pad}-- свой код:`);
              push(indent(p.code, depth));
            }
            break;
          }
          case "condition": {
            const expr = (p.expression || "true").trim();
            push(`${pad}if ${expr} then`);
            const children = outs(node.id);
            if (children.length) children.forEach((c) => emit(c, depth + 1, ctxVar));
            else push(`${pad}    -- ветка пустая`);
            push(`${pad}else`);
            push(`${pad}    -- альтернативная ветка`);
            push(`${pad}end`);
            return; // дети уже обработаны
          }
          case "delay": {
            push(`${pad}task.wait(${Number(p.seconds) || 0.5})`);
            break;
          }
          case "custom": {
            if (p.code && p.code.trim()) push(indent(p.code, depth));
            else push(`${pad}-- пустой блок кода`);
            break;
          }
        }
        for (const child of outs(node.id)) emit(child, depth, ctxVar);
      };

      const events = sc.nodes.filter((n) => n.type === "event");
      if (!events.length) {
        push("-- нет блоков-событий, сценарий не подключён");
        continue;
      }
      for (const evt of events) {
        const target = resolve(evt.params?.source);
        const signal = SIGNAL_LUA[evt.params?.signal] || "MouseButton1Click";
        const cbArgs = signal === "Changed" ? "value" : signal === "FocusLost" ? "text" : "";
        push("");
        if (target) {
          push(`-- ${evt.title || "событие"}: ${target}.${signal}`);
          push(`pcall(function() ${target}.${signal}:Connect(function(${cbArgs || "value"})`);
          if (!cbArgs) push(`    if value == nil then value = true end -- у события нет аргумента`);
        } else {
          push(`-- ${evt.title || "событие"}: элемент не выбран → запускаем сразу`);
          push(`do -- вместо события: разовый запуск`);
          push(`    local value = nil`);
        }
        if (evt.params?.code && evt.params.code.trim()) push(indent(evt.params.code, 1));
        for (const child of outs(evt.id)) emit(child, 1, cbArgs || "value");
        push(`end) end)`);
      }
    }

    push("");
    push("-- конец сценариев");
    return L.join("\n");
  }

  /* ─────────────── сводка ─────────────── */
  function summary() {
    const s = API.getState();
    const list = s.scenarios || [];
    const nodes = list.reduce((n, x) => n + (x.nodes?.length || 0), 0);
    const links = list.reduce((n, x) => n + (x.links?.length || 0), 0);
    return { scenarios: list.length, nodes, links };
  }

  window.Scenarios = {
    NODE_TYPES,
    api(a) { API = a; },
    /* id элемента → имя Lua-переменной (заполняет app.js при генерации) */
    elementVars(v) { if (v) API.__elementVars = v; return API.__elementVars || {}; },
    /* перерисовать правую сводку, если открыт режим сценариев */
    notifyChange() {
      try { window.__renderScenarioCode && window.__renderScenarioCode(); } catch (_) {}
      try { window.__renderScenarioSidebar && window.__renderScenarioSidebar(); } catch (_) {}
    },
    render,
    generateLua,
    summary,
    activeScenario,
  };
})();
