/**
 * <lexorank-demo> — an embeddable, self-isolating demo of @theyoungwolf/lexorank.
 *
 *   <lexorank-demo></lexorank-demo>
 *   <script type="module" src=".../widget.js"></script>
 *
 * The library is loaded from a CDN at runtime, so this file does not need
 * rebuilding when a new version ships. Pin or widen the range with the `lib`
 * attribute:
 *
 *   <lexorank-demo lib="https://esm.sh/@theyoungwolf/lexorank@0.2.0"></lexorank-demo>
 *
 * Everything renders inside a shadow root, so host-page CSS cannot reach in and
 * these styles cannot leak out.
 */

const DEFAULT_LIB = "https://esm.sh/@theyoungwolf/lexorank@^0.1";
const TITLES = [
  "Design the schema",
  "Build the API",
  "Write the tests",
  "Ship to staging",
  "Update the docs",
];

const CSS = `
/* Only layout-neutral things live on :host. Any rule in the host page that
   matches the host element -- including a global star-selector padding reset --
   beats :host regardless of specificity, so the visual shell is applied to
   .root instead, which lives inside the shadow root and is unreachable. */
:host{display:block}
:host([hidden]){display:none}

/* Every public knob is a --lexorank-* custom property with a built-in default.
   Custom properties inherit through the shadow boundary, so the host page can
   set them on the element and reach the internals:

     <lexorank-demo style="--lexorank-accent:#0EA5E9;--lexorank-bg:transparent">

   The defaults stand alone, so the plain two-line embed still looks right. */
.root{
  --violet: var(--lexorank-accent, #534AB7);
  --canvas: var(--lexorank-bg, #F7F7FB);
  --surface: var(--lexorank-surface, #fff);
  --ink:    var(--lexorank-text, #1C1B22);
  --muted:  var(--lexorank-muted, #6B6880);
  --line:   var(--lexorank-border, #E4E3EC);
  --teal-bright: var(--lexorank-positive, #1D9E75);
  --red:    var(--lexorank-negative, #A32D2D);
  --sans:   var(--lexorank-font, system-ui,-apple-system,"Segoe UI",Roboto,sans-serif);
  --mono:   var(--lexorank-mono, ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace);

  /* derived from the accent, so recolouring needs one property, not five */
  --violet-soft: var(--lexorank-accent-soft, #EEEDFE);
  --violet-line: var(--lexorank-accent-line, #CECBF6);
  --teal:#0F6E56; --teal-soft:#E4F6EF; --indigo:#26215C;

  font-family:var(--sans); font-size:16px; line-height:1.5; color:var(--ink); text-align:left;
  background:var(--canvas);
  border:1px solid var(--line);
  border-radius: var(--lexorank-radius, 14px);
  padding: var(--lexorank-padding, 18px);
  container-type:inline-size;
}
/* box-sizing only. A blanket padding reset here would be specificity (0,1,0)
   and would silently outrank element-selector rules such as the button padding
   below. The host page's own reset cannot cross the shadow boundary, so the
   only thing to normalise is the UA default margin on headings and lists. */
.root, .root *{box-sizing:border-box}
h2,p,ul,ol{margin:0;padding:0}
header{display:flex;align-items:baseline;justify-content:space-between;gap:16px;flex-wrap:wrap}
h2{font-size:16px;margin:0;font-weight:600;letter-spacing:-.01em}
.sub{font-size:13px;color:var(--muted);margin:3px 0 15px}
.grid{display:grid;grid-template-columns:1fr 290px;gap:14px;align-items:start}
@container (max-width:700px){ .grid{grid-template-columns:1fr} }
.panel{background:var(--surface);border:1px solid var(--line);border-radius:11px;padding:13px}
.lbl{font-size:10px;letter-spacing:.09em;text-transform:uppercase;color:var(--muted);font-weight:600;margin-bottom:10px}

.board-head{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:10px}
.count{font-size:11px;color:var(--muted);font-variant-numeric:tabular-nums}
#scroller{
  max-height:var(--lexorank-list-height, var(--list-max, 336px)); overflow-y:auto; overscroll-behavior:contain;
  scrollbar-width:thin; scrollbar-color:#D8D6E4 transparent;
  /* fade the clipped edges instead of showing a hard cut */
  -webkit-mask-image:linear-gradient(to bottom,transparent 0,#000 14px,#000 calc(100% - 14px),transparent 100%);
  mask-image:linear-gradient(to bottom,transparent 0,#000 14px,#000 calc(100% - 14px),transparent 100%);
  padding:8px 2px;margin:-8px -2px;
}
#scroller.at-top{-webkit-mask-image:linear-gradient(to bottom,#000 calc(100% - 14px),transparent 100%);
  mask-image:linear-gradient(to bottom,#000 calc(100% - 14px),transparent 100%)}
#scroller.at-bottom{-webkit-mask-image:linear-gradient(to bottom,transparent 0,#000 14px);
  mask-image:linear-gradient(to bottom,transparent 0,#000 14px)}
#scroller.no-scroll{-webkit-mask-image:none;mask-image:none;overflow-y:visible}
#scroller::-webkit-scrollbar{width:7px}
#scroller::-webkit-scrollbar-track{background:transparent}
#scroller::-webkit-scrollbar-thumb{background:#D8D6E4;border-radius:4px}
#scroller::-webkit-scrollbar-thumb:hover{background:#BFBCD0}
#list{touch-action:none;user-select:none}
.card:last-child{margin-bottom:0}
.card{display:flex;align-items:center;gap:11px;background:var(--surface);border:1px solid var(--line);
  border-radius:9px;padding:11px 13px;margin-bottom:7px;cursor:grab;
  transition:border-color .12s,box-shadow .12s,transform .18s cubic-bezier(.2,.9,.3,1)}
.card:hover{border-color:var(--violet-line)}
.card:focus-visible{outline:2px solid var(--violet);outline-offset:2px}
.card.lift{cursor:grabbing;border-color:var(--violet);box-shadow:0 8px 22px rgba(38,33,92,.16);
  position:relative;z-index:5;transition:none}
.card.flash{animation:flash .7s ease-out}
@keyframes flash{0%{background:var(--teal-soft);border-color:var(--teal-bright)}100%{background:var(--surface);border-color:var(--line)}}
.grip{color:#C6C4D4;font-size:15px;line-height:1;flex-shrink:0}
.title{font-size:14px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rank{font-family:var(--mono);font-size:11.5px;color:var(--violet);background:var(--violet-soft);
  padding:3px 7px;border-radius:5px;flex-shrink:0;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rank.deep{color:#7A3A12;background:#FDF0E7}

.btns{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}
button{font-family:inherit;font-size:12.5px;padding:7px 12px;border-radius:7px;cursor:pointer;
  border:1px solid var(--line);background:var(--surface);color:var(--ink);transition:all .12s}
button:hover:not(:disabled){border-color:var(--violet);color:var(--violet)}
button:focus-visible{outline:2px solid var(--violet);outline-offset:2px}
button:disabled{opacity:.45;cursor:not-allowed}
button.primary{background:var(--violet);border-color:var(--violet);color:#fff}
button.primary:hover:not(:disabled){background:#443BA3;color:#fff}

.stat{display:flex;justify-content:space-between;align-items:baseline;padding:9px 0;border-bottom:1px solid var(--line)}
.stat:last-of-type{border-bottom:0}
.stat .k{font-size:12.5px;color:var(--muted)}
.stat .v{font-family:var(--mono);font-size:19px;font-weight:600}
.v.good{color:var(--teal-bright)} .v.bad{color:var(--red)}
.note{font-size:11.5px;color:var(--muted);line-height:1.5;margin:9px 0 0}

#log{font-family:var(--mono);font-size:11px;line-height:1.65;max-height:168px;overflow-y:auto;
  background:#FAFAFD;border:1px solid var(--line);border-radius:8px;padding:9px}
#log div{padding:2px 0;border-bottom:1px solid #F0EFF6;word-break:break-all}
#log div:last-child{border-bottom:0}
#log .ok{color:var(--teal)} #log .err{color:var(--red)} #log .dim{color:var(--muted)}

.meter{height:5px;background:var(--line);border-radius:3px;overflow:hidden;margin-top:7px}
.meter i{display:block;height:100%;background:var(--teal-bright);transition:width .3s,background .3s}
.meter i.warn{background:#E08A3C} .meter i.hot{background:var(--red)}

.state{padding:26px 4px;text-align:center;font-size:13px;color:var(--muted)}
.state code{font-family:var(--mono);font-size:12px;color:var(--ink)}
.state a{color:var(--violet)}
@media (prefers-reduced-motion:reduce){ *{animation:none!important;transition:none!important} }
`;

const HTML = `
<header>
  <h2>Drag a card. Watch what changes.</h2>
  <button id="reset">Reset</button>
</header>
<p class="sub">Every card stores a rank string. Reordering rewrites exactly one of them.</p>
<div class="grid">
  <div class="panel">
    <div class="board-head">
      <span class="lbl" style="margin:0">Board</span>
      <span class="count" id="count"></span>
    </div>
    <div id="scroller"><div id="list"></div></div>
    <div class="btns">
      <button id="stress" class="primary">Drop 20 cards at the top</button>
      <button id="rebalance">Rebalance</button>
    </div>
    <p class="note">Drag a card, or use the buttons. Keyboard: focus a card and press &uarr; or &darr;.</p>
  </div>
  <div>
    <div class="panel" style="margin-bottom:14px">
      <div class="lbl">Rows written</div>
      <div class="stat"><span class="k">With rank strings</span><span class="v good" id="w-lexo">0</span></div>
      <div class="stat"><span class="k">With integer positions</span><span class="v bad" id="w-int">0</span></div>
      <p class="note">Integer positions renumber everything below the drop point.</p>
    </div>
    <div class="panel" style="margin-bottom:14px">
      <div class="lbl">Deepest minor</div>
      <div class="stat" style="padding-top:0"><span class="k">digits used</span><span class="v" id="depth">0</span></div>
      <div class="meter"><i id="meter" style="width:0%"></i></div>
      <p class="note" id="d-note"></p>
    </div>
    <div class="panel">
      <div class="lbl">Calls</div>
      <div id="log"></div>
    </div>
  </div>
</div>`;

class LexorankDemo extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    const shadow = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = CSS;

    // Everything visual hangs off .root, not the host element.
    const root = document.createElement("div");
    root.className = "root";
    shadow.append(style, root);

    const state = document.createElement("div");
    state.className = "state";
    state.textContent = "Loading the library…";
    root.append(state);

    const url = this.getAttribute("lib") || DEFAULT_LIB;
    import(/* webpackIgnore: true */ /* @vite-ignore */ url)
      .then((lib) => {
        state.remove();
        this.#boot(shadow, root, lib);
      })
      .catch(() => {
        state.innerHTML =
          `Couldn't load <code>@theyoungwolf/lexorank</code> from the CDN. ` +
          `<a href="https://www.npmjs.com/package/@theyoungwolf/lexorank">View the package</a>.`;
      });
  }

  #boot(shadow, root, lex) {
    root.innerHTML = HTML;

    const {
      firstRank,
      rankAfter,
      rankBetween,
      compareRanks,
      minorLength,
      rebalance,
      MAX_MINOR_LENGTH,
    } = lex;
    const MAXD = MAX_MINOR_LENGTH ?? 128;
    const $ = (id) => shadow.getElementById(id);
    const listEl = $("list");
    const scroller = $("scroller");

    let rows = [],
      wLexo = 0,
      wInt = 0,
      n = 0,
      drag = null;

    const log = (msg, cls = "") => {
      const d = document.createElement("div");
      if (cls) d.className = cls;
      d.textContent = msg;
      $("log").prepend(d);
      while ($("log").children.length > 50) $("log").lastChild.remove();
    };
    const sorted = () => [...rows].sort((a, b) => compareRanks(a.rank, b.rank));

    /** Show a fade only on the side that actually has clipped content. */
    function updateFade() {
      const overflowing = scroller.scrollHeight > scroller.clientHeight + 1;
      scroller.classList.toggle("no-scroll", !overflowing);
      if (!overflowing) return;
      scroller.classList.toggle("at-top", scroller.scrollTop <= 1);
      scroller.classList.toggle(
        "at-bottom",
        scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1,
      );
    }
    scroller.addEventListener("scroll", updateFade, { passive: true });

    function render(flashId) {
      listEl.replaceChildren();
      for (const t of sorted()) {
        const deep = minorLength(t.rank) > 8;
        const el = document.createElement("div");
        el.className = "card" + (t.id === flashId ? " flash" : "");
        el.dataset.id = t.id;
        el.tabIndex = 0;
        el.innerHTML = `<span class="grip" aria-hidden="true">⣿</span><span class="title"></span><span class="rank${
          deep ? " deep" : ""
        }"></span>`;
        el.querySelector(".title").textContent = t.title;
        el.querySelector(".rank").textContent = t.rank;
        listEl.append(el);
      }
      $("count").textContent = `${rows.length} card${rows.length === 1 ? "" : "s"}`;
      $("w-lexo").textContent = wLexo;
      $("w-int").textContent = wInt;
      updateFade();

      const deepest = Math.max(0, ...rows.map((t) => minorLength(t.rank)));
      $("depth").textContent = deepest;
      const m = $("meter");
      m.style.width = `${Math.max(deepest ? 3 : 0, Math.min(100, (deepest / MAXD) * 100))}%`;
      m.className = deepest > 64 ? "hot" : deepest > 24 ? "warn" : "";
      $("d-note").textContent =
        deepest === 0
          ? "Zero in ordinary use. Grows only when cards land in the same slot repeatedly."
          : deepest > 24
            ? `${deepest} of ${MAXD} digits. Time to rebalance — the button clears it.`
            : `${deepest} of ${MAXD} digits. Plenty of room left.`;
      $("rebalance").disabled = deepest === 0;
    }

    function seed() {
      rows = [];
      wLexo = 0;
      wInt = 0;
      n = 0;
      $("log").replaceChildren();
      let r = firstRank();
      for (const title of TITLES) {
        rows.push({ id: `t${n++}`, title, rank: r });
        r = rankAfter(r);
      }
      log(`firstRank() → ${rows[0].rank}`, "ok");
      log(`rankAfter() × ${TITLES.length - 1} to seed the board`, "dim");
      render();
    }

    /** The entire application-side move handler. */
    function moveTo(id, index) {
      const items = sorted();
      const others = items.filter((t) => t.id !== id);
      const before = others[index - 1]?.rank ?? null;
      const after = others[index]?.rank ?? null;
      let next;
      try {
        next = rankBetween(before, after);
      } catch (e) {
        log(`${e.constructor.name}: ${e.message.slice(0, 56)}`, "err");
        return;
      }

      const row = rows.find((t) => t.id === id);
      if (row.rank === next) {
        log("already there — no write", "dim");
        return;
      }
      row.rank = next;
      wLexo += 1;
      wInt += Math.abs(index - items.findIndex((t) => t.id === id)) + 1;
      log(`rankBetween(${before ?? "null"}, ${after ?? "null"}) → ${next}`, "ok");
      render(id);
    }

    $("stress").addEventListener("click", () => {
      const items = sorted();
      if (items.length < 2) return;
      let high = items[1].rank,
        added = 0;
      const low = items[0].rank;
      for (let i = 0; i < 20; i++) {
        try {
          const r = rankBetween(low, high);
          rows.push({ id: `t${n++}`, title: `Card ${n}`, rank: r });
          high = r;
          wLexo += 1;
          wInt += rows.length;
          added++;
        } catch (e) {
          log(`${e.constructor.name} after ${added}`, "err");
          break;
        }
      }
      log(`dropped ${added} cards into the same slot`, "dim");
      render();
      scroller.scrollTo({ top: 0, behavior: "smooth" });
    });

    $("rebalance").addEventListener("click", () => {
      const items = sorted();
      const fresh = rebalance(items.length);
      items.forEach((t, i) => {
        rows.find((r) => r.id === t.id).rank = fresh[i];
      });
      wLexo += items.length;
      wInt += items.length;
      log(`rebalance(${items.length}) → every minor back to 0`, "ok");
      render();
    });

    $("reset").addEventListener("click", seed);

    /** Position the lifted card and shuffle the others out of its way. */
    function applyDrag() {
      if (!drag) return;
      // Scrolling moves the card with its container, so fold that in.
      const dy = drag.lastY - drag.startY + (scroller.scrollTop - drag.startScroll);
      drag.el.style.transform = `translateY(${dy}px)`;
      const to = Math.max(
        0,
        Math.min(listEl.children.length - 1, drag.from + Math.round(dy / drag.h)),
      );
      if (to === drag.to) return;
      drag.to = to;
      for (const [i, c] of [...listEl.children].entries()) {
        if (c === drag.el) continue;
        c.style.transform =
          i > drag.from && i <= to
            ? `translateY(${-drag.h}px)`
            : i < drag.from && i >= to
              ? `translateY(${drag.h}px)`
              : "";
      }
    }

    /** Scroll the list when a dragged card is held near either edge. */
    function autoScroll() {
      if (!drag) return;
      const { top, bottom } = scroller.getBoundingClientRect();
      const EDGE = 46;
      const step = drag.lastY < top + EDGE ? -9 : drag.lastY > bottom - EDGE ? 9 : 0;
      if (step) {
        const before = scroller.scrollTop;
        scroller.scrollTop += step;
        if (scroller.scrollTop !== before) applyDrag();
      }
      drag.raf = requestAnimationFrame(autoScroll);
    }

    listEl.addEventListener("pointerdown", (e) => {
      const card = e.target.closest(".card");
      if (!card) return;
      const i = [...listEl.children].indexOf(card);
      drag = {
        id: card.dataset.id,
        el: card,
        from: i,
        to: i,
        startY: e.clientY,
        lastY: e.clientY,
        startScroll: scroller.scrollTop,
        h: card.offsetHeight + 7,
        raf: 0,
      };
      card.setPointerCapture(e.pointerId);
      card.classList.add("lift");
      drag.raf = requestAnimationFrame(autoScroll);
    });

    listEl.addEventListener("pointermove", (e) => {
      if (!drag) return;
      drag.lastY = e.clientY;
      applyDrag();
    });

    const endDrag = () => {
      if (!drag) return;
      const { id, from, to, raf } = drag;
      cancelAnimationFrame(raf);
      for (const c of listEl.children) c.style.transform = "";
      drag.el.classList.remove("lift");
      drag = null;
      if (to !== from) moveTo(id, to);
      else render();
    };
    listEl.addEventListener("pointerup", endDrag);
    listEl.addEventListener("pointercancel", endDrag);

    listEl.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      const card = e.target.closest(".card");
      if (!card) return;
      e.preventDefault();
      const cards = [...listEl.children];
      const to = cards.indexOf(card) + (e.key === "ArrowUp" ? -1 : 1);
      if (to < 0 || to >= cards.length) return;
      const id = card.dataset.id;
      moveTo(id, to);
      requestAnimationFrame(() => root.querySelector(`[data-id="${id}"]`)?.focus());
    });

    seed();
  }
}

if (!customElements.get("lexorank-demo")) customElements.define("lexorank-demo", LexorankDemo);
