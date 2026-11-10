let DATA = {reportDate:"", sections:[], tasks:[], bugs:[], changes:[]};
let draft = null;
const COLORS = {
  green: "Зелёный", yellow: "Жёлтый", blue: "Синий", red: "Красный",
  violet: "Фиолетовый", teal: "Бирюзовый", grey: "Серый",
};
const COLS = [["plan", "Запланировано"], ["work", "В работе"], ["done", "Готово"]];
const COL_NAMES = { plan: "Запланировано", work: "В работе", done: "Готово", archive: "Архив" };
const COL_TONE = { plan: "blue", work: "yellow", done: "green", archive: "grey" };
// цвет задачи = её колонка: синий — запланировано, жёлтый — в работе, зелёный — готово
const COL_DEFAULT_COLOR = { plan: "blue", work: "yellow", done: "green", archive: "grey" };
const COLOR_COL = { blue: "plan", yellow: "work", green: "done" };
const SEV = { high: ["Критичный", "red"], mid: ["Средний", "yellow"], low: ["Низкий", "grey"] };
const BSTATE = { open: ["Открыт", "red"], fixing: ["Исправляется", "blue"], fixed: ["Исправлен", "green"] };
const KINDS = {
  add: ["Новая", "green"], remove: ["Удалена", "red"], col: ["Этап", "blue"], status: ["Статус", "violet"],
  color: ["Отметка", "grey"], rename: ["Название", "teal"], owner: ["Отв. лицо", "grey"],
  "bug-add": ["Новый баг", "red"], "bug-state": ["Баг", "teal"], "bug-sev": ["Важность", "yellow"],
  "bug-rename": ["Название", "teal"], "bug-remove": ["Удалён", "grey"], note: ["Заметка", "blue"],
  "sub-add": ["Подзадача", "teal"], "sub-done": ["Подзадача", "green"], "sub-rename": ["Подзадача", "teal"], "sub-remove": ["Подзадача", "grey"],
};
const KIND_ORDER = ["add", "bug-add", "rename", "bug-rename", "col", "status", "bug-state", "bug-sev", "color", "sub-add", "sub-rename", "sub-done", "sub-remove", "owner", "remove", "bug-remove", "note"];

const clone = (o) => JSON.parse(JSON.stringify(o));
const norm = (v) => String(v || "").trim();
const newId = (p = "w") => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const pad = (n) => String(n).padStart(2, "0");
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

DATA.sections = DATA.sections || [];
DATA.tasks = DATA.tasks || [];
DATA.bugs = DATA.bugs || [];
DATA.changes = DATA.changes || [];
DATA.tasks.forEach((it) => { if (!it.id) it.id = newId(); });
DATA.bugs.forEach((b) => { if (!b.id) b.id = newId("b"); });

// оставляем только жирный, подчёркнутый, ссылки и переносы строк; всё остальное — простым текстом
function sanitize(html) {
  const tpl = document.createElement("template");
  tpl.innerHTML = String(html || "");
  const out = document.createElement("div");
  const walk = (src, dst) => {
    for (const n of [...src.childNodes]) {
      if (n.nodeType === 3) { dst.appendChild(document.createTextNode(n.nodeValue)); continue; }
      if (n.nodeType !== 1) continue;
      const tag = n.tagName;
      if (tag === "SCRIPT" || tag === "STYLE" || tag === "TEMPLATE") continue;
      if (tag === "BR") { dst.appendChild(document.createElement("br")); continue; }
      if ((tag === "DIV" || tag === "P" || tag === "LI") && dst.lastChild && dst.lastChild.nodeName !== "BR") {
        dst.appendChild(document.createElement("br"));
      }
      let el = null;
      if (tag === "B" || tag === "STRONG") el = document.createElement("b");
      else if (tag === "U") el = document.createElement("u");
      else if (tag === "A") {
        const href = (n.getAttribute("href") || "").trim();
        if (/^(https?:|mailto:)/i.test(href)) {
          el = document.createElement("a");
          el.setAttribute("href", href);
          el.setAttribute("target", "_blank");
          el.setAttribute("rel", "noopener noreferrer");
        }
      }
      if (el) { walk(n, el); dst.appendChild(el); } else walk(n, dst);
    }
  };
  walk(tpl.content, out);
  while (out.lastChild && out.lastChild.nodeName === "BR") out.lastChild.remove();
  while (out.firstChild && out.firstChild.nodeName === "BR") out.firstChild.remove();
  return out.textContent.trim() ? out.innerHTML : "";
}
// текст без разметки — для сравнения версий и списка изменений
function plain(html) {
  const tpl = document.createElement("template");
  tpl.innerHTML = String(html || "");
  tpl.content.querySelectorAll("br").forEach((b) => b.replaceWith(" "));
  return tpl.content.textContent.replace(/\s+/g, " ").trim();
}

const ICONS = {
  laptop: '<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19h20"/>',
  book: '<path d="M12 6c-2-1.5-5-2-8-1.5V19c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V4.5c-3-.5-6 0-8 1.5z"/><path d="M12 6v14.5"/>',
  // закупки: документ со знаком рубля, как на макете главной страницы
  cart: '<path d="M6 3h8l4 4v14H6z"/><text x="12" y="16.6" text-anchor="middle" font-size="9" font-family="Inter, Segoe UI, Arial, sans-serif" font-weight="700" fill="currentColor" stroke="none">₽</text>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>',
  doc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  user: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/>',
  bug: '<rect x="7" y="8" width="10" height="12" rx="5"/><path d="M9.5 8a2.5 2.5 0 0 1 5 0M12 12v8M3 13h4M17 13h4M4 7.5l3.2 2M20 7.5l-3.2 2M4 19l3.2-2M20 19l-3.2-2"/>',
  archive: '<rect x="3" y="4" width="18" height="5" rx="1.2"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4"/>',
  history: '<path d="M3.5 12a8.5 8.5 0 1 0 2.5-6"/><path d="M3 4v4.5h4.5M12 8v4.2l2.8 1.8"/>',
};
const svg = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k] || ICONS.doc}</svg>`;
function plural(n, forms) {
  const m10 = n % 10, m100 = n % 100;
  const w = m10 === 1 && m100 !== 11 ? forms[0] : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? forms[1] : forms[2];
  return n + " " + w;
}
const tasks = (n) => plural(n, ["задача", "задачи", "задач"]);

/* Даты: «02.11.2026», «до 06.11», «26.10 релиз» */
function parseDate(s, ref) {
  const m = String(s || "").match(/(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?/);
  if (!m) return null;
  let y = m[3] ? +m[3] : ref ? ref.getFullYear() : new Date().getFullYear();
  if (y < 100) y += 2000;
  let dt = new Date(y, +m[2] - 1, +m[1]);
  if (!m[3] && ref) {
    const days = (dt - ref) / 864e5;
    if (days > 180) dt = new Date(y - 1, +m[2] - 1, +m[1]);
    else if (days < -180) dt = new Date(y + 1, +m[2] - 1, +m[1]);
  }
  return dt;
}
const shortDate = (s) => { const m = String(s || "").match(/(\d{1,2})\.(\d{1,2})/); return m ? pad(m[1]) + "." + pad(m[2]) : norm(s); };
function latestDate(list) {
  let best = null, bd = -Infinity;
  list.forEach((c) => { const t = +(parseDate(c.date) || 0); if (t > bd) { bd = t; best = c.date; } });
  return best;
}

/* Активная вкладка: номер раздела (0…3) или "ch" — список изменений */
let tab = "0";
let chFilter = "all";
function tabFromHash() {
  const h = location.hash;
  if (h === "#changes") return "ch";
  if (/^#s\d+$/.test(h)) return String(+h.slice(2) - 1);
  return null;
}
try { tab = tabFromHash() || localStorage.getItem("tab") || "0"; } catch (_) {}
window.addEventListener("hashchange", () => { const t = tabFromHash(); if (t && t !== tab) { tab = t; render(); } });
function setTab(t) {
  tab = t;
  try { history.replaceState(null, "", t === "ch" ? "#changes" : "#s" + (+t + 1)); } catch (_) {}
  try { localStorage.setItem("tab", t); } catch (_) {}
  render();
  window.scrollTo(0, 0);
  const b = document.querySelector(`.tab[data-tab="${t}"]`);
  if (b) b.focus({ preventScroll: true });
}

function render(root = document, isStatic = false) {
  const d = draft || DATA;
  const editing = !!draft;
  const page = root.querySelector("#page");
  page.classList.toggle("editing", editing);
  // колонку «Отв. лицо» можно скрыть; заполненные значения при этом сохраняются
  page.classList.toggle("no-owner", d.showOwner === false);
  if (tab !== "ch" && !(+tab >= 0 && +tab < d.sections.length)) tab = "0";

  root.querySelector("#report-date").innerHTML = editing
    ? `<label>Отчёт на <input class="field date-field" id="f-date" value="${esc(d.reportDate)}" aria-label="Дата отчёта"></label>`
    : "Отчёт на " + esc(d.reportDate);
  const active = d.tasks.filter((t) => t.col !== "archive").length;
  root.querySelector("#total").innerHTML = `Всего: <b>${tasks(active)}</b>`;

  const tabsEl = root.querySelector("#tabs");
  const view = root.querySelector("#view");
  if (isStatic) {
    // без скриптов вкладки не переключаются, поэтому в статичной копии все разделы идут подряд
    tabsEl.hidden = true; tabsEl.innerHTML = "";
    view.innerHTML = d.sections.map((s, i) => renderSection(d, i, false, true)).join('<div class="static-sep"></div>') +
      '<div class="static-sep"></div>' + renderChanges(d, false, "all", true);
    const tools = root.querySelector("#tools");
    tools.hidden = true; tools.innerHTML = "";
    const fb = root.querySelector("#b-fit");
    fb.hidden = true; fb.textContent = "";
    return;
  }
  tabsEl.hidden = false;
  tabsEl.innerHTML = renderTabs(d);
  view.innerHTML = tab === "ch" ? renderChanges(d, editing, chFilter, false) : renderSection(d, +tab, editing, false);
  renderTools();
  fit(); // сначала масштаб, потом высота полей: от масштаба зависит ширина колонок
  root.querySelectorAll("textarea.field").forEach(autosize);
}

function renderTabs(d) {
  const items = d.sections.map((s, i) => {
    const n = d.tasks.filter((t) => t.sec === i && t.col !== "archive").length;
    const bugs = d.bugs.filter((b) => b.sec === i && b.state !== "fixed").length;
    return `<button class="tab" type="button" role="tab" data-tab="${i}" data-tone="${i % 4 + 1}" aria-selected="${tab === String(i)}" tabindex="${tab === String(i) ? 0 : -1}">
      <span class="tn">${pad(i + 1)}</span><span class="tl">${esc(s.title)}</span><span class="tc" title="Задач в плане, в работе и готовых">${n}</span>${bugs ? `<span class="tb" title="Открытых багов: ${bugs}">${svg("bug")}${bugs}</span>` : ""}
    </button>`;
  });
  const last = latestDate(d.changes);
  const nLast = last ? groupCount(d.changes.filter((c) => c.date === last && c.kind !== "due")) : 0;
  items.push(`<button class="tab tab-ch" type="button" role="tab" data-tab="ch" data-tone="0" aria-selected="${tab === "ch"}" tabindex="${tab === "ch" ? 0 : -1}">
    <span class="tn">${svg("history")}</span><span class="tl">Изменения</span>${nLast ? `<span class="tc" title="Изменено задач за ${esc(last)}">${nLast}</span>` : ""}
  </button>`);
  return items.join("");
}
// сколько задач / багов / заметок затронуто
function groupCount(list) { return new Set(list.map((c) => c.tid || c.id)).size; }

function renderSection(d, si, editing, isStatic) {
  const s = d.sections[si];
  const mine = d.tasks.filter((t) => t.sec === si);
  const bugs = d.bugs.filter((b) => b.sec === si);
  const open = bugs.filter((b) => b.state !== "fixed").length;
  const active = mine.filter((t) => t.col !== "archive").length;
  const secCh = d.changes.filter((c) => c.sec === si && c.kind !== "due");
  const lastDate = latestDate(secCh);
  const nCh = lastDate ? groupCount(secCh.filter((c) => c.date === lastDate)) : 0;

  const cols = COLS.map(([k, title]) => {
    const items = mine.filter((t) => t.col === k);
    return `<section class="col" style="--cc: var(--s-${COL_TONE[k]}-fg)" aria-label="${title}">
      <header class="col-head"><span class="dot"></span><h3>${title}</h3><span class="ccount">${items.length}</span></header>
      <div class="cards" data-col="${k}" data-sec="${si}">${items.length
        ? items.map((it) => editing ? cardEdit(it, d) : cardView(it, d)).join("")
        : `<div class="empty-col">${editing ? "Перетащите сюда задачу или добавьте новую" : "Нет задач"}</div>`}</div>
      ${editing ? `<button class="btn add-btn" type="button" data-addtask="${si}-${k}">+ Добавить задачу</button>` : ""}
    </section>`;
  }).join("");

  const shownBugs = editing ? bugs : bugs.slice().sort((a, b) =>
    Object.keys(BSTATE).indexOf(a.state) - Object.keys(BSTATE).indexOf(b.state) ||
    Object.keys(SEV).indexOf(a.sev) - Object.keys(SEV).indexOf(b.sev));
  const fixed = bugs.length - open;
  const bugsPanel = `<section class="panel" style="--cc: var(--s-red-fg)" aria-label="Баги">
    <header class="panel-head">${svg("bug")}<h3>Баги</h3><span class="ccount">открыто ${open}${fixed ? ` · исправлено ${fixed}` : ""}</span></header>
    ${shownBugs.length ? `<div class="bug-list">${shownBugs.map((b) => editing ? bugEdit(b) : bugView(b)).join("")}</div>`
      : `<div class="empty-col">${editing ? "Багов нет — добавьте, если нашли" : "Багов нет"}</div>`}
    ${editing ? `<button class="btn add-btn" type="button" data-addbug="${si}">+ Добавить баг</button>` : ""}
  </section>`;

  const arc = mine.filter((t) => t.col === "archive");
  const arcPanel = `<section class="panel" style="--cc: var(--s-grey-fg)" aria-label="Архив задач">
    <header class="panel-head">${svg("archive")}<h3>Архив задач</h3><span class="ccount">${arc.length}</span></header>
    ${editing
      ? `<div class="cards" data-col="archive" data-sec="${si}">${arc.length ? arc.map((it) => cardEdit(it, d)).join("") : `<div class="empty-col">Перетащите сюда завершённую или снятую задачу</div>`}</div>`
      : arc.length ? `<div class="arc-list">${arc.map(arcRow).join("")}</div>` : `<div class="empty-col">Архив пуст</div>`}
  </section>`;

  return `<article class="sec" data-tone="${si % 4 + 1}">
    <header class="sec-head">
      <div class="sec-title">
        <div class="tile">${svg(s.icon)}</div>
        <div class="num">${pad(si + 1)}</div>
        <div><h2>${esc(s.title)}</h2><p>${esc(s.desc)}</p></div>
      </div>
      <div class="stats">
        <span class="stat">Задач: <b>${active}</b></span>
        ${open ? `<span class="stat warn">Открытых багов: <b>${open}</b></span>` : ""}
        ${nCh && !isStatic ? `<button class="link-btn" type="button" data-goch="${si}">Изменения за ${esc(shortDate(lastDate))}: ${nCh} →</button>` : ""}
      </div>
    </header>
    <div class="board">${cols}</div>
    <div class="lower">${bugsPanel}${arcPanel}</div>
  </article>`;
}

function cardView(it, d) {
  const html = sanitize(it.label);
  const dv = norm(it.due);
  const owner = norm(it.owner);
  const meta = [];
  if (dv && dv !== "-") meta.push(`<span class="due">${svg("clock")}${esc(dv)}</span>`);
  if (owner) meta.push(`<span class="own">${svg("user")}${esc(owner)}</span>`);
  return `<div class="card" data-s="${esc(it.color || "blue")}">
    <div class="card-top">${it.num ? `<span class="step" title="Задача ${esc(it.num)}">${esc(it.num)}</span>` : ""}<span class="name">${esc(it.name)}</span></div>
    ${html ? `<div class="txt">${html}</div>` : ""}
    ${meta.length ? `<div class="meta">${meta.join("")}</div>` : ""}
    ${subsView(it)}
  </div>`;
}

/* Подзадачи. Какие списки раскрыты — помним, чтобы они не сворачивались при перерисовке */
const openSubs = new Set();
const CHEV = '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
function subsSummary(subs) {
  const n = subs.length, k = subs.filter((x) => x.done).length;
  return `<summary>${CHEV}<span>Подзадачи${n ? ` · ${k} из ${n}` : ""}</span>${n ? `<span class="sub-bar" aria-hidden="true"><i style="width:${Math.round(k / n * 100)}%"></i></span>` : ""}</summary>`;
}
function subsView(it) {
  const subs = it.subs || [];
  if (!subs.length) return "";
  return `<details class="subs" data-task="${it.id}"${openSubs.has(it.id) ? " open" : ""}>${subsSummary(subs)}
    <ul class="sub-list">${subs.map((x) => `<li class="${x.done ? "done" : ""}"><span class="box" role="img" aria-label="${x.done ? "выполнена" : "не выполнена"}">${x.done ? CHECK : ""}</span><span class="sname">${esc(x.name)}</span></li>`).join("")}</ul>
  </details>`;
}
function subsEdit(it) {
  const subs = it.subs || [];
  const rows = subs.map((x) => {
    const a = `data-t="sub" data-task="${it.id}" data-id="${x.id}"`;
    return `<div class="sub-row">
      <input type="checkbox" ${a} data-f="done"${x.done ? " checked" : ""} aria-label="Подзадача выполнена">
      <textarea class="field" id="sn-${x.id}" ${a} data-f="name" rows="1" placeholder="Подзадача" aria-label="Название подзадачи">${esc(x.name)}</textarea>
      <button class="icon-btn small" type="button" data-sdel="${it.id}:${x.id}" title="Удалить подзадачу" aria-label="Удалить подзадачу">×</button>
    </div>`;
  }).join("");
  return `<details class="subs" data-task="${it.id}"${openSubs.has(it.id) ? " open" : ""}>${subsSummary(subs)}
    <div class="sub-edit">${rows}<button class="btn add-btn sub-add" type="button" data-addsub="${it.id}">+ Подзадача</button></div>
  </details>`;
}

function arcRow(it) {
  const html = sanitize(it.label);
  return `<div class="arc-row">
    <div class="name">${it.num ? `<span class="step">${esc(it.num)}</span> ` : ""}${esc(it.name)}</div>
    <span class="arc-date">${it.archived ? "в архиве с " + esc(it.archived) : ""}</span>
    ${html ? `<div class="arc-txt">${html}</div>` : ""}
  </div>`;
}

function bugView(b) {
  const sev = SEV[b.sev] || SEV.mid, st = BSTATE[b.state] || BSTATE.open;
  const html = sanitize(b.desc);
  return `<div class="bug" data-s="${sev[1]}" data-state="${esc(b.state)}">
    <div class="bug-top"><span class="pill" data-s="${sev[1]}">${sev[0]}</span><span class="pill ghost" data-s="${st[1]}">${st[0]}</span>${norm(b.task) ? `<span class="to">к задаче ${esc(b.task)}</span>` : ""}</div>
    <div class="name">${esc(b.title)}</div>
    ${html ? `<div class="txt">${html}</div>` : ""}
    ${norm(b.found) ? `<div class="meta"><span>Найден ${esc(b.found)}</span></div>` : ""}
  </div>`;
}

/* Редактор текста с кнопками Ж / Ч / ссылка; color — показать выбор цвета-отметки */
function richEditor(key, a, field, html, placeholder, color) {
  const sw = color ? `<div class="swatches" role="radiogroup" aria-label="Цвет-отметка">${Object.keys(COLORS).map((c) =>
    `<input type="radio" name="c-${key}" id="c-${key}-${c}" value="${c}" ${a} data-f="color"${c === color ? " checked" : ""}>` +
    `<label for="c-${key}-${c}" title="${COLORS[c]}${COLOR_COL[c] ? " — " + COL_NAMES[COLOR_COL[c]] : c === "red" ? " — проблема" : ""}" style="background: var(--s-${c}-fg)"><span hidden>${COLORS[c]}</span></label>`).join("")}</div>` : "";
  return `<div class="edit-bar">${sw}
      <div class="fmt" role="toolbar" aria-label="Оформление текста">
        <button class="fmt-btn" type="button" data-cmd="bold" data-for="${key}" title="Жирный (Ctrl+B)">Ж</button>
        <button class="fmt-btn" type="button" data-cmd="underline" data-for="${key}" title="Подчёркнутый (Ctrl+U)"><u>Ч</u></button>
        <button class="fmt-btn" type="button" data-cmd="link" data-for="${key}" title="Ссылка (Ctrl+K)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg></button>
      </div>
    </div>
    <div class="field rich" id="l-${key}" ${a} data-f="${field}" contenteditable="true" role="textbox" aria-multiline="true" aria-label="${placeholder}" data-placeholder="${placeholder}">${sanitize(html)}</div>
    <div class="link-form" id="lf-${key}" hidden>
      <input class="field" id="lu-${key}" data-link-url="${key}" placeholder="https://…" aria-label="Адрес ссылки">
      <button class="btn small primary" type="button" data-link-apply="${key}">Вставить</button>
      <button class="btn small" type="button" data-link-remove="${key}">Убрать ссылку</button>
      <button class="btn small" type="button" data-link-cancel="${key}">Отмена</button>
    </div>`;
}

function cardEdit(it, d) {
  const key = it.id;
  const a = `data-t="task" data-id="${key}"`;
  const opts = Object.keys(COL_NAMES).map((k) => `<option value="${k}"${k === it.col ? " selected" : ""}>${COL_NAMES[k]}</option>`).join("");
  return `<div class="card" data-id="${key}" data-s="${esc(it.color || "blue")}">
    <div class="card-bar">
      <span class="grip" draggable="true" data-drag="${key}" title="Перетащите в другую колонку или в архив" aria-hidden="true">⠿</span>
      ${it.num ? `<span class="step">${esc(it.num)}</span>` : ""}
      <span class="gap"></span>
      <button class="mv-btn" type="button" data-step="${key}:-1" title="Выше" aria-label="Переместить выше">↑</button>
      <button class="mv-btn" type="button" data-step="${key}:1" title="Ниже" aria-label="Переместить ниже">↓</button>
      <select class="field" ${a} data-f="col" aria-label="Колонка">${opts}</select>
      <button class="icon-btn" type="button" data-del="${key}" title="Удалить задачу" aria-label="Удалить задачу «${esc(it.name)}»">×</button>
    </div>
    <textarea class="field name-field" id="n-${key}" ${a} data-f="name" rows="1" placeholder="Название задачи" aria-label="Название задачи">${esc(it.name)}</textarea>
    ${richEditor(key, a, "label", it.label, "Статус / комментарий", it.color || "blue")}
    <div class="edit-grid">
      <label>Срок<input class="field" ${a} data-f="due" value="${esc(it.due || "")}" placeholder="до 16.11"></label>
      <label class="own">Отв. лицо<textarea class="field" ${a} data-f="owner" rows="1" placeholder="ФИО">${esc(it.owner || "")}</textarea></label>
    </div>
    ${subsEdit(it)}
  </div>`;
}

function bugEdit(b) {
  const key = b.id;
  const a = `data-t="bug" data-id="${key}"`;
  const sel = (f, map, v) => `<select class="field" ${a} data-f="${f}">${Object.keys(map).map((k) => `<option value="${k}"${k === v ? " selected" : ""}>${map[k][0]}</option>`).join("")}</select>`;
  return `<div class="bug" data-id="${key}" data-s="${(SEV[b.sev] || SEV.mid)[1]}" data-state="open">
    <div class="card-bar">${sel("sev", SEV, b.sev)}${sel("state", BSTATE, b.state)}<span class="gap"></span>
      <button class="icon-btn" type="button" data-bdel="${key}" title="Удалить баг" aria-label="Удалить баг «${esc(b.title)}»">×</button></div>
    <textarea class="field name-field" id="n-${key}" ${a} data-f="title" rows="1" placeholder="Что не работает" aria-label="Название бага">${esc(b.title)}</textarea>
    ${richEditor(key, a, "desc", b.desc, "Подробности, как воспроизвести", null)}
    <div class="edit-grid">
      <label>К задаче<input class="field" ${a} data-f="task" value="${esc(b.task || "")}" placeholder="3.3"></label>
      <label>Найден<input class="field" ${a} data-f="found" value="${esc(b.found || "")}" placeholder="09.11"></label>
    </div>
  </div>`;
}

/* Список изменений */
function renderChanges(d, editing, filter, isStatic) {
  const chips = isStatic ? "" : `<div class="ch-filters" role="group" aria-label="Фильтр по разделам">${
    [["all", "Все разделы", 0], ...d.sections.map((s, i) => [String(i), pad(i + 1) + " · " + s.title, i % 4 + 1])]
      .map(([k, t, tone]) => `<button class="chip${filter === k ? " on" : ""}" type="button" data-chf="${k}" data-tone="${tone}" aria-pressed="${filter === k}">${esc(t)}</button>`).join("")
  }</div>`;
  const form = editing ? `<section class="panel note-form">
      <h3>Добавить запись вручную</h3>
      <div class="nf-row">
        <select class="field" id="nn-sec" aria-label="Раздел">${d.sections.map((s, i) => `<option value="${i}"${filter === String(i) ? " selected" : ""}>${pad(i + 1)} · ${esc(s.title)}</option>`).join("")}</select>
        <input class="field" id="nn-date" value="${esc(d.reportDate)}" aria-label="Дата">
        <textarea class="field" id="nn-text" rows="1" placeholder="Что изменилось" aria-label="Текст записи"></textarea>
        <button class="btn small primary" type="button" id="nn-add">Добавить</button>
      </div>
    </section>` : "";

  const list = d.changes.filter((c) => c.kind !== "due" && (filter === "all" || String(c.sec) === filter));
  const dates = [...new Set(list.map((c) => c.date))].sort((a, b) => +(parseDate(b) || 0) - +(parseDate(a) || 0));
  const days = dates.map((date) => {
    const es = list.filter((c) => c.date === date);
    const secs = [...new Set(es.map((c) => c.sec))].sort((a, b) => a - b);
    const body = secs.map((si) => {
      const groups = [], idx = new Map();
      es.filter((c) => c.sec === si).forEach((c) => {
        const key = c.tid || c.id;
        if (!idx.has(key)) { idx.set(key, groups.length); groups.push([]); }
        groups[idx.get(key)].push(c);
      });
      const s = d.sections[si];
      return `<div class="ch-sec" data-tone="${si % 4 + 1}">
        <div class="ch-sec-head"><span class="tn">${pad(si + 1)}</span>${esc(s ? s.title : "Раздел")}</div>
        ${groups.map((g) => changeGroup(d, g, editing)).join("")}
      </div>`;
    }).join("");
    return `<section class="panel ch-day"><header class="ch-day-head"><h3>${esc(date)}</h3><span>изменено: ${plural(groupCount(es), ["позиция", "позиции", "позиций"])}</span></header>${body}</section>`;
  }).join("");

  return `<article class="changes">
    <header class="sec-head" data-tone="0">
      <div class="sec-title">
        <div class="tile">${svg("history")}</div>
        <div><h2>Список изменений</h2><p>Что поменялось в отчёте от недели к неделе: статусы, этапы, подзадачи, новые и снятые задачи, баги. Сроки не учитываются. Записи добавляются сами при каждом сохранении — под датой отчёта.</p></div>
      </div>
    </header>
    ${chips}${form}
    ${days || `<div class="panel ch-empty">${filter === "all" ? "Изменений пока нет" : "В этом разделе изменений пока нет"}</div>`}
  </article>`;
}

function changeGroup(d, g, editing) {
  const c0 = g[0];
  const isBug = c0.kind.startsWith("bug");
  const cur = c0.kind === "note" ? null : isBug ? d.bugs.find((b) => b.id === c0.tid) : d.tasks.find((t) => t.id === c0.tid);
  const name = cur ? (isBug ? cur.title : cur.name) : c0.name;
  const ref = isBug ? "Баг" : cur ? cur.num : c0.ref;
  const who = c0.kind === "note"
    ? `<span class="gen">Общее</span>`
    : `${ref ? `<span class="step${isBug ? " bug-ref" : ""}">${esc(ref)}</span>` : ""}<span class="name">${esc(name || "")}</span>`;
  const lines = g.slice().sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind)).map((c) => {
    let k = KINDS[c.kind] || ["Изменение", "grey"];
    if (c.kind === "col" && c.new === "archive") k = ["Архив", "grey"];
    return `<div class="ch-line"><span class="ch-tag" data-s="${k[1]}">${k[0]}</span><div class="ch-body">${changeText(c)}</div>${
      editing ? `<button class="icon-btn small" type="button" data-chdel="${c.id}" title="Удалить запись" aria-label="Удалить запись">×</button>` : ""}</div>`;
  }).join("");
  return `<div class="ch-group"><div class="ch-who">${who}</div><div class="ch-lines">${lines}</div></div>`;
}

function changeText(c) {
  const arrow = (o, n) => `${o ? `<span class="old">${esc(o)}</span> → ` : ""}<b>${esc(n || "—")}</b>`;
  const lbl = (map, k) => (map[k] ? map[k][0] : k || "—");
  switch (c.kind) {
    case "add": return `Добавлена${c.new ? " · " + esc(COL_NAMES[c.new] || "") : ""}`;
    case "remove": return "Убрана из отчёта";
    case "col":
      if (c.new === "archive") return "Перенесена в архив";
      if (c.old === "archive") return `Возвращена из архива · <b>${esc(COL_NAMES[c.new] || "")}</b>`;
      return arrow(COL_NAMES[c.old] || c.old, COL_NAMES[c.new] || c.new);
    case "status": return `${c.new ? esc(c.new) : '<span class="old">текст статуса удалён</span>'}${c.old ? `<div class="was">было: ${esc(c.old)}</div>` : ""}`;
    case "due": return arrow(c.old, c.new);
    case "color": return `<i class="sw" data-s="${esc(c.old)}"></i> ${esc(COLORS[c.old] || c.old)} → <i class="sw" data-s="${esc(c.new)}"></i> <b>${esc(COLORS[c.new] || c.new)}</b>`;
    case "rename": case "bug-rename": return `было «${esc(c.old)}»`;
    case "owner": return arrow(c.old, c.new);
    case "bug-add": return `Добавлен · ${esc(lbl(SEV, c.new))}`;
    case "bug-state": return arrow(lbl(BSTATE, c.old), lbl(BSTATE, c.new));
    case "bug-sev": return arrow(lbl(SEV, c.old), lbl(SEV, c.new));
    case "bug-remove": return "Удалён из списка";
    case "note": return esc(c.text || "");
    case "sub-add": return `Добавлена: «${esc(c.new)}»${c.done ? " · выполнена" : ""}`;
    case "sub-rename": return `«${esc(c.old)}» → <b>«${esc(c.new)}»</b>`;
    case "sub-done": return c.new ? `<b>«${esc(c.sname)}»</b> — выполнена` : `«${esc(c.sname)}» — снова не выполнена`;
    case "sub-remove": return `Удалена: «${esc(c.old)}»`;
  }
  return esc(c.text || "");
}

/* Сравнение сохранённой версии с новой: что поменялось — в список изменений под датой отчёта */
function diff(prev, next) {
  const out = [];
  const date = norm(next.reportDate);
  const push = (o) => out.push({ id: newId("c"), date, ...o });
  const pt = new Map(prev.tasks.map((x) => [x.id, x]));
  const nt = new Map(next.tasks.map((x) => [x.id, x]));
  next.tasks.forEach((n) => {
    const base = { sec: n.sec, tid: n.id, ref: n.num || "", name: n.name };
    const p = pt.get(n.id);
    if (!p) { push({ ...base, kind: "add", new: n.col }); return; }
    if (norm(p.name) !== norm(n.name)) push({ ...base, kind: "rename", old: p.name, new: n.name });
    if (p.col !== n.col) push({ ...base, kind: "col", old: p.col, new: n.col });
    const pl = plain(p.label), nl = plain(n.label);
    if (pl !== nl) push({ ...base, kind: "status", old: pl, new: nl });
    // изменения сроков в список не попадают
    if ((p.color || "") !== (n.color || "") && !(COLOR_COL[p.color] && COLOR_COL[n.color])) push({ ...base, kind: "color", old: p.color, new: n.color });
    if (norm(p.owner) !== norm(n.owner)) push({ ...base, kind: "owner", old: norm(p.owner), new: norm(n.owner) });
    const ps = new Map((p.subs || []).map((x) => [x.id, x]));
    const ns = new Map((n.subs || []).map((x) => [x.id, x]));
    (n.subs || []).forEach((x) => {
      const o = ps.get(x.id);
      if (!o) { push({ ...base, sid: x.id, kind: "sub-add", new: x.name, done: x.done }); return; }
      if (norm(o.name) !== norm(x.name)) push({ ...base, sid: x.id, kind: "sub-rename", old: o.name, new: x.name });
      if (!!o.done !== !!x.done) push({ ...base, sid: x.id, kind: "sub-done", old: o.done ? "1" : "", new: x.done ? "1" : "", sname: x.name });
    });
    (p.subs || []).forEach((o) => { if (!ns.has(o.id)) push({ ...base, sid: o.id, kind: "sub-remove", old: o.name }); });
  });
  prev.tasks.forEach((p) => { if (!nt.has(p.id)) push({ sec: p.sec, tid: p.id, ref: p.num || "", name: p.name, kind: "remove" }); });

  const pb = new Map(prev.bugs.map((x) => [x.id, x]));
  const nb = new Map(next.bugs.map((x) => [x.id, x]));
  next.bugs.forEach((n) => {
    const base = { sec: n.sec, tid: n.id, ref: "Баг", name: n.title };
    const p = pb.get(n.id);
    if (!p) { push({ ...base, kind: "bug-add", new: n.sev }); return; }
    if (norm(p.title) !== norm(n.title)) push({ ...base, kind: "bug-rename", old: p.title, new: n.title });
    if (p.state !== n.state) push({ ...base, kind: "bug-state", old: p.state, new: n.state });
    if (p.sev !== n.sev) push({ ...base, kind: "bug-sev", old: p.sev, new: n.sev });
  });
  prev.bugs.forEach((p) => { if (!nb.has(p.id)) push({ sec: p.sec, tid: p.id, ref: "Баг", name: p.title, kind: "bug-remove" }); });
  return out;
}
// несколько сохранений за одну дату не плодят записи: обновляем уже записанное
function logChanges(prev, next) {
  next.changes = next.changes || [];
  for (const e of diff(prev, next)) {
    const same = () => next.changes.filter((c) => c.date === e.date && c.tid === e.tid && c.kind !== "note");
    const added = same().find((c) => c.kind === "add" || c.kind === "bug-add");
    if (e.kind === "remove" || e.kind === "bug-remove") {
      next.changes = next.changes.filter((c) => !(c.date === e.date && c.tid === e.tid && c.kind !== "note"));
      if (!added) next.changes.push(e);
      continue;
    }
    if (added) { // задача добавлена в эту же дату — достаточно записи «Добавлена»
      added.name = e.name;
      if (e.kind === "col") added.new = e.new;
      if (e.kind === "bug-sev") added.new = e.new;
      continue;
    }
    if (e.sid) { // подзадача, добавленная в эту же дату: обновляем запись о добавлении
      const sa = same().find((c) => c.kind === "sub-add" && c.sid === e.sid);
      if (e.kind === "sub-remove" && sa) { next.changes = next.changes.filter((c) => !(c.date === e.date && c.sid === e.sid)); continue; }
      if (sa) { if (e.kind === "sub-rename") sa.new = e.new; if (e.kind === "sub-done") sa.done = !!e.new; continue; }
    }
    const ex = same().find((c) => c.kind === e.kind && (c.sid || "") === (e.sid || ""));
    if (ex) {
      ex.new = e.new; ex.name = e.name; ex.ref = e.ref; if (e.sname) ex.sname = e.sname;
      if (norm(ex.old) === norm(ex.new)) next.changes = next.changes.filter((c) => c !== ex);
    } else next.changes.push(e);
  }
}

// «Весь отчёт на экране»: уменьшаем масштаб, чтобы раздел поместился в окно по высоте
let fitOn = true;
try { fitOn = localStorage.getItem("fit") !== "off"; } catch (_) {}
function fit() {
  const page = document.getElementById("page");
  const btn = document.getElementById("b-fit");
  page.style.zoom = "";
  const wide = innerWidth >= 1000 && !draft && tab !== "ch";
  btn.hidden = !wide;
  if (!wide) return;
  btn.textContent = fitOn ? "Обычный размер" : "Раздел целиком на экране";
  if (!fitOn) return;
  const fits = () => page.getBoundingClientRect().height <= innerHeight + 1;
  if (fits()) return;
  let lo = 0.6, hi = 1;
  for (let k = 0; k < 7; k++) {
    const mid = (lo + hi) / 2;
    page.style.zoom = mid;
    if (fits()) lo = mid; else hi = mid;
  }
  page.style.zoom = lo;
}
window.addEventListener("resize", fit);

// поле растёт по высоте вместе с текстом
function autosize(t) {
  t.style.height = "auto";
  t.style.height = t.scrollHeight + 2 + "px";
}
window.addEventListener("resize", () => document.querySelectorAll("textarea.field").forEach(autosize));

function renderTools(note) {
  const tools = document.getElementById("tools");
  if (!repo.ready) { tools.hidden = true; return; }
  if (!repo.token) { tools.hidden = false; tools.innerHTML = '<button class="btn" id="b-authorize" type="button">Войти для редактирования</button>'; return; }
  tools.hidden = false;
  const hint = "Подзадачи — по стрелке «Подзадачи» внизу карточки (Enter добавляет следующую). Цвет и колонка связаны: синий — «Запланировано», жёлтый — «В работе», зелёный — «Готово». Выберите цвет на карточке, перетащите её за ⠿ или выберите колонку в списке — задача переместится и перекрасится. Красный — отметка проблемы. " +
    "Всё, что вы поменяете, само попадёт во вкладку «Изменения» при сохранении — под датой отчёта, поэтому для новой недели сначала поменяйте дату.";
  tools.innerHTML = draft
    ? `<span class="note">${esc(note || hint)}</span>
       <label class="toggle"><input type="checkbox" id="f-owner"${draft.showOwner === false ? "" : " checked"}> Поле «Отв. лицо»</label>
       <button class="btn" id="b-cancel" type="button">Отмена</button>
       <button class="btn primary" id="b-save" type="button">Сохранить</button>`
    : `<button class="btn" id="b-edit" type="button">Редактировать</button>`;
}

/* Задачи: колонки и порядок */
function setCol(it, col) {
  if (it.col !== col && COL_DEFAULT_COLOR[col] && col !== "archive") it.color = COL_DEFAULT_COLOR[col];
  it.col = col;
  if (col === "archive") it.archived = it.archived || shortDate(draft.reportDate);
  else delete it.archived;
}
function placeTask(id, col, beforeId) {
  const i = draft.tasks.findIndex((x) => x.id === id);
  if (i < 0) return;
  const [it] = draft.tasks.splice(i, 1);
  setCol(it, col);
  let j = beforeId ? draft.tasks.findIndex((x) => x.id === beforeId) : -1;
  if (j < 0) { // в конец колонки
    draft.tasks.forEach((x, k) => { if (x.sec === it.sec && x.col === col) j = k; });
    j = j < 0 ? draft.tasks.length : j + 1;
  }
  draft.tasks.splice(j, 0, it);
  render();
}
function nextNum(si) {
  let max = 0;
  draft.tasks.forEach((t) => {
    const m = String(t.num || "").match(/^(\d+)\.(\d+)$/);
    if (t.sec === si && m && +m[1] === si + 1) max = Math.max(max, +m[2]);
  });
  return `${si + 1}.${max + 1}`;
}
const focusId = (id) => { const el = document.getElementById(id); if (el) el.focus(); };
function addSub(tid, afterId) {
  const task = draft.tasks.find((x) => x.id === tid);
  if (!task) return;
  task.subs = task.subs || [];
  const x = { id: newId("s"), name: "", done: false };
  const i = afterId ? task.subs.findIndex((y) => y.id === afterId) : -1;
  task.subs.splice(i < 0 ? task.subs.length : i + 1, 0, x);
  openSubs.add(tid);
  render();
  focusId("sn-" + x.id);
}
// раскрытие списка подзадач запоминаем
document.addEventListener("toggle", (e) => {
  const det = e.target;
  if (!det.classList || !det.classList.contains("subs")) return;
  if (det.open) openSubs.add(det.dataset.task); else openSubs.delete(det.dataset.task);
  const ta = det.querySelectorAll("textarea.field");
  ta.forEach(autosize);
}, true);
// Enter в подзадаче — следующая подзадача
document.addEventListener("keydown", (e) => {
  const t = e.target;
  if (!draft || e.key !== "Enter" || e.shiftKey || !t.dataset || t.dataset.t !== "sub" || t.dataset.f !== "name") return;
  e.preventDefault();
  addSub(t.dataset.task, t.dataset.id);
});

document.addEventListener("click", async (e) => {
  if (!e.target.closest) return;
  const q = (s) => e.target.closest(s);
  const tb = q("[data-tab]");
  if (tb) { setTab(tb.dataset.tab); return; }
  const go = q("[data-goch]");
  if (go) { chFilter = go.dataset.goch; setTab("ch"); return; }
  const cf = q("[data-chf]");
  if (cf) { chFilter = cf.dataset.chf; render(); return; }
  const btn = q("button");
  const id = btn && btn.id;
  if (id === "b-fit") {
    fitOn = !fitOn;
    try { localStorage.setItem("fit", fitOn ? "on" : "off"); } catch (_) {}
    fit();
    return;
  }
  if (id === "b-edit") { draft = clone(DATA); render(); return; }
  if (id === "b-cancel") { draft = null; render(); return; }
  if (id === "b-save") { await save(); return; }
  if (!draft) return;

  if (id === "nn-add") {
    const text = norm(document.getElementById("nn-text").value);
    if (!text) { focusId("nn-text"); return; }
    draft.changes.push({ id: newId("c"), date: norm(document.getElementById("nn-date").value) || norm(draft.reportDate),
      sec: +document.getElementById("nn-sec").value, tid: "", kind: "note", text });
    render();
    return;
  }
  const del = q("[data-del]");
  if (del) { draft.tasks = draft.tasks.filter((t) => t.id !== del.dataset.del); render(); return; }
  const bdel = q("[data-bdel]");
  if (bdel) { draft.bugs = draft.bugs.filter((b) => b.id !== bdel.dataset.bdel); render(); return; }
  const cdel = q("[data-chdel]");
  if (cdel) { draft.changes = draft.changes.filter((c) => c.id !== cdel.dataset.chdel); render(); return; }
  const add = q("[data-addtask]");
  if (add) {
    const [si, col] = add.dataset.addtask.split("-");
    const it = { id: newId(), sec: +si, num: nextNum(+si), col, name: "", color: COL_DEFAULT_COLOR[col], label: "", due: "", owner: "", subs: [] };
    const last = draft.tasks.reduce((j, t, k) => (t.sec === it.sec && t.col === col ? k : j), -1);
    draft.tasks.splice(last < 0 ? draft.tasks.length : last + 1, 0, it);
    render();
    focusId("n-" + it.id);
    return;
  }
  const addb = q("[data-addbug]");
  if (addb) {
    const b = { id: newId("b"), sec: +addb.dataset.addbug, title: "", desc: "", sev: "mid", state: "open", task: "", found: shortDate(draft.reportDate) };
    draft.bugs.push(b);
    render();
    focusId("n-" + b.id);
    return;
  }
  const as = q("[data-addsub]");
  if (as) { addSub(as.dataset.addsub, null); return; }
  const sd = q("[data-sdel]");
  if (sd) {
    const [tid, sid] = sd.dataset.sdel.split(":");
    const task = draft.tasks.find((x) => x.id === tid);
    task.subs = (task.subs || []).filter((x) => x.id !== sid);
    render();
    return;
  }
  const st = q("[data-step]");
  if (st) {
    const [tid, dir] = st.dataset.step.split(":");
    const it = draft.tasks.find((x) => x.id === tid);
    const same = draft.tasks.filter((x) => x.sec === it.sec && x.col === it.col);
    const other = same[same.indexOf(it) + +dir];
    if (!other) return;
    const i = draft.tasks.indexOf(it), j = draft.tasks.indexOf(other);
    draft.tasks[i] = other; draft.tasks[j] = it;
    render();
    const b2 = document.querySelector(`[data-step="${st.dataset.step}"]`);
    if (b2) { b2.focus(); b2.closest(".card").scrollIntoView({ block: "nearest" }); }
  }
});

// стрелки ← → по вкладкам
document.addEventListener("keydown", (e) => {
  const t = e.target.closest && e.target.closest(".tab");
  if (!t || (e.key !== "ArrowRight" && e.key !== "ArrowLeft")) return;
  const all = [...document.querySelectorAll(".tab")];
  const k = (all.indexOf(t) + (e.key === "ArrowRight" ? 1 : -1) + all.length) % all.length;
  e.preventDefault();
  setTab(all[k].dataset.tab);
});

document.addEventListener("input", (e) => {
  const t = e.target;
  if (t.tagName === "TEXTAREA" && t.classList.contains("field")) autosize(t);
  if (!draft) return;
  if (t.id === "f-date") { draft.reportDate = t.value; return; }
  if (t.id === "f-owner") {
    draft.showOwner = t.checked;
    render();
    focusId("f-owner");
    return;
  }
  if (!t.dataset.f || !t.dataset.t) return;
  if (t.dataset.t === "sub") {
    const task = draft.tasks.find((x) => x.id === t.dataset.task);
    const sub = task && (task.subs || []).find((x) => x.id === t.dataset.id);
    if (!sub) return;
    sub[t.dataset.f] = t.type === "checkbox" ? t.checked : t.value;
    if (t.type === "checkbox") { // обновить счётчик «k из n»
      const det = t.closest("details");
      det.querySelector("summary").outerHTML = subsSummary(task.subs);
    }
    return;
  }
  const obj = (t.dataset.t === "bug" ? draft.bugs : draft.tasks).find((x) => x.id === t.dataset.id);
  if (!obj) return;
  const f = t.dataset.f;
  const v = t.isContentEditable ? t.innerHTML : t.value;
  if (f === "col") {
    // в конец выбранной колонки
    placeTask(obj.id, v, null);
    const sel = document.querySelector(`select[data-id="${obj.id}"][data-f="col"]`);
    if (sel) { sel.focus(); sel.closest(".card").scrollIntoView({ block: "nearest" }); }
    return;
  }
  if (f === "color" && t.dataset.t === "task" && obj.col !== "archive" && COLOR_COL[v] && COLOR_COL[v] !== obj.col) {
    placeTask(obj.id, COLOR_COL[v], null);
    const r = document.getElementById(`c-${obj.id}-${v}`);
    if (r) { r.focus(); r.closest(".card").scrollIntoView({ block: "nearest" }); }
    return;
  }
  obj[f] = v;
  if (f === "color") t.closest(".card").dataset.s = v;
  if (f === "sev") t.closest(".bug").dataset.s = (SEV[v] || SEV.mid)[1];
});

/* Перетаскивание задач за ⠿ — между колонками и в архив своего раздела */
let dragId = null;
function clearDrop() {
  document.querySelectorAll(".drop-before, .drop-after, .drop-end").forEach((el) =>
    el.classList.remove("drop-before", "drop-after", "drop-end"));
}
function dropTarget(e) {
  const box = e.target.closest && e.target.closest(".cards[data-col]");
  if (!box) return null;
  const it = draft.tasks.find((x) => x.id === dragId);
  if (!it || +box.dataset.sec !== it.sec) return null;
  const card = e.target.closest(".card[data-id]");
  if (!card || card.dataset.id === dragId) return { box, card: null, before: null };
  const r = card.getBoundingClientRect();
  const after = e.clientY > r.top + r.height / 2;
  let before = card.dataset.id;
  if (after) { const nx = card.nextElementSibling; before = nx && nx.dataset.id ? nx.dataset.id : null; }
  return { box, card, after, before };
}
document.addEventListener("dragstart", (e) => {
  const h = draft && e.target.closest && e.target.closest("[data-drag]");
  if (!h) return;
  dragId = h.dataset.drag;
  const card = h.closest(".card");
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", "");
  e.dataTransfer.setDragImage(card, 24, 16);
  requestAnimationFrame(() => card.classList.add("dragging"));
});
document.addEventListener("dragover", (e) => {
  if (!dragId) return;
  const t = dropTarget(e);
  if (!t) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  clearDrop();
  if (t.card) t.card.classList.add(t.after ? "drop-after" : "drop-before");
  else t.box.classList.add("drop-end");
});
document.addEventListener("drop", (e) => {
  if (!dragId) return;
  const t = dropTarget(e);
  if (!t) return;
  e.preventDefault();
  clearDrop();
  const id = dragId;
  dragId = null;
  if (t.before === id) return; // на своё же место
  placeTask(id, t.box.dataset.col, t.before);
});
document.addEventListener("dragend", () => {
  dragId = null;
  clearDrop();
  document.querySelectorAll(".card.dragging").forEach((r) => r.classList.remove("dragging"));
});

/* Оформление текста: жирный, подчёркнутый, ссылка */
let linkRange = null; // выделение, к которому применится ссылка

function editorOf(key) { return document.getElementById("l-" + key); }
function selectionIn(ed) {
  const sel = getSelection();
  return sel.rangeCount && ed.contains(sel.getRangeAt(0).commonAncestorContainer) ? sel.getRangeAt(0) : null;
}
function caretAtEnd(ed) {
  const r = document.createRange();
  r.selectNodeContents(ed); r.collapse(false);
  return r;
}
function restore(ed, range) {
  ed.focus();
  const sel = getSelection();
  sel.removeAllRanges();
  sel.addRange(range || caretAtEnd(ed));
}
function syncEditor(ed) { ed.dispatchEvent(new Event("input", { bubbles: true })); }
function linkAt(ed, range) {
  let n = range && range.commonAncestorContainer;
  while (n && n !== ed) { if (n.nodeName === "A") return n; n = n.parentNode; }
  return null;
}
function openLinkForm(key) {
  const ed = editorOf(key);
  linkRange = selectionIn(ed) || caretAtEnd(ed);
  const a = linkAt(ed, linkRange);
  const form = document.getElementById("lf-" + key);
  const url = document.getElementById("lu-" + key);
  form.hidden = false;
  url.value = a ? a.getAttribute("href") : "";
  url.focus();
}
function closeLinkForm(key) {
  document.getElementById("lf-" + key).hidden = true;
  restore(editorOf(key), linkRange);
  linkRange = null;
}
function applyLink(key) {
  let url = document.getElementById("lu-" + key).value.trim();
  if (!url) return;
  if (!/^(https?:|mailto:)/i.test(url)) url = (url.includes("@") && !url.includes("/") ? "mailto:" : "https://") + url;
  const ed = editorOf(key);
  restore(ed, linkRange);
  const a = linkAt(ed, linkRange);
  if (a) a.setAttribute("href", url);
  else if (linkRange && !linkRange.collapsed) document.execCommand("createLink", false, url);
  else document.execCommand("insertHTML", false, `<a href="${esc(url)}">${esc(url)}</a>`);
  document.getElementById("lf-" + key).hidden = true;
  linkRange = null;
  syncEditor(ed);
}
function removeLink(key) {
  const ed = editorOf(key);
  const a = linkAt(ed, linkRange);
  if (a) a.replaceWith(...a.childNodes);
  else { restore(ed, linkRange); document.execCommand("unlink"); }
  document.getElementById("lf-" + key).hidden = true;
  restore(ed, null);
  linkRange = null;
  syncEditor(ed);
}
// кнопки оформления не забирают выделение у текста
document.addEventListener("mousedown", (e) => {
  if (e.target.closest && e.target.closest(".fmt-btn")) e.preventDefault();
});
document.addEventListener("click", (e) => {
  if (!draft || !e.target.closest) return;
  const fb = e.target.closest(".fmt-btn");
  if (fb) {
    const ed = editorOf(fb.dataset.for);
    if (fb.dataset.cmd === "link") { openLinkForm(fb.dataset.for); return; }
    if (!selectionIn(ed)) restore(ed, null);
    document.execCommand("styleWithCSS", false, false);
    document.execCommand(fb.dataset.cmd);
    syncEditor(ed);
    return;
  }
  const ap = e.target.closest("[data-link-apply]");
  if (ap) { applyLink(ap.dataset.linkApply); return; }
  const rm = e.target.closest("[data-link-remove]");
  if (rm) { removeLink(rm.dataset.linkRemove); return; }
  const cn = e.target.closest("[data-link-cancel]");
  if (cn) closeLinkForm(cn.dataset.linkCancel);
});
document.addEventListener("keydown", (e) => {
  const t = e.target;
  if (!draft) return;
  if (t.classList && t.classList.contains("rich") && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    openLinkForm(t.id.slice(2));
  }
  if (t.dataset && t.dataset.linkUrl) {
    if (e.key === "Enter") { e.preventDefault(); applyLink(t.dataset.linkUrl); }
    if (e.key === "Escape") { e.preventDefault(); closeLinkForm(t.dataset.linkUrl); }
  }
});
// вставка из буфера — простым текстом, без чужого оформления
document.addEventListener("paste", (e) => {
  if (!e.target.closest || !e.target.closest(".rich")) return;
  e.preventDefault();
  document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
});

// черновик → данные для сохранения: пустые задачи и баги убираем, изменения записываем в список
function prepare(src, prev) {
  const next = clone(src);
  next.tasks = next.tasks.filter((it) => norm(it.name));
  next.tasks.forEach((it) => {
    it.name = norm(it.name); it.label = sanitize(it.label); it.due = norm(it.due); it.owner = norm(it.owner);
    it.subs = (it.subs || []).filter((x) => norm(x.name)).map((x) => ({ id: x.id, name: norm(x.name), done: !!x.done }));
    if (!it.subs.length) delete it.subs;
  });
  next.bugs = next.bugs.filter((b) => norm(b.title));
  next.bugs.forEach((b) => { b.title = norm(b.title); b.desc = sanitize(b.desc); b.task = norm(b.task); b.found = norm(b.found); });
  next.changes = next.changes.filter((c) => c.kind !== "note" || norm(c.text));
  next.reportDate = norm(next.reportDate);
  logChanges(prev, next);
  return next;
}

async function save() {
  if (repo.saving || !draft) return;
  repo.saving = true;
  const btn = document.getElementById("b-save");
  btn.disabled = true; btn.textContent = "Сохраняю в GitHub…";
  let frozen = false;
  try {
    const next = prepare(draft, DATA);
    document.getElementById("page").inert = true; frozen = true;
    await repo.save(next);
    DATA = next; draft = null;
    render();
    setSync("Сохранено в GitHub · " + new Date().toLocaleTimeString("ru-RU"));
  } catch (err) {
    renderTools(err.message);
    setSync(err.message, true);
  } finally {
    repo.saving = false;
    if (frozen) document.getElementById("page").inert = false;
  }
}
