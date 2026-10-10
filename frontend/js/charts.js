(function () {
  "use strict";

  const reduceMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
  const signed = (n) =>
    (n > 0 ? "+" : n < 0 ? "−" : "") + money.format(Math.abs(n));
  const axisMoney = (n) =>
    (n < 0 ? "−$" : "$") + Math.abs(Math.round(n)).toLocaleString("en-US");
  const t = (key, fallback) => {
    const v = window.I18n && window.I18n.t(key);
    return v && v !== key ? v : fallback;
  };
  const esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const empty = (msg) => `<div class="ch-empty">${esc(msg)}</div>`;
  const shortDate = (iso) =>
    new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });

  // Slots that already played their intro animation (language/resize re-renders stay still)
  const animated = new WeakSet();
  function shouldAnimate(el) {
    if (reduceMotion || animated.has(el)) return false;
    animated.add(el);
    return true;
  }
  const nextFrame = (fn) =>
    requestAnimationFrame(() => requestAnimationFrame(fn));

  function countUp(node, to, opts) {
    const o = Object.assign(
      { decimals: 0, suffix: "", duration: 1000, delay: 0 },
      opts,
    );
    const fmt = (v) => v.toFixed(o.decimals) + o.suffix;
    node.textContent = fmt(0);
    const start = performance.now() + o.delay;
    (function tick(now) {
      const p = Math.min(1, Math.max(0, (now - start) / o.duration));
      node.textContent = fmt(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    })(performance.now());
  }

  function niceScale(min, max) {
    const span = max - min || 1;
    const raw = span / 4;
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const f = raw / p;
    const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
    return {
      min: Math.floor(min / step) * step,
      max: Math.ceil(max / step) * step,
      step,
    };
  }

  /* ---------- 1. Profit / Loss trend ---------- */
  function renderTrend(el, trend) {
    if (!trend.some((p) => p.bets > 0))
      return (el.innerHTML = empty(
        t("chart.noData", "No settled bets in the last 30 days."),
      ));

    const animate = shouldAnimate(el);
    // Draw at real pixel size so text and lines stay crisp and the chart is large
    const W = Math.max(300, Math.round(el.clientWidth || 640));
    const H = W < 480 ? 300 : Math.min(420, Math.round(W * 0.5));
    const m = { t: 24, r: 20, b: 40, l: 68 };
    const iw = W - m.l - m.r,
      ih = H - m.t - m.b;

    const vals = trend.map((p) => p.cumulative);
    const sc = niceScale(Math.min(0, ...vals), Math.max(0, ...vals));
    const span = sc.max - sc.min || 1;
    const x = (i) => m.l + (i / (trend.length - 1)) * iw;
    const y = (v) => m.t + (1 - (v - sc.min) / span) * ih;
    const zeroY = y(0);

    const line = trend
      .map(
        (p, i) =>
          `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.cumulative).toFixed(1)}`,
      )
      .join("");
    const area = `${line}L${x(trend.length - 1).toFixed(1)},${zeroY.toFixed(1)}L${x(0).toFixed(1)},${zeroY.toFixed(1)}Z`;

    let grid = "";
    for (let v = sc.min; v <= sc.max + sc.step / 2; v += sc.step) {
      const gy = y(v);
      grid += `<line x1="${m.l}" x2="${W - m.r}" y1="${gy.toFixed(1)}" y2="${gy.toFixed(1)}"/>`;
      grid += `<text x="${m.l - 12}" y="${(gy + 4).toFixed(1)}" text-anchor="end">${axisMoney(v)}</text>`;
    }
    const tickCount = W < 480 ? 4 : 6;
    const tickIdx = [
      ...new Set(
        Array.from({ length: tickCount }, (_, k) =>
          Math.round((k * (trend.length - 1)) / (tickCount - 1)),
        ),
      ),
    ];
    const ticks = tickIdx
      .map(
        (i) =>
          `<text x="${x(i).toFixed(1)}" y="${H - 12}" text-anchor="middle">${shortDate(trend[i].date)}</text>`,
      )
      .join("");

    const dots = trend
      .map((p, i) =>
        p.bets > 0
          ? `<circle class="ch-dot ${p.profit >= 0 ? "is-pos" : "is-neg"}" style="--i:${i}" cx="${x(i).toFixed(1)}" cy="${y(p.cumulative).toFixed(1)}" r="4.5"/>`
          : "",
      )
      .join("");

    const last = trend[trend.length - 1].cumulative;
    el.innerHTML = `
      <div class="ch-wrap ${animate ? "ch-anim" : "ch-static"}">
        <svg class="ch-svg ch-svg--trend" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img"
             aria-label="${esc(t("chart.trendAria", "Cumulative profit and loss, last 30 days"))}: ${esc(signed(last))}">
          <defs>
            <clipPath id="clip-pos"><rect x="0" y="0" width="${W}" height="${zeroY.toFixed(1)}"/></clipPath>
            <clipPath id="clip-neg"><rect x="0" y="${zeroY.toFixed(1)}" width="${W}" height="${Math.max(0, H - zeroY).toFixed(1)}"/></clipPath>
          </defs>
          <g class="ch-grid ch-axis">${grid}${ticks}</g>
          <line class="ch-zero" x1="${m.l}" x2="${W - m.r}" y1="${zeroY.toFixed(1)}" y2="${zeroY.toFixed(1)}"/>
          <g class="ch-pos" clip-path="url(#clip-pos)"><path class="ch-area" d="${area}"/><path class="ch-line" pathLength="1" d="${line}"/></g>
          <g class="ch-neg" clip-path="url(#clip-neg)"><path class="ch-area" d="${area}"/><path class="ch-line" pathLength="1" d="${line}"/></g>
          <g class="ch-dots">${dots}</g>
          <line class="ch-hover-line" y1="${m.t}" y2="${H - m.b}"/>
          <circle class="ch-hover-dot" r="6"/>
          <rect class="ch-hit" x="${m.l}" y="${m.t}" width="${iw}" height="${ih}" fill="transparent"/>
        </svg>
        <div class="ch-tip"></div>
      </div>`;

    const svg = el.querySelector("svg"),
      tip = el.querySelector(".ch-tip");
    const hl = el.querySelector(".ch-hover-line"),
      dot = el.querySelector(".ch-hover-dot");
    const hit = el.querySelector(".ch-hit");

    function show(evt) {
      const r = svg.getBoundingClientRect();
      const px = ((evt.clientX - r.left) / r.width) * W;
      const i = Math.max(
        0,
        Math.min(
          trend.length - 1,
          Math.round(((px - m.l) / iw) * (trend.length - 1)),
        ),
      );
      const p = trend[i];
      hl.setAttribute("x1", x(i));
      hl.setAttribute("x2", x(i));
      hl.style.opacity = 1;
      dot.setAttribute("cx", x(i));
      dot.setAttribute("cy", y(p.cumulative));
      dot.style.opacity = 1;
      dot.style.stroke =
        p.cumulative >= 0 ? "var(--color-primary)" : "var(--color-danger)";
      tip.innerHTML = `<strong>${shortDate(p.date)}</strong>
        ${esc(t("chart.dayResult", "Day"))}: <span class="${p.profit >= 0 ? "text-win" : "text-loss"}">${signed(p.profit)}</span><br>
        ${esc(t("chart.total", "Total"))}: ${signed(p.cumulative)}<br>
        ${esc(t("dash.stake", "Stake"))}: ${money.format(p.stake)} · ${p.bets} ${esc(t("chart.bets", "bets"))}`;
      tip.style.left = `${(x(i) / W) * r.width}px`;
      tip.style.top = `${(y(p.cumulative) / H) * r.height}px`;
      tip.style.opacity = 1;
    }
    function hide() {
      hl.style.opacity = 0;
      dot.style.opacity = 0;
      tip.style.opacity = 0;
    }
    hit.addEventListener("mousemove", show);
    hit.addEventListener("mouseleave", hide);
    hit.addEventListener("touchstart", (e) => show(e.touches[0]), {
      passive: true,
    });
    hit.addEventListener("touchmove", (e) => show(e.touches[0]), {
      passive: true,
    });
    hit.addEventListener("touchend", hide);

    // Redraw (without replaying the intro) when the card is resized
    if (!el.__chartObserver && "ResizeObserver" in window) {
      let lastW = el.clientWidth,
        timer;
      el.__chartObserver = new ResizeObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          if (Math.abs(el.clientWidth - lastW) < 8) return;
          lastW = el.clientWidth;
          renderTrend(el, trend);
        }, 150);
      });
      el.__chartObserver.observe(el);
    }
  }

  /* ---------- 2. Win / Loss / Pending donut ---------- */
  function renderOutcome(el, o) {
    const total = o.won + o.lost + o.pending + o.void;
    if (!total)
      return (el.innerHTML = empty(t("chart.noBets", "No bets recorded yet.")));

    const animate = shouldAnimate(el);
    const items = [
      {
        key: "won",
        label: t("dash.result.won", "Won"),
        color: "var(--color-primary)",
        n: o.won,
      },
      {
        key: "lost",
        label: t("dash.result.lost", "Lost"),
        color: "var(--color-danger)",
        n: o.lost,
      },
      {
        key: "pending",
        label: t("dash.result.pending", "Pending"),
        color: "var(--color-warning)",
        n: o.pending,
      },
      {
        key: "void",
        label: t("dash.result.void", "Void"),
        color: "var(--text-muted)",
        n: o.void,
      },
    ].filter((i) => i.n > 0);

    const R = 62,
      C = 2 * Math.PI * R;
    let offset = 0;
    const rings = items
      .map((i, idx) => {
        const len = (i.n / total) * C;
        const s = `<circle class="seg" data-len="${len}" data-c="${C}" data-d="${idx}" cx="80" cy="80" r="${R}" stroke="${i.color}"
        stroke-dasharray="${animate ? `0 ${C}` : `${len} ${C - len}`}" stroke-dashoffset="${-offset}" transform="rotate(-90 80 80)"/>`;
        offset += len;
        return s;
      })
      .join("");
    const settled = o.won + o.lost;
    const rate = settled ? (o.won / settled) * 100 : null;

    el.innerHTML = `
      <div class="ch-donut-layout ${animate ? "ch-anim" : "ch-static"}">
        <svg class="ch-donut" viewBox="0 0 160 160" role="img"
             aria-label="${esc(t("chart.outcomeAria", "Bet outcomes"))}: ${items.map((i) => i.label + " " + i.n).join(", ")}">
          <circle class="track" cx="80" cy="80" r="${R}"/>
          ${rings}
          <text class="ch-donut-center" x="80" y="82">${rate === null ? "—" : rate.toFixed(1) + "%"}</text>
          <text class="ch-donut-sub" x="80" y="102">${esc(t("dash.winRate", "Win Rate"))}</text>
        </svg>
        <ul class="ch-legend">
          ${items.map((i, idx) => `<li style="--i:${idx}"><span class="dot" style="background:${i.color}"></span>${esc(i.label)}<span class="n">${i.n} · ${((i.n / total) * 100).toFixed(1)}%</span></li>`).join("")}
        </ul>
      </div>`;

    if (animate) {
      nextFrame(() => {
        el.querySelectorAll(".seg").forEach((c) => {
          const len = +c.dataset.len,
            full = +c.dataset.c;
          c.style.transition = `stroke-dasharray .8s cubic-bezier(.3,.7,.2,1) ${(+c.dataset.d * 0.22).toFixed(2)}s`;
          c.setAttribute("stroke-dasharray", `${len} ${full - len}`);
        });
      });
      if (rate !== null)
        countUp(el.querySelector(".ch-donut-center"), rate, {
          decimals: 1,
          suffix: "%",
          duration: 1100,
        });
    }
  }

  /* ---------- 3. Sport performance ---------- */
  function renderSports(el, sports) {
    if (!sports.length)
      return (el.innerHTML = empty(t("chart.noBets", "No bets recorded yet.")));
    const animate = shouldAnimate(el);
    const maxBets = Math.max(...sports.map((s) => s.bets));
    el.innerHTML = `<div class="ch-sports ${animate ? "ch-anim" : "ch-static"}">${sports
      .map(
        (s, idx) => `
      <div class="ch-sport ch-sport--${esc(s.slug)}" style="--i:${idx}">
        <div class="ch-sport-head">
          <span class="name">${esc(s.name)}</span>
          <span class="meta">${s.bets} ${esc(t("chart.bets", "bets"))} · ${s.winRate}% · <span class="${s.profit >= 0 ? "text-win" : "text-loss"}">${signed(s.profit)}</span></span>
        </div>
        <div class="ch-bar-track"><div class="ch-bar-fill" data-w="${(s.bets / maxBets) * 100}" style="width:${animate ? 0 : (s.bets / maxBets) * 100}%;transition-delay:${idx * 0.1}s"></div></div>
      </div>`,
      )
      .join("")}</div>`;
    if (animate)
      nextFrame(() =>
        el
          .querySelectorAll(".ch-bar-fill")
          .forEach((b) => (b.style.width = b.dataset.w + "%")),
      );
  }

  /* ---------- 4. Odds distribution ---------- */
  function renderOdds(el, odds) {
    const max = Math.max(...odds.map((o) => o.total));
    if (!max)
      return (el.innerHTML = empty(t("chart.noBets", "No bets recorded yet.")));
    const animate = shouldAnimate(el);
    el.innerHTML = `<div class="ch-cols ${animate ? "ch-anim" : "ch-static"}">${odds
      .map(
        (o, idx) => `
      <div class="ch-col" style="--i:${idx}">
        <span class="val">${animate ? 0 : o.total}</span>
        <div class="bar" data-h="${(o.total / max) * 100}" style="height:${animate ? 0 : `calc(${(o.total / max) * 100}% * .78)`};transition-delay:${idx * 0.12}s"></div>
        <span class="lbl">${esc(o.label)}</span>
      </div>`,
      )
      .join("")}</div>`;
    if (animate) {
      nextFrame(() =>
        el
          .querySelectorAll(".bar")
          .forEach((b) => (b.style.height = `calc(${b.dataset.h}% * .78)`)),
      );
      el.querySelectorAll(".val").forEach((v, idx) =>
        countUp(v, odds[idx].total, { duration: 900, delay: idx * 120 }),
      );
    }
  }

  /* ---------- Loader ---------- */
  const renderers = {
    "profit-loss": (el, d) => renderTrend(el, d.trend),
    "win-loss": (el, d) => renderOutcome(el, d.outcome),
    "sport-performance": (el, d) => renderSports(el, d.sports),
    "odds-distribution": (el, d) => renderOdds(el, d.odds),
  };

  let cache = null;

  async function render() {
    const slots = document.querySelectorAll("[data-chart]");
    if (!slots.length) return false;
    try {
      if (!cache) {
        const res = await fetch("/api/dashboard/charts", {
          credentials: "same-origin",
        });
        if (!res.ok) throw new Error("HTTP " + res.status);
        cache = (await res.json()).data;
      }
      slots.forEach((el, idx) => {
        const fn = renderers[el.dataset.chart];
        const target = el.querySelector(".db-chart-slot") || el;
        target.classList.add("ch-ready");
        if (!reduceMotion && !el.dataset.entered) {
          el.dataset.entered = "1";
          el.classList.add("ch-panel-enter");
          el.style.setProperty("--enter-delay", `${idx * 0.09}s`);
        }
        if (fn) fn(target, cache);
        else
          console.warn(
            'Charts: unknown data-chart name "' +
              el.dataset.chart +
              '". Expected one of:',
            Object.keys(renderers),
          );
      });
    } catch (err) {
      console.error("Charts failed:", err);
      slots.forEach((el) => {
        const target = el.querySelector(".db-chart-slot") || el;
        target.innerHTML = empty(
          t("dash.error.title", "Something went wrong."),
        );
      });
    }
    return true;
  }

  // Slots may be inserted after DOMContentLoaded (layout.js), so wait for them.
  function start() {
    render().then((found) => {
      if (found) return;
      const obs = new MutationObserver(() => {
        if (document.querySelector("[data-chart]")) {
          obs.disconnect();
          render();
        }
      });
      obs.observe(document.body, { childList: true, subtree: true });
    });
    document.addEventListener("i18n:change", () => render());
  }

  window.Charts = { render };
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", start);
  else start();
})();
