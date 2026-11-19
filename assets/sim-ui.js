
(function () {
  "use strict";
  var S = window.SIM;
  var $ = function (id) { return document.getElementById(id); };
  function fin(x) { return x !== null && x !== undefined && isFinite(x); }
  function Y(x) { return fin(x) ? Math.round(x).toLocaleString("ja-JP") + " 円" : "—"; }
  function N(x, d) { return fin(x) ? Number(x).toLocaleString("ja-JP", {maximumFractionDigits: d === undefined ? 1 : d}) : "—"; }
  function P(x, d) { return fin(x) ? (x * 100).toLocaleString("ja-JP", {maximumFractionDigits: d === undefined ? 2 : d}) + "%" : "—"; }
  function MAN(x) { return fin(x) ? (x / 10000).toLocaleString("ja-JP", {maximumFractionDigits: 1}) + " 万円" : "—"; }
  function H(s) { return String(s).replace(/[&<>"]/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]; }); }
  function val(id) { var e = $(id); if (!e || e.closest("[hidden]")) return null; var x = e.value.trim(); return x === "" || isNaN(Number(x)) ? null : Number(x); }
  function pct(id) { var x = val(id); return x === null ? null : x / 100; }
  function dl(rows) {
    return '<dl class="k-dl">' + rows.filter(Boolean).map(function (r) {
      return '<div' + (r[2] ? ' class="' + r[2] + '"' : "") + '><dt>' + r[0] + '</dt><dd>' + r[1] + '</dd></div>';
    }).join("") + "</dl>";
  }
  function seg(sel, cb) {
    document.querySelectorAll(sel).forEach(function (b) {
      b.addEventListener("click", function () {
        b.parentNode.querySelectorAll("button").forEach(function (x) { x.classList.toggle("on", x === b); });
        cb(b);
      });
    });
  }
  function nice(m) {
    if (!(m > 0)) return 1;
    var p = Math.pow(10, Math.floor(Math.log10(m))), f = m / p;
    var st = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
    for (var i = 0; i < st.length; i++) if (f <= st[i] + 1e-9) return st[i] * p;
    return 10 * p;
  }

  var chartN = 0;
  
  function chart(o) {
    var W = o.w || 720, Hh = o.h || 300, R = 18, T = 18, B = 42;
    var xm = nice(o.xmax / 4) * 4, ym = nice(o.ymax / 4) * 4;
    var tl = 0; for (var q = 0; q <= 4; q++) tl = Math.max(tl, String(o.yfmt(ym * q / 4)).length);
    var L = Math.max(44, 14 + tl * 8 + (o.ylab ? 18 : 0));
    var X = function (v) { return L + (W - L - R) * Math.min(v, xm) / xm; }, Yp = function (v) { return Hh - B - (Hh - B - T) * Math.min(Math.max(v, 0), ym) / ym; };
    var g = "";
    (o.shade || []).forEach(function (s) { g += '<rect x="' + X(s[0]) + '" y="' + T + '" width="' + Math.max(0, X(s[1]) - X(s[0])) + '" height="' + (Hh - B - T) + '" class="c-shade"/>'; });
    for (var i = 0; i <= 4; i++) {
      var yv = ym * i / 4, xv = xm * i / 4;
      g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Yp(yv) + '" y2="' + Yp(yv) + '" class="c-grid"/>';
      g += '<text x="' + (L - 8) + '" y="' + (Yp(yv) + 4) + '" class="c-t" text-anchor="end">' + H(o.yfmt(yv)) + '</text>';
      g += '<text x="' + X(xv) + '" y="' + (Hh - B + 18) + '" class="c-t" text-anchor="middle">' + H(o.xfmt(xv)) + '</text>';
    }
    g += '<line x1="' + L + '" y1="' + (Hh - B) + '" x2="' + (W - R) + '" y2="' + (Hh - B) + '" class="c-ax"/><line x1="' + L + '" y1="' + T + '" x2="' + L + '" y2="' + (Hh - B) + '" class="c-ax"/>';
    (o.hl || []).forEach(function (h, k) {
      if (!fin(h.y) || h.y > ym) return;
      var left = k % 2 === 1;
      g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Yp(h.y) + '" y2="' + Yp(h.y) + '" class="' + (h.cls || "c-hl") + '"/><text x="' + (left ? L + 6 : W - R - 4) + '" y="' + (Yp(h.y) + (left ? 14 : -5)) + '" class="c-t c-hlt" text-anchor="' + (left ? "start" : "end") + '">' + H(h.t) + '</text>';
    });
    (o.vl || []).forEach(function (v) {
      if (!fin(v.x) || v.x > xm) return;
      g += '<line y1="' + T + '" y2="' + (Hh - B) + '" x1="' + X(v.x) + '" x2="' + X(v.x) + '" class="' + (v.cls || "c-vl") + '"/><text x="' + (X(v.x) + 5) + '" y="' + (T + 12) + '" class="c-t">' + H(v.t) + '</text>';
    });
    var cid = "cl" + (++chartN);
    g += '<clipPath id="' + cid + '"><rect x="' + L + '" y="' + T + '" width="' + (W - L - R) + '" height="' + (Hh - B - T) + '"/></clipPath><g clip-path="url(#' + cid + ')">';
    var Xr = function (v) { return L + (W - L - R) * v / xm; }, Yr = function (v) { return Hh - B - (Hh - B - T) * v / ym; };
    (o.lines || []).forEach(function (ln) {
      g += '<polyline class="' + (ln.cls || "c-line") + '" points="' + ln.pts.filter(function (p) { return fin(p[1]); }).map(function (p) { return Xr(p[0]).toFixed(1) + "," + Yr(p[1]).toFixed(1); }).join(" ") + '"/>';
    });
    g += "</g>";
    (o.dots || []).forEach(function (d) {
      if (!fin(d.y)) return;
      g += '<circle cx="' + X(d.x) + '" cy="' + Yp(d.y) + '" r="' + (d.r || 5) + '" class="' + (d.cls || "c-dot") + '"/>';
      if (d.t) {
        var px = X(d.x), an = d.anchor || "start", dx = d.dx || 8;
        if (an === "end" && px < L + 90) { an = "start"; dx = 10; }
        if (an === "start" && px > W - R - 90) { an = "end"; dx = -10; }
        g += '<text x="' + (px + dx) + '" y="' + (Yp(d.y) - (d.dy || 8)) + '" class="c-t c-dt" text-anchor="' + an + '">' + H(d.t) + '</text>';
      }
    });
    g += '<text x="' + ((W + L) / 2) + '" y="' + (Hh - 6) + '" class="c-t c-lab" text-anchor="middle">' + H(o.xlab) + '</text>';
    if (o.ylab) g += '<text x="14" y="' + ((Hh - B) / 2) + '" class="c-t c-lab" text-anchor="middle" transform="rotate(-90 14 ' + ((Hh - B) / 2) + ')">' + H(o.ylab) + '</text>';
    return '<svg viewBox="0 0 ' + W + ' ' + Hh + '" class="sim-chart" role="img" aria-label="' + H((o.ylab || o.title || "値") + "と" + o.xlab + "の図") + '">' + g + "</svg>";
  }

  function cpaPage() {
    var dir = "fw", gm = "rate", marks = {cpc: "own", cvr: "own", ctr: "own"}, bmMedia = "google";
    var B = window.BENCH;
    var qs = new URLSearchParams(location.search);
    if (qs.get("sat")) { $("sat").value = qs.get("sat"); $("cap-box").open = true; }

    function setMark(id, m) {
      marks[id] = m;
      var e = document.querySelector('[data-mk="' + id + '"]');
      if (e) { e.textContent = m === "bm" ? "業種平均で入る" : "自社の数字"; e.classList.toggle("bm", m === "bm"); }
    }
    ["cpc", "cvr", "ctr"].forEach(function (id) { $(id).addEventListener("input", function () { setMark(id, "own"); }); });

    function curSet() { return B && B.sets[$("bm-set").value]; }
    function fillSets() {
      if (!B) return;
      var g = B.groups.filter(function (x) { return x.id === bmMedia; })[0];
      $("bm-set").innerHTML = g.sets.map(function (id) { var s = B.sets[id]; return '<option value="' + id + '">' + H(s.media + "・" + (s.title.match(/20\d\d/) || [""])[0] + " 年版") + "</option>"; }).join("");
      fillInd();
    }
    function fillInd() {
      var s = curSet(); if (!s) return;
      var q = $("bm-q").value.trim().toLowerCase(), keep = $("bm-ind").value;
      var rows = s.rows.map(function (r, i) { return [r, i]; }).filter(function (x) { return !q || (x[0][0] + " " + x[0][1]).toLowerCase().indexOf(q) >= 0; });
      $("bm-ind").innerHTML = rows.length ? rows.map(function (x) { return '<option value="' + x[1] + '">' + H(x[0][0]) + "</option>"; }).join("") : '<option value="">当てはまる業種がありません</option>';
      if (keep && rows.some(function (x) { return String(x[1]) === keep; })) $("bm-ind").value = keep;
      info();
    }
    function info() {
      var s = curSet(), i = $("bm-ind").value; if (!s || i === "") { $("bm-info").innerHTML = ""; return; }
      var r = s.rows[Number(i)], fx = val("bm-fx") || 150;
      var parts = [];
      if (r[4] !== null) parts.push("CPC " + Y(r[4] * fx) + "（" + r[4] + " ドル）");
      if (r[2] !== null) parts.push("CTR " + P(r[2]));
      parts.push(r[3] !== null ? "CVR " + P(r[3]) : "CVR はこの版に無し");
      if (r[5] !== null) parts.push("CPL " + Y(r[5] * fx) + "（" + r[5] + " ドル）");
      $("bm-info").innerHTML = '<p><b>' + H(r[0]) + "</b>（" + H(r[1]) + "）／" + H(s.media) + "</p><p>" + parts.join("・") + "</p>" +
        '<p class="bm-meta">出典: <a href="' + H(s.url) + '" rel="noopener" target="_blank">' + H(s.title) + "</a>。期間: " + H(s.period) + "。地域: " + H(s.region) + "。1 ドル " + fx + " 円で換算した目安です。" + (B.retrieved ? "取得日 " + H(B.retrieved) + "。" : "") + "</p>";
    }
    if (B) {
      seg("[data-bm]", function (b) { bmMedia = b.dataset.bm; fillSets(); });
      $("bm-set").addEventListener("change", fillInd);
      $("bm-q").addEventListener("input", fillInd);
      $("bm-ind").addEventListener("change", info);
      $("bm-fx").addEventListener("input", info);
      $("bm-apply").addEventListener("click", function () {
        var s = curSet(), i = $("bm-ind").value; if (!s || i === "") return;
        var r = s.rows[Number(i)], fx = val("bm-fx") || 150;
        if (r[4] !== null) { $("cpc").value = Math.round(r[4] * fx); setMark("cpc", "bm"); }
        if (r[3] !== null) { $("cvr").value = +(r[3] * 100).toFixed(2); setMark("cvr", "bm"); }
        if (r[2] !== null) { $("ctr").value = +(r[2] * 100).toFixed(2); setMark("ctr", "bm"); }
        run();
      });
      fillSets();
    } else { $("bm-box").hidden = true; }

    seg("[data-dir]", function (b) {
      dir = b.dataset.dir;
      document.querySelectorAll("[data-show]").forEach(function (e) { e.hidden = e.dataset.show !== dir; });
      run();
    });
    seg("[data-gm]", function (b) {
      gm = b.dataset.gm;
      document.querySelectorAll("[data-gm-show]").forEach(function (e) { e.hidden = e.dataset.gmShow !== gm; });
      run();
    });
    document.querySelectorAll('a[href="#cap-box"]').forEach(function (a) { a.addEventListener("click", function () { $("cap-box").open = true; }); });
    document.querySelector(".sim-form").addEventListener("input", run);

    function margin() {
      if (gm === "rate") return pct("margin");
      var price = val("value"), c = val("cost") || 0, o = val("other") || 0;
      return price ? (price - c - o) / price : null;
    }

    function run() {
      var mg = margin(), price = val("value");
      $("gm-out").innerHTML = gm === "parts"
        ? (price ? "粗利率 ＝（客単価 − 原価 − 送料など）÷ 客単価 ＝ <b>" + P(mg, 1) + "</b>（1 件の粗利 " + Y(price * mg) + "）" : "客単価を入れると、粗利率を出します")
        : (price && mg ? "1 件の粗利 ＝ 客単価 × 粗利率 ＝ <b>" + Y(price * mg) + "</b>" : "");
      var inp = {budget: dir === "fw" ? val("budget") : null, targetConv: dir === "rv" ? val("tconv") : null, cpc: val("cpc"), cvr: pct("cvr"), ctr: pct("ctr"),
                 value: price, margin: mg, keep: pct("keep") || 0, purchases: val("times") || 1, ltvMonths: val("months"),
                 maxClicks: val("maxclk"), sat: val("sat"), targetCpa: val("tcpa"), targetRoas: val("troas") !== null ? val("troas") / 100 : null};
      var o = S.cpaRoas(inp);
      if (o.errors) {
        $("known").innerHTML = '<ul class="k-err">' + o.errors.map(function (e) { return "<li>" + H(e) + "</li>"; }).join("") + "</ul>";
        ["plans-out", "sens-out", "rev-out"].forEach(function (id) { $(id).innerHTML = '<p class="sim-empty">左の入力を直すと出ます。</p>'; });
        return;
      }
      known(o, inp); plans(o, inp); sens(o, inp); rev(o, inp); assume(o, inp);
    }

    function ruler(e, cpa) {
      var mk = [];
      if (e) {
        if (e.okCpa !== null && Math.abs(e.okCpa - e.beCpa) > 0.5) mk.push({x: e.okCpa, t: "許容 " + Y(e.okCpa), cls: "r-ok"});
        mk.push({x: e.beCpa, t: (e.keep > 0 ? "損益分岐 " : "損益分岐＝許容 ") + Y(e.beCpa), cls: "r-be"});
        if (e.times > 1 && e.ltvOkCpa !== null) mk.push({x: e.ltvOkCpa, t: "許容（LTV） " + Y(e.ltvOkCpa), cls: "r-ltv"});
      }
      var mx = Math.max.apply(null, mk.map(function (m) { return m.x; }).concat([cpa])) * 1.18 || 1;
      var W = 320, L = 8, R = 8, X = function (v) { return L + (W - L - R) * v / mx; };
      var okEdge = e ? (e.okCpa !== null ? e.okCpa : 0) : 0;
      var g = '<line x1="' + L + '" x2="' + (W - R) + '" y1="70" y2="70" class="r-base"/>';
      if (e) g += '<rect x="' + L + '" y="62" width="' + Math.max(0, X(okEdge) - L) + '" height="16" class="r-zone"/>';
      mk.sort(function (a, b) { return a.x - b.x; });
      var lastX = -999, row = 0;
      mk.forEach(function (m) {
        var x = X(m.x); row = (x - lastX < 96) ? (row + 1) % 2 : 0; lastX = x;
        var ty = row ? 40 : 24, anchor = x > W - 90 ? "end" : (x < 60 ? "start" : "middle"), tx = anchor === "end" ? Math.min(x + 6, W - 2) : anchor === "start" ? Math.max(x - 6, 2) : x;
        g += '<line x1="' + x + '" x2="' + x + '" y1="' + (ty + 4) + '" y2="80" class="' + m.cls + '"/><text x="' + tx + '" y="' + ty + '" text-anchor="' + anchor + '" class="r-t">' + H(m.t) + "</text>";
      });
      var cx = X(cpa), ca = cx > W * 0.68 ? "end" : (cx < W * 0.32 ? "start" : "middle");
      g += '<circle cx="' + cx + '" cy="70" r="7" class="r-cpa"/><text x="' + (ca === "end" ? Math.min(cx + 8, W - 2) : ca === "start" ? Math.max(cx - 8, 2) : cx) + '" y="100" text-anchor="' + ca + '" class="r-t r-cpat">いまの CPA ' + H(Y(cpa)) + "</text>";
      return '<svg viewBox="0 0 ' + W + ' 108" class="k-ruler" role="img" aria-label="CPA と採算の線">' + g + "</svg>";
    }

    function say(e, cpa) {
      if (!e) return "客単価と粗利率を入れると、払ってよい単価の線が出ます。";
      var be = e.beCpa, ok = e.okCpa;
      if (Math.abs(cpa - be) < 0.5) return "CPA は損益分岐と同じです。粗利をちょうど使い切るので、利益は 0 円です。";
      if (cpa > be) return "CPA " + Y(cpa) + " は損益分岐 " + Y(be) + " を超えています。1 件ごとに " + Y(cpa - be) + " の赤字です。";
      if (ok !== null && e.keep > 0 && cpa > ok) return "CPA " + Y(cpa) + " は損益分岐より安いですが、残したい利益（" + P(e.keep, 1) + "）の線 " + Y(ok) + " を " + Y(cpa - ok) + " 超えています。";
      return "CPA " + Y(cpa) + " は" + (e.keep > 0 ? "許容 CPA " + Y(ok) : "損益分岐 " + Y(be)) + " より " + Y((e.keep > 0 ? ok : be) - cpa) + " 安く、線の内側です。";
    }

    function known(o, inp) {
      var r = dir === "fw" ? o.fw : (o.rev.conv && o.rev.conv.row), e = o.econ, h = "";
      if (dir === "rv") {
        var c = o.rev.conv;
        if (!c) { $("known").innerHTML = '<p class="sim-empty">目標の CV 数を入れてください。</p>'; return; }
        h += '<div class="k-big"><div class="w"><span>目標 ' + N(c.target, 1) + " 件に要る広告費</span><b>" + (c.budget === null ? "届きません" : Y(c.budget)) + "</b>" +
             (c.budget === null ? "<small>頭打ちの上限は " + N(c.ceiling, 1) + " 件です</small>" : "") + "</div></div>";
        if (!r) { $("known").innerHTML = h; return; }
      }
      h += '<div class="k-big"><div><span>CPA</span><b>' + Y(r.cpa) + "</b></div>" + (fin(r.roas) ? "<div><span>ROAS</span><b>" + P(r.roas, 0) + "</b><small>" + N(r.roas, 2) + " 倍</small></div>" : "<div><span>ROAS</span><b>—</b><small>客単価を入れると出ます</small></div>") + "</div>";
      h += ruler(e, r.cpa) + '<p class="k-say">' + say(e, r.cpa) + "</p>";
      h += dl([["広告費", Y(r.budget)], fin(r.imps) ? ["表示回数", N(r.imps, 0) + " 回"] : null, fin(r.cpm) ? ["CPM", Y(r.cpm)] : null,
               ["クリック数", N(r.clicks, 1) + " 回"], ["CV 数", N(r.conv, 2) + " 件"], fin(r.revenue) ? ["売上", Y(r.revenue)] : null,
               fin(r.gross) ? ["粗利", Y(r.gross)] : null, fin(r.profit) ? ["広告費を引いた利益", Y(r.profit), r.profit < -0.5 ? "neg" : (r.profit > 0.5 ? "pos" : "")] : null]);
      if (e) {
        h += '<p class="k-h">採算の線</p>' + dl([["損益分岐の CPA", Y(e.beCpa)], ["許容 CPA", e.okCpa === null ? "残したい利益率が粗利率以上です" : Y(e.okCpa)],
                                             ["損益分岐の ROAS", P(e.beRoas, 0) + "（" + N(e.beRoas, 2) + " 倍）"], e.okRoas !== null && e.keep > 0 ? ["許容の ROAS の下限", P(e.okRoas, 0)] : null]);
        if (e.times > 1 || $("ltv-box").open) {
          var pay = e.months ? r.cpa / (e.ltv / e.months) : null;
          h += '<p class="k-h">継続・LTV</p>' + dl([["粗利 LTV", Y(e.ltv)], ["許容 CPA（LTV）", e.ltvOkCpa === null ? "—" : Y(e.ltvOkCpa)],
                                                 ["LTV:CAC", N(e.ltv / r.cpa, 2) + "（1 を下回ると赤字）"], e.ltvRoas !== null ? ["許容の ROAS の下限（LTV）", P(e.ltvRoas, 0)] : null,
                                                 pay !== null ? ["回収期間", N(pay, 1) + " か月"] : null]);
        }
      }
      $("known").innerHTML = h;
    }

    function plans(o, inp) {
      if (dir !== "fw" || !o.plans) { $("plans-out").innerHTML = '<p class="sim-empty">向きを「広告費 → CV 数」にして、月の広告費を入れると出ます。</p>'; return; }
      var m = o.model, b = inp.budget, e = o.econ, xmax = b * 2.2, pts = [], mpts = [];
      for (var i = 0; i <= 88; i++) { var x = xmax * i / 88; pts.push([x, m.conversions(x)]); mpts.push([x, m.marginalCpa(Math.max(x, 1))]); }
      var dots = o.plans.map(function (p) { return {x: p.budget, y: p.conv, t: "×" + p.k + "：" + N(p.conv, 1) + " 件", cls: "c-dot", anchor: "end", dx: -8, dy: 10}; });
      var ymax = Math.max(pts[pts.length - 1][1], o.plans[2].conv) * 1.1;
      var vl = o.capBudget !== null && o.capBudget <= xmax ? [{x: o.capBudget, t: "検索の上限に届く " + MAN(o.capBudget)}] : [];
      var c1 = chart({w: 560, h: 300, xmax: xmax, ymax: ymax, xfmt: function (v) { return N(v / 10000, 0) + "万"; }, yfmt: function (v) { return N(v, 0); },
                      xlab: "月の広告費（円）", ylab: "", title: "CV 数", lines: [{pts: pts}], dots: dots, vl: vl});
      var mcaps = mpts.map(function (p) { return [p[0], fin(p[1]) ? p[1] : null]; });
      var mfin = mcaps.filter(function (p) { return p[1] !== null; }).map(function (p) { return p[1]; });
      var mmax = Math.max.apply(null, mfin.concat(e ? [e.beCpa] : []).concat(o.plans.map(function (p) { return p.cpa; }))) * 1.15;
      var hl = e ? [{y: e.beCpa, t: "損益分岐 " + Y(e.beCpa), cls: "c-be"}].concat(e.keep > 0 && e.okCpa ? [{y: e.okCpa, t: "許容 " + Y(e.okCpa), cls: "c-ok"}] : []) : [];
      var c2 = chart({w: 560, h: 300, xmax: xmax, ymax: Math.min(mmax, (e ? e.beCpa : o.baseCpa) * 4), xfmt: function (v) { return N(v / 10000, 0) + "万"; }, yfmt: function (v) { return N(v, 0); },
                      xlab: "月の広告費（円）", ylab: "", title: "最後に足した分の CPA", lines: [{pts: mcaps, cls: "c-line c-m"}], hl: hl, vl: vl,
                      dots: o.plans.filter(function (p) { return fin(p.mcpa); }).map(function (p) { return {x: p.budget, y: p.mcpa, cls: "c-dot sm", r: 4}; })});
      var over = function (x) { return e && fin(x) && x > e.beCpa + 0.5 ? ' class="over"' : (!fin(x) ? ' class="cap"' : ""); };
      var t = '<div class="sim-tw"><table class="sim-t"><thead><tr><th>案</th><th>広告費</th><th>CV 数</th><th>平均の CPA</th><th>増やした分の CPA</th><th>最後に足した分の CPA</th>' + (e ? "<th>利益</th>" : "") + "</tr></thead><tbody>" +
        o.plans.map(function (p) {
          return "<tr><th>予算 ×" + p.k + "</th><td>" + Y(p.budget) + "</td><td>" + N(p.conv, 2) + " 件</td><td" + over(p.cpa) + ">" + Y(p.cpa) + "</td><td" + (p.stepCpa === undefined ? "" : over(p.stepCpa)) + ">" +
            (p.stepCpa === undefined ? "—" : fin(p.stepCpa) ? Y(p.stepCpa) : "増えない（頭打ち）") + "</td><td" + over(p.mcpa) + ">" + (fin(p.mcpa) ? Y(p.mcpa) : "頭打ち") + "</td>" +
            (e ? "<td" + (p.profit < -0.5 ? ' class="over"' : "") + ">" + Y(p.profit) + "</td>" : "") + "</tr>";
        }).join("") + "</tbody></table></div>";
      var note = [];
      if (!inp.maxClicks && !inp.sat) note.push('頭打ちを入れていないので、件数は予算に比例し、平均の CPA と最後に足した分の CPA は同じになります。実際は、予算を増やすほど 1 件あたりは高くなります。<a href="#cap-box">頭打ちを入れる ›</a>');
      if (o.capBudget !== null) note.push("検索の上限に届く予算は " + Y(o.capBudget) + "、そのときの CV 数は " + N(inp.maxClicks * inp.cvr, 2) + " 件です。これより多く出しても件数は増えません。");
      if (o.ceiling) note.push("鈍りの上限（予算をいくら積んでも超えない件数）は " + N(o.ceiling, 1) + " 件です。");
      if (e) note.push("損益分岐 " + Y(e.beCpa) + " を超えた所を、薄い赤で示します。");
      $("plans-out").innerHTML = '<div class="sim-2f"><figure class="fig-box"><figcaption>CV 数（件）と月の広告費</figcaption>' + c1 + '</figure><figure class="fig-box"><figcaption>最後に足した分の CPA（増やすほど高くなる）</figcaption>' + c2 + "</figure></div>" + t + '<ul class="sim-list">' + note.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ul>";
      $("plans-out").querySelectorAll('a[href="#cap-box"]').forEach(function (a) { a.addEventListener("click", function () { $("cap-box").open = true; }); });
    }

    function sens(o, inp) {
      var e = o.econ, head = o.sens[0].cells.map(function (c) { return "<th>CVR ×" + c.kv + "<small>" + P(c.cvr) + "</small></th>"; }).join("");
      var body = o.sens.map(function (row) {
        return "<tr><th>CPC ×" + row.kc + "<small>" + Y(row.cpc) + "</small></th>" + row.cells.map(function (c) {
          var cls = [];
          if (row.kc === 1 && c.kv === 1) cls.push("now");
          if (e && fin(c.cpa)) cls.push(c.cpa <= (e.okCpa !== null ? e.okCpa : e.beCpa) + 0.5 ? "g" : (c.cpa <= e.beCpa + 0.5 ? "m" : "over"));
          return '<td class="' + cls.join(" ") + '"><b>' + Y(c.cpa) + "</b>" + (fin(c.roas) ? "<small>ROAS " + P(c.roas, 0) + "</small>" : "") + "</td>";
        }).join("") + "</tr>";
      }).join("");
      var lg = e ? '<p class="sim-lg"><i class="g"></i>' + (e.keep > 0 ? "許容 CPA の内側" : "損益分岐の内側") + (e.keep > 0 ? '<i class="m"></i>損益分岐の内側' : "") + '<i class="over"></i>損益分岐を超える<i class="now"></i>いまの値</p>' : '<p class="sim-lg"><i class="now"></i>いまの値（客単価と粗利率を入れると、採算で色を分けます）</p>';
      $("sens-out").innerHTML = '<div class="sim-tw"><table class="sim-t sim-sens"><thead><tr><th>CPC ＼ CVR</th>' + head + "</tr></thead><tbody>" + body + "</tbody></table></div>" + lg +
        '<p class="sb-note">同じ効き方: CVR ×1.1 ＝ CPC ×0.909、CVR ×1.2 ＝ CPC ×0.833、CVR ×0.9 ＝ CPC ×1.111、CVR ×0.8 ＝ CPC ×1.25。入札で単価を下げると表示も減ります。率は LP と成果の定義で動きます。</p>';
    }

    function rev(o, inp) {
      var r = o.rev, out = [];
      if (fin(r.cpaFromRoas)) out.push(["目標の ROAS を CPA に直すと", Y(r.cpaFromRoas), "CPA ＝ 客単価 ÷ ROAS（" + Y(inp.value) + " ÷ " + N(inp.targetRoas, 2) + "）"]);
      if (fin(r.goalCpa)) {
        out.push(["目標の CPA " + Y(r.goalCpa) + " に届くには、いまの CPC のままなら要る CVR", r.needCvr > 1 ? "届きません" : P(r.needCvr, 2), r.needCvr > 1 ? "要る CVR が 100% を超えるので、CPC を下げないと届きません" : "要る CVR ＝ CPC ÷ 目標の CPA（いまは " + P(inp.cvr) + "）"]);
        out.push(["いまの CVR のままなら、出せる CPC の上限", Y(r.maxCpc), "CPC の上限 ＝ 目標の CPA × CVR（いまは " + Y(inp.cpc) + "）"]);
        out.push(["いまの CPA との比", N(r.ratio, 3) + " 倍", "1 より大きいと、いまの CPA は目標より高い"]);
      }
      if (r.conv) {
        var c = r.conv;
        out.push(["目標 " + N(c.target, 1) + " 件に要る広告費", c.budget === null ? "届きません" : Y(c.budget),
                  c.budget === null ? "頭打ちの上限は " + N(c.ceiling, 1) + " 件です" : "平均の CPA " + Y(c.avg) + "・最後に足した分の CPA " + Y(c.mcpa) + (c.ceiling ? "。上限は " + N(c.ceiling, 1) + " 件" : "")]);
      }
      if (!out.length) { $("rev-out").innerHTML = '<p class="sim-empty">「目標から逆算する」に目標の CPA か ROAS を入れるか、向きを「目標の CV 数 → 広告費」にすると出ます。</p>'; return; }
      $("rev-out").innerHTML = '<div class="sim-rev">' + out.map(function (x) { return "<div><span>" + x[0] + "</span><b>" + x[1] + "</b><small>" + x[2] + "</small></div>"; }).join("") + "</div>" +
        (r.both ? '<p class="sb-note">目標の CPA と ROAS の両方が入っているので、厳しい方（安い CPA）で逆算しました。</p>' : "") +
        '<p class="sb-note">ここは入れた CPC（いまの平均）で計算しています。頭打ちを入れているとき、予算を増やすと実際の単価は上がります。</p>';
    }

    function assume(o, inp) {
      var a = [];
      if (inp.maxClicks) a.push("月のクリック数の上限は、入れた値です（キーワードプランナーの検索数 × 表示される割合 × CTR など。実績が無ければ仮置き）。");
      if (inp.sat) {
        a.push("鈍り始める額 S は、入れた値です。月ごとの実績の点が 4 つ以上あれば当てはめて決めます。無ければ仮置きです。");
        a.push("鈍りの形は CV 数 ＝ r × S ×（1 − e^(−広告費 ÷ S)）です。CVR は一定とみて、増えた費用は単価の上昇として表れます。");
        a.push("r（最初の 1 円あたりの成果）は、" + (o.model.anchored ? "いまの広告費で入れた CPC・CVR どおりの件数になるように合わせました（曲線がいまの実績から外れないように）。r ＝ " + o.model.r.toFixed(6) + " 件／円（最初の CPC にすると " + Y(o.model.cvr / o.model.r) + "）。" : "広告費を入れていないので、CVR ÷ CPC（最初の 1 円の値）とみました。"));
      }
      a.push("CVR・CPC は予算によらず一定とみています（頭打ちを入れたときを除く）。");
      if (marks.cpc === "bm" || marks.cvr === "bm" || marks.ctr === "bm") a.push("「業種平均で入る」の欄は、米国の中央値を 1 ドル " + (val("bm-fx") || 150) + " 円で換算した目安です。日本の実勢とは差があります。");
      $("assume").innerHTML = a.map(function (x) { return "<li>" + x + "</li>"; }).join("");
    }

    run();
  }

  function planPage() {
    var layers = [
      {name: "指名", brand: true, vol: 800, share: 90, ctr: 35, cpc: 50, cvr: 5, cap: ""},
      {name: "意図の高い言葉", brand: false, vol: 4000, share: 80, ctr: 7, cpc: 200, cvr: 2.5, cap: ""},
      {name: "比較の言葉", brand: false, vol: 5000, share: 50, ctr: 3, cpc: 150, cvr: 1, cap: ""},
      {name: "関連語", brand: false, vol: "", share: "", ctr: "", cpc: 220, cvr: 0.5, cap: 200000}];
    var chans = [
      {name: "再配信", cpc: 100, cvr: 0.6, sat: 200000, cap: 250000, seasonal: true},
      {name: "SNS", cpc: 50, cvr: 0.15, sat: 300000, cap: 300000, seasonal: false}];
    var demand = [80, 100, 120, 100, 90, 110], pick = "A", timer = null, last = null;
    var qs = new URLSearchParams(location.search), satNote = "";
    if (qs.get("sat") && chans.length) { chans[0].sat = Number(qs.get("sat")); satNote = "近似曲線から渡された S（" + Y(chans[0].sat) + "）を「" + chans[0].name + "」に入れました。"; }

    var LC = [["name", "text"], ["brand", "check"], ["vol", "n"], ["share", "n"], ["ctr", "n"], ["cpc", "n"], ["cvr", "n"], ["cap", "n"]];
    var CC = [["name", "text"], ["cpc", "n"], ["cvr", "n"], ["sat", "n"], ["cap", "n"], ["seasonal", "check"]];
    function table(id, rows, cols) {
      $(id).querySelector("tbody").innerHTML = rows.map(function (r, i) {
        return "<tr>" + cols.map(function (c) {
          var k = c[0], v = r[k];
          if (c[1] === "check") return '<td class="ck"><input type="checkbox" data-i="' + i + '" data-k="' + k + '"' + (v ? " checked" : "") + ' aria-label="' + k + '"></td>';
          return '<td><input type="' + (c[1] === "text" ? "text" : "number") + '" step="any" min="0" data-i="' + i + '" data-k="' + k + '" value="' + H(v === null || v === undefined ? "" : v) + '" aria-label="' + k + '"></td>';
        }).join("") + '<td><button type="button" class="x" data-del="' + i + '" aria-label="この行を消す">×</button></td></tr>';
      }).join("");
    }
    function bind(id, rows, cols) {
      $(id).addEventListener("input", function (ev) {
        var t = ev.target, i = t.dataset.i, k = t.dataset.k; if (i === undefined) return;
        rows[Number(i)][k] = t.type === "checkbox" ? t.checked : (t.type === "text" ? t.value : (t.value === "" ? "" : Number(t.value)));
        later();
      });
      $(id).addEventListener("click", function (ev) {
        var d = ev.target.dataset && ev.target.dataset.del; if (d === undefined) return;
        rows.splice(Number(d), 1); table(id, rows, cols); later();
      });
    }
    function months() {
      var m0 = Number($("m0").value), n = Number($("mn").value), out = [];
      for (var i = 0; i < n; i++) out.push(((m0 - 1 + i) % 12 + 1) + "月");
      return out;
    }
    function drawDemand() {
      var M = months();
      while (demand.length < M.length) demand.push(100);
      demand = demand.slice(0, M.length);
      $("demand").innerHTML = M.map(function (m, i) { return '<label><span>' + m + '</span><input type="number" step="any" min="0" data-d="' + i + '" value="' + demand[i] + '"></label>'; }).join("");
    }
    $("demand").addEventListener("input", function (ev) { var i = ev.target.dataset.d; if (i !== undefined) { demand[Number(i)] = Number(ev.target.value) || 0; later(); } });
    ["m0", "mn"].forEach(function (id) { $(id).addEventListener("change", function () { drawDemand(); later(); }); });
    ["cur", "curc", "step", "tg"].forEach(function (id) { $(id).addEventListener("input", later); });
    $("add-l").addEventListener("click", function () { layers.push({name: "層" + (layers.length + 1), brand: false, vol: 1000, share: 50, ctr: 5, cpc: 150, cvr: 1, cap: ""}); table("layers", layers, LC); later(); });
    $("add-c").addEventListener("click", function () { chans.push({name: "媒体" + (chans.length + 1), cpc: 80, cvr: 0.5, sat: 300000, cap: "", seasonal: false}); table("chans", chans, CC); later(); });
    $("m0").value = "1";
    table("layers", layers, LC); table("chans", chans, CC); bind("layers", layers, LC); bind("chans", chans, CC); drawDemand();

    function later() { clearTimeout(timer); timer = setTimeout(run, 200); }
    function nz(x) { return x === "" || x === null || x === undefined ? null : Number(x); }

    function run() {
      var conf, o, err = [];
      var L = layers.map(function (l, i) {
        var hasCap = nz(l.cap) !== null;
        if (!(nz(l.cpc) > 0) || !(nz(l.cvr) > 0)) err.push("検索の層「" + l.name + "」: CPC と CVR を入れてください");
        if (!hasCap && !(nz(l.vol) > 0 && nz(l.share) > 0 && nz(l.ctr) > 0)) err.push("検索の層「" + l.name + "」: 月の上限額か、月の検索数・表示される割合・CTR を入れてください");
        return {id: "L" + i, name: l.name, brand: !!l.brand, vol: nz(l.vol), share: nz(l.share) / 100, ctr: nz(l.ctr) / 100, cpc: nz(l.cpc), cvr: nz(l.cvr) / 100, capYen: hasCap ? nz(l.cap) : null};
      });
      var C = chans.map(function (c, i) {
        if (!(nz(c.cpc) > 0) || !(nz(c.cvr) > 0)) err.push("媒体「" + c.name + "」: CPC と CVR を入れてください");
        return {id: "C" + i, name: c.name, cpc: nz(c.cpc), cvr: nz(c.cvr) / 100, sat: nz(c.sat), cap: nz(c.cap), seasonal: !!c.seasonal};
      });
      var tg = $("tg").value.split(/[,、\s]+/).map(Number).filter(function (x) { return x > 0; });
      if (err.length) { $("plan-kpi").innerHTML = '<ul class="k-err">' + err.map(function (e) { return "<li>" + H(e) + "</li>"; }).join("") + "</ul>"; return; }
      conf = {months: months(), demand: demand.map(function (d) { return d > 0 ? d : 0.0001; }), layers: L, channels: C, step: val("step") || 50000,
              currentTotal: val("cur"), currentConv: val("curc"), targets: tg};
      try { o = S.mediaPlan(conf); } catch (ex) { $("plan-kpi").innerHTML = '<ul class="k-err"><li>' + H(ex.message) + "</li></ul>"; return; }
      last = o;
      var names = {search: "検索"}; C.forEach(function (c) { names[c.id] = c.name; });
      kpi(o); scen(o); curve(o); alloc(o, names, C); inv(o); notes(o);
    }

    function kpi(o) {
      $("plan-kpi").innerHTML = '<div class="sim-kpi"><div><span>いま</span><b>' + (o.base.total ? MAN(o.base.total) : "—") + "</b><small>" + (o.base.conv !== null ? N(o.base.conv, 1) + " 件（" + H(o.base.src) + "）" : "いまの総額を入れると出ます") + "</small></div>" +
        "<div><span>上限まで積んだとき</span><b>" + MAN(o.max.total) + "</b><small>" + N(o.max.conv, 1) + " 件。これより先は、どこに足しても増えません</small></div>" +
        "<div><span>道の長さ</span><b>" + o.steps.length + " 回</b><small>" + Y(o.plan.step) + " ずつ足した回数</small></div></div>";
    }
    function scen(o) {
      $("plan-sc").innerHTML = o.scenarios.length ? '<div class="sim-sc">' + o.scenarios.map(function (s) {
        if (!s.reach) return '<div class="no"><p class="sc-n">' + H(s.name) + "</p><b>届きません</b><small>上限まで積んでも " + N(o.max.conv, 0) + " 件（" + Y(o.max.total) + "）で、" + N(s.goal, 0) + " 件に届きません。地域や媒体の上限を広げる案を別に考えます。</small></div>";
        return '<div><p class="sc-n">' + H(s.name) + "</p><b>" + MAN(s.total) + "</b><small>" + N(s.conv, 1) + " 件（指名以外 " + N(s.nonBrand, 1) + " 件）</small>" +
          dl([["平均の 1 件あたり", Y(s.avg)], ["最後の 1 回分の 1 件あたり", Y(s.last)]]) + "</div>";
      }).join("") + "</div>" : '<p class="sim-empty">いまの期間の総額を入れると、A・B・C の案が出ます。</p>';
    }
    function curve(o) {
      var pts = [[0, 0]].concat(o.steps.map(function (s) { return [s.spent, s.conv]; }));
      var lp = []; o.steps.forEach(function (s, i) { lp.push([i ? o.steps[i - 1].spent : 0, s.last]); lp.push([s.spent, s.last]); });
      var dots = o.scenarios.filter(function (s) { return s.reach; }).map(function (s) { return {x: s.total, y: s.conv, t: s.key + " " + N(s.conv, 0) + " 件", anchor: "end", dx: -8}; });
      var c1 = chart({w: 560, h: 300, xmax: o.max.total * 1.02, ymax: o.max.conv * 1.1, xfmt: function (v) { return N(v / 10000, 0) + "万"; }, yfmt: function (v) { return N(v, 0); },
                      xlab: "期間の媒体費（円）", ylab: "", title: "件数", lines: [{pts: pts}], dots: dots});
      var lmax = Math.max.apply(null, o.steps.map(function (s) { return s.last || 0; }));
      var c2 = chart({w: 560, h: 300, xmax: o.max.total * 1.02, ymax: lmax * 1.1, xfmt: function (v) { return N(v / 10000, 0) + "万"; }, yfmt: function (v) { return N(v, 0); },
                      xlab: "期間の媒体費（円）", ylab: "", title: "最後の 1 回分の 1 件あたり", lines: [{pts: lp, cls: "c-line c-m"}],
                      vl: o.scenarios.filter(function (s) { return s.reach; }).map(function (s) { return {x: s.total, t: s.key}; })});
      $("plan-curve").innerHTML = '<div class="sim-2f"><figure class="fig-box"><figcaption>件数と期間の媒体費</figcaption>' + c1 + '</figure><figure class="fig-box"><figcaption>最後に足した 1 回分の 1 件あたり（円）</figcaption>' + c2 + "</figure></div>";
    }
    function alloc(o, names, C) {
      var ok = o.scenarios.filter(function (s) { return s.reach; });
      if (!ok.length) { $("plan-alloc").innerHTML = '<p class="sim-empty">届く案が無いので、配り方は出していません。</p>'; return; }
      if (!ok.some(function (s) { return s.key === pick; })) pick = ok[0].key;
      var s = ok.filter(function (x) { return x.key === pick; })[0];
      var cols = (layers.length ? ["search"] : []).concat(C.map(function (c) { return c.id; }));
      var mx = 0; s.rows.forEach(function (r) { cols.forEach(function (c) { mx = Math.max(mx, r.by[c] || 0); }); });
      var tabs = '<div class="seg" role="group" aria-label="案">' + ok.map(function (x) { return '<button type="button" data-pk="' + x.key + '"' + (x.key === pick ? ' class="on"' : "") + ">" + H(x.name) + "</button>"; }).join("") + "</div>";
      var t = '<div class="sim-tw"><table class="sim-t sim-heat"><thead><tr><th>月</th>' + cols.map(function (c) { return "<th>" + H(names[c]) + "</th>"; }).join("") + "<th>月の合計</th><th>件数</th><th>指名以外</th></tr></thead><tbody>" +
        s.rows.map(function (r) {
          return "<tr><th>" + r.month + "</th>" + cols.map(function (c) { var v = r.by[c] || 0, a = mx ? v / mx : 0; return '<td style="--a:' + a.toFixed(3) + '">' + (v ? MAN(v) : "—") + "</td>"; }).join("") +
            "<td><b>" + MAN(r.total) + "</b></td><td>" + N(r.conv, 1) + "</td><td>" + N(r.nonBrand, 1) + "</td></tr>";
        }).join("") + '<tr class="sum"><th>合計</th>' + cols.map(function (c) { return "<td><b>" + MAN(s.by[c] || 0) + "</b></td>"; }).join("") + "<td><b>" + MAN(s.total) + "</b></td><td><b>" + N(s.conv, 1) + "</b></td><td><b>" + N(s.nonBrand, 1) + "</b></td></tr></tbody></table></div>";
      $("plan-alloc").innerHTML = tabs + t + '<p class="sb-note">色の濃さは、その月 × 媒体に配った額の大きさです。検索は、層を上から順に、その月の上限まで使います。</p>';
      $("plan-alloc").querySelectorAll("[data-pk]").forEach(function (b) { b.addEventListener("click", function () { pick = b.dataset.pk; alloc(last, names, C); }); });
    }
    function inv(o) {
      $("plan-inv").innerHTML = o.inverse.length ? '<div class="sim-tw"><table class="sim-t"><thead><tr><th>要る件数</th><th>要る媒体費</th><th>そのときの最後の 1 回分の 1 件あたり</th></tr></thead><tbody>' +
        o.inverse.map(function (r) { return "<tr><th>" + N(r.target, 1) + " 件</th><td>" + (r.need === null ? "届きません（上限まで積んでも足りない）" : Y(r.need)) + "</td><td>" + Y(r.last) + "</td></tr>"; }).join("") + "</tbody></table></div>"
        : '<p class="sim-empty">「要る件数」を入れると出ます。</p>';
    }
    function notes(o) {
      var n = [];
      if (satNote) n.push(satNote);
      n.push("季節の倍率（平均 1）: " + o.plan.M.map(function (m, i) { return m + " " + o.plan.k[i].toFixed(2); }).join("、"));
      o.plan.notes.forEach(function (x) { n.push(x); });
      $("plan-notes").innerHTML = n.map(function (x) { return "<li>" + H(x) + "</li>"; }).join("");
    }
    run();
  }

  function curvePage() {
    var pts = [["2026-01", 80000, 700], ["2026-02", 150000, 1250], ["2026-03", 220000, 1650], ["2026-04", 300000, 2000], ["2026-05", 380000, 2250], ["2026-06", 450000, 2400], ["2026-07", 520000, 2550]];
    function draw() {
      $("pts").querySelector("tbody").innerHTML = pts.map(function (p, i) {
        return '<tr><td><input type="text" data-i="' + i + '" data-k="0" value="' + H(p[0]) + '" aria-label="月"></td><td><input type="number" step="any" min="0" data-i="' + i + '" data-k="1" value="' + H(p[1]) + '" aria-label="広告費"></td>' +
          '<td><input type="number" step="any" min="0" data-i="' + i + '" data-k="2" value="' + H(p[2]) + '" aria-label="値"></td><td><button type="button" class="x" data-del="' + i + '" aria-label="この点を消す">×</button></td></tr>';
      }).join("");
    }
    $("pts").addEventListener("input", function (ev) { var t = ev.target; if (t.dataset.i === undefined) return; pts[Number(t.dataset.i)][Number(t.dataset.k)] = t.dataset.k === "0" ? t.value : (t.value === "" ? "" : Number(t.value)); run(); });
    $("pts").addEventListener("click", function (ev) { var d = ev.target.dataset && ev.target.dataset.del; if (d === undefined) return; pts.splice(Number(d), 1); draw(); run(); });
    $("add-p").addEventListener("click", function () { pts.push(["", "", ""]); draw(); });
    $("clr-p").addEventListener("click", function () { pts = [["", "", ""]]; draw(); run(); });
    $("yk").addEventListener("change", function () { $("yh").textContent = $("yk").value; run(); });
    $("do-paste").addEventListener("click", function () {
      var rows = $("paste").value.split(/\r?\n/).map(function (l) { return l.split(/\t|,/).map(function (x) { return x.trim(); }); }).filter(function (r) { return r.length >= 2 && r.some(Boolean); });
      var np = rows.map(function (r) { var n = r.map(function (x) { return Number(x.replace(/[,円¥\s]/g, "")); }); return r.length >= 3 ? [r[0], n[1], n[2]] : ["", n[0], n[1]]; })
        .filter(function (p) { return !isNaN(p[1]) && !isNaN(p[2]); });
      if (np.length) { pts = np; draw(); run(); }
    });

    function run() {
      var yk = $("yk").value;
      var o = S.fitCurve(pts.map(function (p) { return p[1] === "" ? null : p[1]; }), pts.map(function (p) { return p[2] === "" ? null : p[2]; }));
      if (o.tooFew) {
        $("fit-known").innerHTML = '<p class="k-say">費用が 0 より大きい月の点が ' + o.n + " つしかありません。4 つ未満は当てません。</p>";
        $("fit-fig").innerHTML = '<p class="sim-empty">点を 4 つ以上入れると出ます。</p>'; $("fit-pass").innerHTML = ""; return;
      }
      var fits = [o.lin, o.sat, o.exp];
      var bars = fits.map(function (f) {
        var w = Math.max(0, Math.min(1, f.r2));
        return '<div class="r2' + (f === o.best ? " on" : "") + '"><span>' + f.name + '</span><i style="--w:' + w.toFixed(3) + '"></i><b>' + f.r2.toFixed(3) + "</b></div>";
      }).join("");
      var st = {weak: "当てはまりが弱いです（決定係数 0.3 未満）。月によって配信の中身が変わっていないかを見てください。この曲線を予算の根拠にしません。",
                mid: "当てはまりは中くらいです（0.3〜0.6）。形の目安には使えますが、頭打ちの位置は幅を持って読みます。",
                ok: "よく当てはまっています（0.6 以上）。それでも、点の範囲の外は伸ばした推定です。"}[o.strength];
      var desc = o.best.kind === "lin" ? "1 円あたり " + o.lin.a.toPrecision(4) + "（1,000 あたりの費用 約 " + Y(1000 / o.lin.a) + "）。頭打ちの形は、比例より決定係数が 0.02 以上高くないので選びませんでした。"
        : o.best.kind === "sat" ? "上限 c ＝ 約 " + N(o.sat.c, 0) + "、b（上限の半分に届く月の広告費）＝ 約 " + Y(o.sat.b) + "。"
        : "上限 c ＝ 約 " + N(o.exp.c, 0) + "、S（鈍り始める額）＝ 約 " + Y(o.exp.S) + "。";
      $("fit-known").innerHTML = '<div class="k-big"><div class="w"><span>選んだ形</span><b>' + o.best.name + "</b><small>決定係数 " + o.best.r2.toFixed(3) + "</small></div></div>" +
        '<div class="r2s">' + bars + '</div><p class="k-say">' + desc + "</p><p class=\"k-say" + (o.strength === "weak" ? " warn" : "") + "\">" + st + "</p>" +
        dl([["点の数", o.pts.length + " つ"], ["点の範囲", MAN(o.xmin) + "〜" + MAN(o.xmax)]]);
      var xmax = o.xmax * 1.3, ymax = Math.max.apply(null, o.pts.map(function (p) { return p[1]; })) * 1.25;
      var line = function (f, cls) { var fp = S.predict(f), a = []; for (var i = 0; i <= 60; i++) { var x = xmax * i / 60; a.push([x, fp(x)]); } return {pts: a, cls: cls}; };
      var lines = fits.filter(function (f) { return f !== o.best; }).map(function (f) { return line(f, "c-line c-alt"); }).concat([line(o.best, "c-line")]);
      var c = chart({h: 320, xmax: xmax, ymax: ymax, xfmt: function (v) { return N(v / 10000, 0) + "万"; }, yfmt: function (v) { return N(v, 0); },
                     xlab: "月の広告費（円）", ylab: yk, lines: lines, shade: [[0, o.xmin], [o.xmax, nice(xmax)]],
                     dots: o.pts.map(function (p) { return {x: p[0], y: p[1], cls: "c-dot pt", r: 4.5}; }),
                     hl: o.best.kind !== "lin" ? [{y: o.best.c, t: "上限 c ≈ " + N(o.best.c, 0), cls: "c-hl"}] : []});
      $("fit-fig").innerHTML = '<div class="fig-box">' + c + '</div><p class="sim-lg"><i class="ln"></i>選んだ形（' + o.best.name + '）<i class="alt"></i>ほかの 2 つの形<i class="sh"></i>点の範囲の外（伸ばした推定）</p>';
      var Sv = Math.round(o.exp.S);
      $("fit-pass").innerHTML = '<div class="sim-rev"><div><span>鈍る形の S（鈍り始める額）</span><b>' + Y(Sv) + "</b><small>決定係数 " + o.exp.r2.toFixed(3) + (o.best.kind !== "exp" ? "。選んだ形は「" + o.best.name + "」ですが、ほかの試算が使うのは、この鈍る形の S です" : "") + "</small></div></div>" +
        '<div class="sb-act"><a class="btn" href="cpa.html?sat=' + Sv + '">この S で CPA・ROAS の試算を開く ›</a><a class="btn ghost" href="haibun.html?sat=' + Sv + '">予算の配分の 1 つ目の媒体に入れて開く ›</a></div>' +
        (yk === "クリック数" ? '<p class="sb-note">クリック数に当てた S です。成果の件数に当てた S とは違うことがあります（CVR が一定なら同じです）。</p>' : "") +
        (o.strength === "weak" ? '<p class="sb-note warn">当てはまりが弱いので、この S を予算の根拠にしないでください。</p>' : "");
    }
    draw(); run();
  }

  var root = document.getElementById("sim");
  var kind = root ? root.dataset.sim : (document.getElementById("known") ? "cpa" : document.getElementById("plan-kpi") ? "plan" : document.getElementById("fit-known") ? "curve" : "");
  if (kind === "cpa") cpaPage(); else if (kind === "plan") planPage(); else if (kind === "curve") curvePage();
})();
