/* Digital SAT mock quizzes — 單字查詢（與教甄選擇題網站相同的格式）
   黃底 = SAT 字卡單字（滑過＝中英解釋＋發音＋字卡連結，點兩下開字卡）
   藍色虛線 = 補充字（不在 SAT 字卡；本頁字彙表或補充字表）
   需要先載入 sat-vocab.js（window.TK_VOCAB）與 extra-vocab.js（window.TK_EXTRA）。
   中文翻譯、錯題本等原有功能完全不變。 */
(function () {
  "use strict";
  const SITE = "https://jenniferenglishteacher.github.io/Barron-s-1100-words-webpage-new/";
  const CAM = w => "https://dictionary.cambridge.org/search/english-chinese-traditional/direct/?q=" + encodeURIComponent(w);
  const V = window.TK_VOCAB || {};
  const X = Object.assign({}, window.TK_EXTRA || {});   // 補充字；下面再加入本頁字彙
  const K_REVIEW = "barrons1100-review-list";            // 與 SAT Vocabulary Board 共用的複習清單
  const SAME_SITE = /(^|\.)jenniferenglishteacher\.github\.io$/.test(location.hostname);
  // 太常見、標示出來只會干擾閱讀的字
  const SKIP = new Set(("according common simple people water large small great place point state number order power change light level story study world house group party company system public present general special current process result effect nature natural figure period object subject matter course force account direct certain clear close early fine free full hard high human late likely local long major minor modern open plain poor rich right short single strong whole rather quite really return support include involve provide require consider continue create describe explain example research social important different possible popular complete final recent original actual serious useful notice share spread follow focus handle imagine improve manage mention prepare protect raise range record report search seek solve species structure surface theory thought value variety version volume student school question answer choice sentence text word phrase passage information idea main most best function logical precise conventions standard english underlined following notes topic audience goal relevant data table graph statement finding researchers experiment results technology").split(" "));

  const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

  // ---------- 本頁字彙（Cambridge 連結字＋選項字義）加入補充字表 ----------
  function addGloss(w, p, d, c) {
    w = String(w || "").toLowerCase().trim();
    if (!w || /\s/.test(w) || !d || !c || X[w]) return;
    X[w] = { p: p || "", d: d, c: c };
  }
  (function pageGlossary() {
    const data = window.DATA || (typeof DATA !== "undefined" ? DATA : null); // eslint-disable-line no-undef
    if (!Array.isArray(data)) return;
    const box = document.createElement("div");
    data.forEach(q => {
      if (q.defs) Object.values(q.defs).forEach(d => d && addGloss(d.word, d.pos, d.en, d.zh));
      if (q.body && q.body.includes("dict")) {
        box.innerHTML = q.body;
        box.querySelectorAll("a.dict").forEach(a => addGloss(a.dataset.w, a.dataset.pos, a.dataset.en, a.dataset.zh));
      }
    });
  })();

  // ---------- 單字比對：字形變化還原成原形 ----------
  function lemma(word, dict) {
    const w = word.toLowerCase();
    if (SKIP.has(w)) return null;
    if (dict[w]) return SKIP.has(w) ? null : w;
    if (w.length < 5) return null;
    const c = [];
    const add = x => { if (x.length >= 4) c.push(x); };
    const undouble = x => (/([b-df-hj-np-tv-z])\1$/.test(x) ? x.slice(0, -1) : null);
    const stem = b => { add(b); add(b + "e"); const u = undouble(b); if (u) add(u); };
    if (w.endsWith("ies")) add(w.slice(0, -3) + "y");
    if (w.endsWith("es")) add(w.slice(0, -2));
    if (w.endsWith("s") && !w.endsWith("ss")) add(w.slice(0, -1));
    if (w.endsWith("ied")) add(w.slice(0, -3) + "y");
    if (w.endsWith("ed")) stem(w.slice(0, -2));
    if (w.endsWith("ing")) stem(w.slice(0, -3));
    if (w.endsWith("ily")) add(w.slice(0, -3) + "y");
    if (w.endsWith("ly")) add(w.slice(0, -2));
    for (const x of c) if (dict[x] && !SKIP.has(x)) return x;
    return null;
  }
  function span(text, w, isX) {
    const s = el("span", isX ? "sat gl" : "sat", text);
    s.tabIndex = 0; s.dataset.w = w; if (isX) s.dataset.x = "1";
    return s;
  }
  // extra=true：SAT 字卡沒有的字，用補充字表標示（選項用）
  function wrapText(node, extra) {
    const parts = node.nodeValue.split(/([A-Za-z]+(?:-[A-Za-z]+)*)/);
    if (parts.length < 2) return;
    let changed = false;
    const frag = document.createDocumentFragment();
    const word = part => {
      const l = lemma(part, V);
      if (l) { changed = true; return span(part, l, false); }
      if (extra) { const x = lemma(part, X); if (x) { changed = true; return span(part, x, true); } }
      if (part.includes("-")) {
        const f = document.createDocumentFragment();
        part.split("-").forEach((p, i) => { if (i) f.append("-"); f.append(word(p)); });
        return f;
      }
      return document.createTextNode(part);
    };
    parts.forEach((part, i) => frag.append(i % 2 ? word(part) : part));
    if (changed) node.replaceWith(frag);
  }
  function walk(root, extra) {
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: n => (n.parentElement.closest(".sat, b, script, style") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT)
    });
    const list = []; while (tw.nextNode()) list.push(tw.currentNode);
    list.forEach(n => wrapText(n, extra));
  }
  // 原本的 Cambridge 連結字（a.dict）換成同樣格式的標示，Cambridge 連結移到小卡裡
  function convertDict(root) {
    root.querySelectorAll("a.dict").forEach(a => {
      const text = a.textContent, base = (a.dataset.w || text).toLowerCase();
      const sat = lemma(text, V) || (V[base] && !SKIP.has(base) ? base : null);
      if (!sat) addGloss(base, a.dataset.pos, a.dataset.en, a.dataset.zh);
      a.replaceWith(sat ? span(text, sat, false) : (X[base] ? span(text, base, true) : document.createTextNode(text)));
    });
  }
  function processItem(art) {
    if (art.dataset.tk) return;
    art.dataset.tk = "1";
    art.querySelectorAll(".question, .stem").forEach(n => { convertDict(n); walk(n, false); });
    art.querySelectorAll(".choice").forEach(n => walk(n, true));
  }
  function processAll() { document.querySelectorAll(".mock:not([data-tk])").forEach(processItem); }

  // ---------- 發音 ----------
  function speak(text) {
    if (!("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.lang = "en-US"; u.rate = 0.92;
    const v = speechSynthesis.getVoices().find(v => /en-US/i.test(v.lang)); if (v) u.voice = v;
    speechSynthesis.speak(u);
  }

  // ---------- 查字小卡 ----------
  const tip = el("div", "tk-tip"); tip.hidden = true;
  let pinned = false, hoverTimer = null, leaveTimer = null, tipWord = null;
  const cardUrl = (src, w) => SITE + src[1] + "#w=" + encodeURIComponent(w);

  function showTip(t, pin) {
    const w = t.dataset.w, isX = t.dataset.x === "1", e = isX ? X[w] : V[w];
    if (!e) return;
    tipWord = w; pinned = !!pin;
    tip.replaceChildren();
    const head = el("div", "tk-tip-head");
    head.append(el("strong", null, w), el("span", "tk-tip-pos", e.p));
    const sp = el("button", "tk-tip-btn", "🔊 發音"); sp.type = "button";
    sp.addEventListener("click", () => speak(w));
    head.append(sp);
    tip.append(head, el("p", "tk-tip-en", e.d), el("p", "tk-tip-zh", e.c));
    const links = el("div", "tk-tip-links");
    if (!isX) (e.s || []).forEach(src => {
      const a = el("a", null, "🗂 字卡：" + src[0]); a.href = cardUrl(src, w); a.target = "_blank"; a.rel = "noopener"; links.append(a);
    });
    const cam = el("a", null, "📖 Cambridge 英漢字典"); cam.href = CAM(w); cam.target = "_blank"; cam.rel = "noopener"; links.append(cam);
    if (!isX && SAME_SITE && e.s && e.s[0]) {
      const key = e.s[0][2], b = el("button", "tk-tip-btn"); b.type = "button";
      const paint = () => { b.textContent = load(K_REVIEW, []).includes(key) ? "✓ 已在複習清單（點一下移除）" : "＋ 加入複習清單"; };
      b.addEventListener("click", () => { const l = load(K_REVIEW, []), i = l.indexOf(key); if (i >= 0) l.splice(i, 1); else l.push(key); save(K_REVIEW, l); paint(); });
      paint(); links.append(b);
    }
    tip.append(links);
    tip.append(el("p", "tk-tip-hint", isX ? "補充字（不在你的 SAT 字卡）" : (pin ? "點空白處關閉" : "游標可移到小卡上點連結 · 點兩下單字開字卡")));
    tip.classList.toggle("is-extra", isX);
    tip.classList.toggle("is-pinned", pinned);
    tip.hidden = false;
    const r = t.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
    let top = r.bottom + 8;
    if (top + th > innerHeight - 8) top = Math.max(8, r.top - th - 8);
    tip.style.left = Math.max(8, Math.min(r.left + r.width / 2 - tw / 2, innerWidth - tw - 8)) + "px";
    tip.style.top = top + "px";
  }
  function hideTip() { tip.hidden = true; pinned = false; tipWord = null; }
  function leaveSoon() { clearTimeout(leaveTimer); leaveTimer = setTimeout(() => { if (!pinned) hideTip(); }, 350); }

  function initTips() {
    document.body.append(tip);
    document.addEventListener("pointerover", ev => {
      if (ev.pointerType !== "mouse" || pinned) return;
      const t = ev.target.closest && ev.target.closest(".sat"); if (!t) return;
      clearTimeout(leaveTimer);
      if (tipWord === t.dataset.w && !tip.hidden) return;
      showTip(t, false);
      clearTimeout(hoverTimer); hoverTimer = setTimeout(() => speak(t.dataset.w), 150);
    });
    document.addEventListener("pointerout", ev => {
      if (ev.pointerType !== "mouse" || pinned) return;
      if (ev.target.closest && ev.target.closest(".sat")) { clearTimeout(hoverTimer); leaveSoon(); }
    });
    tip.addEventListener("pointerenter", () => clearTimeout(leaveTimer));
    tip.addEventListener("pointerleave", ev => { if (ev.pointerType === "mouse" && !pinned) leaveSoon(); });
    document.addEventListener("click", ev => {
      if (tip.contains(ev.target)) return;
      const t = ev.target.closest && ev.target.closest(".sat");
      if (t) {
        const choice = t.closest(".choice");
        if (choice && !choice.disabled) { hideTip(); return; }  // 還沒作答：點選項＝作答
        if (pinned && tipWord === t.dataset.w) { hideTip(); return; }
        showTip(t, true); speak(t.dataset.w); return;
      }
      if (pinned) hideTip();
    });
    document.addEventListener("dblclick", ev => {
      const t = ev.target.closest && ev.target.closest(".sat");
      if (!t || t.dataset.x === "1" || !V[t.dataset.w] || !V[t.dataset.w].s) return;
      window.open(cardUrl(V[t.dataset.w].s[0], t.dataset.w), "_blank", "noopener");
    });
    document.addEventListener("keydown", ev => {
      if (ev.key === "Escape") hideTip();
      if (ev.key === "Enter" && ev.target.classList && ev.target.classList.contains("sat")) { showTip(ev.target, true); speak(ev.target.dataset.w); }
    });
    addEventListener("scroll", () => { if (!pinned) hideTip(); }, { passive: true });
  }

  const css = `
  .sat { background:#fff1b8; border-bottom:2px solid #d99a00; border-radius:3px; padding:0 2px; cursor:help; }
  .sat:focus { outline:2px solid #1d4ed8; }
  .sat.gl { background:#e8f1ff; border-bottom:2px dotted #3b6fd8; }
  .tk-tip { position:fixed; z-index:60; width:min(340px, calc(100vw - 16px)); background:#fff; border:1px solid #d99a00; border-radius:10px; box-shadow:0 8px 24px rgba(0,0,0,.18); padding:10px 12px; font-size:.92rem; line-height:1.5; color:#1f2933; text-align:left; font-weight:400; }
  .tk-tip.is-extra { border-color:#3b6fd8; }
  .tk-tip-head { display:flex; align-items:baseline; gap:8px; }
  .tk-tip-head strong { font-size:1.1rem; }
  .tk-tip-pos { color:#5b6770; font-style:italic; margin-right:auto; }
  .tk-tip p { margin:4px 0; }
  .tk-tip-zh { font-weight:600; }
  .tk-tip-links { display:flex; flex-direction:column; gap:4px; margin-top:6px; }
  .tk-tip-links a { color:#1d4ed8; }
  .tk-tip-btn { font:inherit; font-size:.85rem; border:1px solid #d9dee3; background:#fafbfc; border-radius:6px; padding:2px 8px; cursor:pointer; text-align:left; }
  .tk-tip-hint { color:#5b6770; font-size:.78rem; }
  .choice .sat { cursor:pointer; }
  @media print { .sat, .sat.gl { background:none; border:0; padding:0; } .tk-tip { display:none; } }`;

  function start() {
    document.head.append(el("style", null, css));
    initTips();
    processAll();
    const root = document.getElementById("quiz") || document.body;
    new MutationObserver(() => processAll()).observe(root, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
