
(function (root) {
  "use strict";
  var E = Math.exp, LN = Math.log;

  function pyRound(x, n) {
    if (x === null || x === undefined || !isFinite(x)) return null;
    n = n || 0;
    var p = Math.pow(10, n), m = x * p, f = Math.floor(m), d = m - f;
    var r;
    if (Math.abs(d - 0.5) < 1e-9) r = (f % 2 === 0) ? f : f + 1;
    else r = Math.round(m);
    return r / p;
  }
  function yen(x) { return (x === null || x === undefined || !isFinite(x)) ? null : pyRound(x, 0); }

  function Model(cpc, cvr, maxClicks, sat, anchorBudget) {
    this.cpc = cpc; this.cvr = cvr; this.maxClicks = maxClicks || null; this.sat = sat || null;
    this.r = cvr / cpc; this.anchored = false;
    if (this.sat && anchorBudget) {
      var x = anchorBudget / this.sat;
      this.r = (cvr / cpc) * x / (1 - E(-x));
      this.anchored = true;
    }
  }
  Model.prototype.raw = function (b) { return this.sat ? this.r * this.sat * (1 - E(-b / this.sat)) : this.r * b; };
  Model.prototype.conversions = function (b) {
    var c = this.raw(b);
    if (this.maxClicks !== null) c = Math.min(c, this.maxClicks * this.cvr);
    return c;
  };
  Model.prototype.clicks = function (b) { return this.conversions(b) / this.cvr; };
  Model.prototype.capped = function (b) {
    if (this.maxClicks === null) return false;
    return this.raw(b) >= this.maxClicks * this.cvr - 1e-9;
  };
  Model.prototype.marginalCpa = function (b) {
    if (this.capped(b)) return Infinity;
    if (this.sat) return E(b / this.sat) / this.r;
    return this.cpc / this.cvr;
  };
  Model.prototype.capBudget = function () {
    if (this.maxClicks === null) return null;
    var need = this.maxClicks * this.cvr;
    if (this.sat) { var top = this.r * this.sat; if (need >= top) return null; return -this.sat * LN(1 - need / top); }
    return need / this.r;
  };
  Model.prototype.budgetFor = function (n) {
    if (this.maxClicks !== null && n > this.maxClicks * this.cvr + 1e-9) return null;
    if (this.sat) { var top = this.r * this.sat; if (n >= top) return null; return -this.sat * LN(1 - n / top); }
    return n / this.r;
  };
  Model.prototype.ceiling = function () {
    var a = this.maxClicks !== null ? this.maxClicks * this.cvr : Infinity, b = this.sat ? this.r * this.sat : Infinity;
    return Math.min(a, b);
  };

  function row(m, budget, value, margin) {
    var conv = m.conversions(budget), clicks = conv / m.cvr, cap = m.capped(budget);
    var o = {budget: budget, clicks: clicks, conv: conv, cpa: conv > 0 ? budget / conv : null,
             avgCpc: clicks > 0 ? budget / clicks : null, mcpa: cap ? Infinity : m.marginalCpa(budget), capped: cap};
    if (value !== null) {
      o.revenue = conv * value; o.roas = budget ? o.revenue / budget : null;
      if (margin !== null) { o.gross = o.revenue * margin; o.profit = o.gross - budget; }
    }
    return o;
  }

  
  function economics(o) {
    var price = o.value, margin = o.margin;
    if (price === null || margin === null || !(margin > 0)) return null;
    var keep = o.keep || 0, times = o.purchases || 1, months = o.ltvMonths || null;
    var share = (margin - keep) / margin;
    var gp = price * margin, ltv = gp * times;
    var e = {gp: gp, beCpa: gp, okCpa: share > 0 ? gp * share : null, beRoas: 1 / margin,
             okRoas: share > 0 ? 1 / margin / share : null, share: share, keep: keep,
             ltv: ltv, times: times, ltvBeCpa: ltv, ltvOkCpa: share > 0 ? ltv * share : null,
             ltvRoas: (times !== 1 && share > 0) ? 1 / (ltv / price) / share : null, months: months};
    if (months) e.monthly = ltv / months;
    return e;
  }

  function cpaRoas(inp) {
    var cpc = inp.cpc, cvr = inp.cvr, value = num(inp.value), margin = num(inp.margin);
    var budget = num(inp.budget), tConv = num(inp.targetConv), tCpa = num(inp.targetCpa), tRoas = num(inp.targetRoas);
    var maxClicks = num(inp.maxClicks), sat = num(inp.sat), ctr = num(inp.ctr);
    var err = [];
    if (!(cpc > 0)) err.push("クリック単価（CPC）を 0 より大きい数で入れてください");
    if (!(cvr > 0) || cvr > 1) err.push("コンバージョン率（CVR）を 0 より大きく 100% 以下で入れてください");
    if (budget === null && tConv === null && tCpa === null && tRoas === null) err.push("月の広告費か、目標（件数・CPA・ROAS）のどれかを入れてください");
    if (tRoas !== null && value === null) err.push("目標の ROAS を使うときは、1 件あたりの売上も入れてください");
    if (err.length) return {errors: err};
    var m = new Model(cpc, cvr, maxClicks, sat, budget);
    var out = {model: m, baseCpa: cpc / cvr, input: inp};
    out.econ = economics({value: value, margin: margin, keep: num(inp.keep), purchases: num(inp.purchases), ltvMonths: num(inp.ltvMonths)});
    if (budget !== null) {
      out.fw = row(m, budget, value, margin);
      if (ctr) { out.fw.imps = out.fw.clicks / ctr; out.fw.cpm = budget / out.fw.imps * 1000; }
    }

    var rv = {}, goalCpa = tCpa;
    if (tRoas !== null) {
      rv.cpaFromRoas = value / tRoas;
      goalCpa = goalCpa === null ? rv.cpaFromRoas : Math.min(goalCpa, rv.cpaFromRoas);
      rv.both = tCpa !== null;
    }
    if (goalCpa !== null) {
      rv.goalCpa = goalCpa; rv.needCvr = cpc / goalCpa; rv.maxCpc = goalCpa * cvr; rv.ratio = (cpc / cvr) / goalCpa;
    }
    if (tConv !== null) {
      var nb = m.budgetFor(tConv);
      rv.conv = {target: tConv, budget: nb, ceiling: (maxClicks !== null || sat) ? m.ceiling() : null};
      if (nb !== null) {
        rv.conv.mcpa = m.marginalCpa(nb); rv.conv.avg = nb / tConv; rv.conv.row = row(m, nb, value, margin);
        if (ctr) { rv.conv.row.imps = rv.conv.row.clicks / ctr; rv.conv.row.cpm = nb / rv.conv.row.imps * 1000; }
      }
    }
    out.rev = rv;

    var mult = [0.8, 0.9, 1.0, 1.1, 1.2], tbl = [];
    mult.forEach(function (kc) {
      var line = {kc: kc, cpc: cpc * kc, cells: []};
      mult.forEach(function (kv) {
        var r2 = cvr * kv, c = {kv: kv, cvr: r2, cpa: r2 <= 1 ? cpc * kc / r2 : null};
        if (value !== null && r2 <= 1) c.roas = value * r2 / (cpc * kc);
        line.cells.push(c);
      });
      tbl.push(line);
    });
    out.sens = tbl;

    if (budget !== null) {
      var plans = [], prev = null;
      [1, 1.5, 2].forEach(function (k) {
        var b = budget * k, r = row(m, b, value, margin);
        r.k = k;
        if (prev !== null) { var d = m.conversions(b) - m.conversions(prev); r.stepCpa = d > 1e-9 ? (b - prev) / d : Infinity; }
        plans.push(r); prev = b;
      });
      out.plans = plans;
      out.capBudget = m.capBudget();
      out.ceiling = sat ? m.r * sat : null;
    }
    return out;
  }

  function num(v) { return (v === null || v === undefined || v === "" || (typeof v === "number" && isNaN(v))) ? null : Number(v); }

  function Plan(conf) {
    var M = conf.months, n = M.length;
    if (!n) throw new Error("月を 1 つ以上入れてください");
    var d = conf.demand && conf.demand.length === n ? conf.demand : M.map(function () { return 1; });
    var mean = d.reduce(function (a, b) { return a + b; }, 0) / n;
    this.M = M; this.k = d.map(function (x) { return x / mean; });
    this.w = conf.monthWeight && conf.monthWeight.length === n ? conf.monthWeight : M.map(function () { return 1; });
    this.step = conf.step || 50000; this.notes = [];
    var self = this;
    this.layers = (conf.layers || []).map(function (L) { return L; });
    this.channels = (conf.channels || []).map(function (c) {
      var o = {}; for (var key in c) o[key] = c[key];
      if (!o.sat) { o.sat = 500000; self.notes.push(o.name + ": 鈍り始める額が無いので 500,000 円とした（仮置き）"); }
      if (o.cap === null || o.cap === undefined || o.cap === "") { o.cap = o.sat * 5; self.notes.push(o.name + ": 月の上限額が無いので、鈍り始める額の 5 倍（" + Math.round(o.cap).toLocaleString() + " 円）で止めた（仮置き）"); }
      return o;
    });
    if (!this.layers.length && !this.channels.length) throw new Error("検索の層か、検索以外の媒体を 1 つ以上入れてください");
  }
  Plan.prototype.searchRows = function (i) {
    var k = this.k[i];
    return this.layers.map(function (L) {
      var cost, clicks;
      if (L.capYen !== null && L.capYen !== undefined && L.capYen !== "") { cost = L.capYen * k; clicks = cost / L.cpc; }
      else { clicks = L.vol * k * L.share * L.ctr; cost = clicks * L.cpc; }
      return {id: L.id, cost: cost, clicks: clicks, conv: clicks * L.cvr, brand: !!L.brand};
    });
  };
  Plan.prototype.search = function (i, spend) {
    var left = spend, conv = 0, nb = 0;
    this.searchRows(i).forEach(function (r) {
      var use = Math.min(left, r.cost), f = r.cost ? use / r.cost : 0;
      conv += r.conv * f; nb += r.brand ? 0 : r.conv * f; left -= use;
    });
    return [conv, nb];
  };
  Plan.prototype.searchCap = function (i) { return this.searchRows(i).reduce(function (a, r) { return a + r.cost; }, 0); };
  Plan.prototype.chan = function (ch, i, x) {
    var r = ch.cvr / ch.cpc * (ch.seasonal ? this.k[i] : 1);
    return r * ch.sat * (1 - E(-x / ch.sat));
  };
  Plan.prototype.conv = function (i, A) {
    var sr = this.search(i, A.search || 0), s = sr[0], nb = sr[1], self = this;
    this.channels.forEach(function (ch) { var v = self.chan(ch, i, A[ch.id] || 0); s += v; nb += v; });
    return [s, nb];
  };
  Plan.prototype.path = function () {
    var n = this.M.length, A = [], cur = [], i, self = this;
    for (i = 0; i < n; i++) { A.push({}); cur.push(this.conv(i, A[i])[0]); }
    var steps = [], spent = 0, total = cur.reduce(function (a, b) { return a + b; }, 0);
    var chans = (this.layers.length ? [["search", null]] : []).concat(this.channels.map(function (c) { return [c.id, c]; }));
    while (steps.length < 20000) {
      var best = null;
      for (i = 0; i < n; i++) {
        for (var j = 0; j < chans.length; j++) {
          var cid = chans[j][0], ch = chans[j][1], have = A[i][cid] || 0;
          var capv = cid === "search" ? self.searchCap(i) : ch.cap;
          var add = Math.min(self.step, capv - have);
          if (add < self.step * 0.2) continue;
          var B = {}; for (var kk in A[i]) B[kk] = A[i][kk];
          B[cid] = have + add;
          var gain = (self.conv(i, B)[0] - cur[i]) * self.w[i];
          if (gain <= 0) continue;
          var cpa = add / gain;
          if (best === null || cpa < best[0]) best = [cpa, i, cid, add, gain / self.w[i]];
        }
      }
      if (best === null) break;
      var bi = best[1], bc = best[2], ba = best[3], g = best[4];
      A[bi][bc] = (A[bi][bc] || 0) + ba; cur[bi] += g; spent += ba; total += g;
      steps.push({spent: spent, conv: total, month: this.M[bi], mi: bi, channel: bc, add: ba, last: g ? ba / g : null});
    }
    return steps;
  };
  Plan.prototype.cut = function (steps, total) {
    var n = this.M.length, A = [], spent = 0, last = null;
    for (var i = 0; i < n; i++) A.push({});
    for (var s = 0; s < steps.length; s++) {
      var st = steps[s];
      if (st.spent > total + 1e-6) break;
      A[st.mi][st.channel] = (A[st.mi][st.channel] || 0) + st.add; spent = st.spent; last = st.last;
    }
    return {A: A, spent: spent, last: last};
  };
  Plan.prototype.evaluate = function (A) {
    var rows = [], tot = 0, nb = 0, self = this;
    this.M.forEach(function (m, i) {
      var c = self.conv(i, A[i]);
      var sum = 0; for (var k in A[i]) sum += A[i][k];
      rows.push({month: m, by: A[i], total: sum, conv: c[0], nonBrand: c[1]});
      tot += c[0]; nb += c[1];
    });
    return {rows: rows, tot: tot, nb: nb};
  };

  function mediaPlan(conf) {
    var p = new Plan(conf), steps = p.path();
    if (!steps.length) throw new Error("どこにも足せませんでした（上限が全部 0 か、率が 0）");
    var maxSpent = steps[steps.length - 1].spent, maxConv = steps[steps.length - 1].conv;
    var baseTotal = num(conf.currentTotal), baseConv = num(conf.currentConv), convSrc = null;
    if (baseConv !== null) convSrc = "入れた実績";
    if (baseTotal && baseConv === null) { baseConv = p.evaluate(p.cut(steps, baseTotal).A).tot; convSrc = "いまの総額をこの道で配ったときの試算（実績ではない）"; }
    var sc = conf.scenarios || (baseTotal ? [{key: "A", name: "A 今の総額で配り直す", total: baseTotal}, {key: "B", name: "B 件数を 1.5 倍に", ratio: 1.5}, {key: "C", name: "C 件数を 2 倍に", ratio: 2}] : []);
    var outSc = [];
    sc.forEach(function (s) {
      var T;
      if (s.total !== undefined && s.total !== null) T = s.total;
      else {
        var goal = baseConv * s.ratio, hit = null;
        for (var q = 0; q < steps.length; q++) if (steps[q].conv >= goal) { hit = steps[q]; break; }
        if (!hit) { outSc.push({key: s.key, name: s.name, reach: false, goal: goal}); return; }
        T = hit.spent;
      }
      var c = p.cut(steps, T), ev = p.evaluate(c.A), by = {};
      ev.rows.forEach(function (r) { for (var k in r.by) by[k] = (by[k] || 0) + r.by[k]; });
      outSc.push({key: s.key, name: s.name, reach: true, total: c.spent, conv: ev.tot, nonBrand: ev.nb,
                  avg: ev.tot ? c.spent / ev.tot : null, last: c.last, by: by, rows: ev.rows});
    });
    var inv = (conf.targets || []).map(function (t) {
      var hit = null;
      for (var q = 0; q < steps.length; q++) if (steps[q].conv >= t) { hit = steps[q]; break; }
      return {target: t, need: hit ? hit.spent : null, last: hit ? hit.last : null};
    });
    return {plan: p, steps: steps, max: {total: maxSpent, conv: maxConv}, base: {total: baseTotal, conv: baseConv, src: convSrc},
            scenarios: outSc, inverse: inv, reach: conf.reach ? reachTable(conf.reach) : null};
  }

  function reachTable(rc) {
    var N = rc.population, ids = Object.keys(rc.channels);
    return {population: N, rows: (rc.budgets || []).map(function (b) {
      var per = b / ids.length, miss = 1, imps = 0;
      ids.forEach(function (id) {
        var ch = rc.channels[id], imp = per / ch.cpm * 1000 * (ch.onTarget === undefined ? 1 : ch.onTarget), r = 1 - E(-imp / N);
        miss *= (1 - r); imps += imp;
      });
      var reach = 1 - miss;
      return {budget: b, pct: pyRound(reach * 100, 1), freq: reach ? pyRound(imps / (reach * N), 1) : null};
    })};
  }

  function r2(y, f) {
    var m = y.reduce(function (a, b) { return a + b; }, 0) / y.length, ss = 0, se = 0;
    y.forEach(function (a, i) { ss += (a - m) * (a - m); se += (a - f[i]) * (a - f[i]); });
    return ss ? 1 - se / ss : 0;
  }
  function fitLinear(x, y) {
    var sxy = 0, sxx = 0;
    x.forEach(function (p, i) { sxy += p * y[i]; sxx += p * p; });
    var a = sxy / (sxx || 1);
    return {kind: "lin", name: "比例", a: a, r2: r2(y, x.map(function (p) { return a * p; }))};
  }
  function gridFit(x, y, g) {
    var best = null, xm = Math.max.apply(null, x);
    for (var i = 0; i < 400; i++) {
      var k = xm * Math.pow(10, -2 + 4 * i / 399), gv = x.map(function (p) { return g(p, k); });
      var num_ = 0, den = 0;
      gv.forEach(function (h, j) { num_ += y[j] * h; den += h * h; });
      var c = num_ / (den || 1), sc = r2(y, gv.map(function (h) { return c * h; }));
      if (best === null || sc > best[2]) best = [k, c, sc];
    }
    return best;
  }
  function fitSat(x, y) { var b = gridFit(x, y, function (p, k) { return p / (p + k); }); return {kind: "sat", name: "頭打ち", b: b[0], c: b[1], r2: b[2]}; }
  function fitExp(x, y) { var b = gridFit(x, y, function (p, k) { return 1 - E(-p / k); }); return {kind: "exp", name: "鈍る", S: b[0], c: b[1], r: b[1] / b[0], r2: b[2]}; }
  function predict(f) {
    if (f.kind === "sat") return function (v) { return f.c * v / (v + f.b); };
    if (f.kind === "exp") return function (v) { return f.c * (1 - E(-v / f.S)); };
    return function (v) { return f.a * v; };
  }
  function fitCurve(costs, values) {
    var pts = [];
    costs.forEach(function (c, i) {
      var v = values[i];
      if (c === null || c === undefined || c === "" || v === null || v === undefined || v === "" || isNaN(c) || isNaN(v)) return;
      if (Number(c) > 0) pts.push([Number(c), Number(v), i]);
    });
    if (pts.length < 4) return {tooFew: true, n: pts.length, pts: pts};
    var x = pts.map(function (p) { return p[0]; }), y = pts.map(function (p) { return p[1]; });
    var lin = fitLinear(x, y), sat = fitSat(x, y), ex = fitExp(x, y);
    var curved = sat.r2 >= ex.r2 ? sat : ex;
    var best = curved.r2 > lin.r2 + 0.02 ? curved : lin;
    return {pts: pts, lin: lin, sat: sat, exp: ex, best: best, xmin: Math.min.apply(null, x), xmax: Math.max.apply(null, x),
            strength: best.r2 < 0.3 ? "weak" : (best.r2 < 0.6 ? "mid" : "ok")};
  }

  var api = {pyRound: pyRound, yen: yen, Model: Model, cpaRoas: cpaRoas, economics: economics, Plan: Plan, mediaPlan: mediaPlan,
             reachTable: reachTable, fitCurve: fitCurve, predict: predict, r2: r2};
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.SIM = api;
})(this);
