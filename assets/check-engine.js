
(function (root) {
  "use strict";
  var CK = root.CK;
  function setData(d) { CK = d; }

  function isWide(cp) {
    var r = CK.eaw, lo = 0, hi = r.length / 2 - 1;
    while (lo <= hi) { var m = (lo + hi) >> 1; if (cp < r[2 * m]) hi = m - 1; else if (cp > r[2 * m + 1]) lo = m + 1; else return true; }
    return false;
  }
  function width(t) { var n = 0; for (var ch of String(t)) n += isWide(ch.codePointAt(0)) ? 2 : 1; return n; }
  function chars(t) { return Array.from(String(t)); }

  function isEmoji(ch) {
    if (CK.decorative.indexOf(ch) >= 0) return false;
    var o = ch.codePointAt(0);
    return o >= 0x1F000 || (o >= 0x2600 && o <= 0x27BF) || o === 0xFE0F || (o >= 0x2B00 && o <= 0x2BFF);
  }
  function uniqSorted(arr) { return Array.from(new Set(arr)).sort(function (a, b) { return a.codePointAt(0) - b.codePointAt(0); }); }

  function editorialFlags(text) {
    var t = String(text), out = [], m;
    var re1 = /([^\p{L}\p{N}_\s])\1+/gu;
    while ((m = re1.exec(t))) out.push("同じ記号の繰り返し「" + m[0] + "」");
    var re2 = /[、。，．,.!！?？・:：;；]{2,}/g;
    while ((m = re2.exec(t))) if (new Set(chars(m[0])).size > 1) out.push("句読点・記号の連続「" + m[0] + "」");
    var deco = uniqSorted(chars(t).filter(function (c) { return CK.decorative.indexOf(c) >= 0; }));
    if (deco.length) out.push("飾りに見える記号 " + deco.join("") + "（目立たせるための記号は不可。★・【】の扱いは 29 で ❓）");
    var em = uniqSorted(chars(t).filter(isEmoji));
    if (em.length) out.push("絵文字 " + em.join("") + "（無効な文字）");
    var hk = uniqSorted(chars(t).filter(function (c) { var o = c.codePointAt(0); return o >= 0xFF61 && o <= 0xFF9F; }));
    if (hk.length) out.push("半角カタカナ " + hk.join("") + "（無効な文字）");
    if (t !== t.replace(/^\s+|\s+$/g, "")) out.push("先頭か末尾に空白");
    if (t.indexOf("　") >= 0) out.push("全角スペース（強調のための全角スペースは不可）");
    if (/[ \t]{2,}/.test(t)) out.push("空白が 2 つ以上続く");
    if (/(?<!\S)\S(?: \S){2,}(?!\S)/u.test(t)) out.push("1 文字ずつ空白で区切っている（「今 だ け」の形）");
    return out;
  }
  function dupKey(t) { return String(t).normalize("NFKC").toLowerCase().replace(/\s+/g, ""); }
  function norm(s) { return String(s || "").normalize("NFKC").toLowerCase().replace(/[\s_\-]+/g, ""); }
  function pyList(a) { return "[" + a.map(function (x) { return "'" + x + "'"; }).join(", ") + "]"; }
  function strip(s) { return String(s).replace(/^\s+|\s+$/g, ""); }

  function pickType(adType) {
    var t = norm(adType);
    if (["", "数えるだけ", "count", "countonly", "なし"].indexOf(t) >= 0) return ["数えるだけ", null];
    for (var name in CK.ad) {
      var keys = CK.ad[name].alias.concat([name]).map(norm);
      if (keys.indexOf(t) >= 0) return [name, CK.ad[name]];
    }
    throw new Error("広告の種類が分からない: " + adType);
  }
  function alias(k) {
    var a = CK.fieldAliases, s = strip(k);
    return a[s.toLowerCase()] !== undefined ? a[s.toLowerCase()] : (a[s] !== undefined ? a[s] : null);
  }

  function adTextCheck(adType, fields) {
    var pt = pickType(adType), name = pt[0], spec = pt[1];
    var given = {}, order = [], unknown = [];
    Object.keys(fields).forEach(function (k) {
      var v = fields[k], key = alias(k);
      if (name === "レスポンシブ ディスプレイ広告" && key === "見出し") key = "短い見出し";
      if (key === "CTAの見出し") key = (spec && spec.items["見出し"] && spec.items["行動を促すフレーズ"]) ? "見出し" : null;
      if (spec && key === "見出し" && !spec.items["見出し"] && spec.items["長い見出し"]) key = "長い見出し";
      if (spec && !spec.items[key] && key !== "ヘッダー") { unknown.push(String(k)); return; }
      var kk = key || String(k);
      if (!given[kk]) { given[kk] = []; order.push(kk); }
      given[kk] = given[kk].concat(Array.isArray(v) ? v.map(function (x) { return x == null ? "" : String(x); }) : [String(v)]);
    });
    var results = [], findings = [];
    var items = spec ? spec.items : (function () { var o = {}; order.forEach(function (k) { o[k] = {max: null}; }); return o; })();
    Object.keys(items).forEach(function (field) {
      var rule = items[field], texts = given[field] || [], seen = {}, shortOk = false;
      texts.forEach(function (text, ix) {
        var i = ix + 1, w = width(text), row = {項目: field, 番号: i, 文: text, 半角換算: w, 気になる点: []};
        var mx = rule.max, alt = rule.alt_max;
        if (mx !== null && mx !== undefined) {
          row.上限 = alt == null ? mx : [mx, alt];
          if (alt == null) { row.残り = mx - w; row.判定 = w <= mx ? "収まる" : "超過（" + (w - mx) + " 超える）"; }
          else {
            var lo = Math.min(mx, alt), hi = Math.max(mx, alt);
            row.判定 = w <= lo ? "どちらでも収まる" : (w <= hi ? hi + " なら収まるが " + lo + " だと超過（公式の中で食い違う）" : "どちらでも超過（" + (w - hi) + " 超える）");
          }
          if (w > (alt == null ? mx : Math.min(mx, alt))) findings.push(field + " " + i + ": " + row.判定 + "（" + w + "／上限 " + (alt == null ? mx : mx + " か " + alt) + "）");
        }
        if (rule.short && w <= rule.short) shortOk = true;
        if (!strip(text)) row.気になる点.push("空の文");
        var flags = editorialFlags(text), k = dupKey(text);
        var dupOn = rule.dup !== undefined ? rule.dup : spec === null;
        if (dupOn && k) { if (seen[k]) flags.push(field + " " + seen[k] + " と同じ文（重複）"); else seen[k] = i; }
        if (flags.length) { row.気になる点 = row.気になる点.concat(flags); findings.push(field + " " + i + ": " + flags.join("、")); }
        results.push(row);
      });
      if (!spec) return;
      var cnt = rule.count || [0, null], lo2 = cnt[0], hi2 = cnt[1];
      var n = texts.filter(function (t) { return strip(t); }).length;
      if (n < lo2) findings.push(field + ": " + n + " 本。最少 " + lo2 + " 本");
      if (hi2 != null && n > hi2) findings.push(field + ": " + n + " 本。最大 " + hi2 + " 本");
      if (rule.rec && texts.length && n < rule.rec) findings.push(field + ": " + n + " 本。ヘルプは " + rule.rec + " 本以上を求めている（推奨）");
      if (rule.rec_max) {
        var over = []; texts.forEach(function (t, ix) { if (width(t) > rule.rec_max) over.push(ix + 1); });
        if (over.length) findings.push(field + " [" + over.join(", ") + "]: 推奨の 半角 " + rule.rec_max + " を超える（上限内なので入稿はできる。推奨の目安）");
      }
      if (rule.short && texts.length && !shortOk) findings.push(field + ": 半角 " + rule.short + " 以内の文が 1 本も無い（1 本以上入れる決まり・推奨がある）");
      if (rule.needs && texts.length && texts.some(function (t) { return strip(t); }) && !(given[rule.needs] || []).some(function (t) { return strip(t); }))
        findings.push(field + " だけを入れることはできない（" + rule.needs + " が先に要る）");
      if (rule.conflict && texts.length) findings.push(field + ": " + rule.conflict);
      if (rule.unit_note && texts.length) findings.push(field + ": " + rule.unit_note);
    });
    if (name === "サイトリンク") {
      var d1 = given["説明文1"] || [], d2 = given["説明文2"] || [];
      for (var i = 0; i < Math.max(d1.length, d2.length); i++) {
        var a = i < d1.length ? strip(d1[i]) : "", b = i < d2.length ? strip(d2[i]) : "";
        if (!!a !== !!b) findings.push("サイトリンク " + (i + 1) + ": 説明文は 2 行とも入れるか、両方空にする（片方だけは不可）");
      }
      var links = (given["リンク文"] || []).filter(function (t) { return strip(t); });
      if (links.length > 0 && links.length < 2) findings.push("サイトリンクは 2 個以上ないと出ない");
    }
    if (name === "構造化スニペット" && given["ヘッダー"]) findings.push("ヘッダーは用意された一覧から選ぶ（一覧との照合はしていない。15 の 2-20）");
    if (unknown.length) findings.push("この種類に無い項目は数えていない: " + pyList(unknown) + "（使える項目: " + pyList(spec ? Object.keys(spec.items) : []) + "）");
    return {name: name, spec: spec, findings: findings, rows: results};
  }

  function ratioOk(w, h, r) { return Math.abs((w / h) / (r[0] / r[1]) - 1) <= CK.ratioTol; }
  function fmtN(x) { return Number(x).toLocaleString("en-US"); }
  function fmtF(x) { var s = Number.isInteger(x) ? x.toLocaleString("en-US") + ".0" : x.toLocaleString("en-US", {maximumFractionDigits: 12}); return s; }

  function imageCheck(o) {
    var w = parseInt(o.width, 10), h = parseInt(o.height, 10);
    if (!(w > 0) || !(h > 0)) throw new Error("幅と高さを 1 以上の数字で入れてください");
    var kb = (o.sizeKb === null || o.sizeKb === undefined || o.sizeKb === "") ? null : Number(o.sizeKb);
    var raw = strip(o.fileFormat || "").toUpperCase().replace(/^\./, "");
    var ftype = raw ? (CK.typeAliases[raw] || raw) : null;
    var wanted = o.formats && o.formats.length ? o.formats : null;
    var fits = [], near = [], miss = [];
    CK.img.forEach(function (s) {
      if (wanted && wanted.indexOf(s.fmt) < 0) return;
      var name = s.fmt + "／" + s.slot;
      if (!ratioOk(w, h, s.ratio)) { miss.push(name); return; }
      var problems = [], notes = [];
      if (s.min) {
        var mw = s.min[0], mh = s.min[1];
        if (w < mw || h < mh) problems.push("小さすぎる（最小 " + mw + "×" + mh + "）");
        if (s.alt_min && (w < s.alt_min[0] || h < s.alt_min[1]) && !(w < mw || h < mh)) notes.push(s.conflict);
      }
      if (s.note) notes.push(s.note);
      if (s.max_kb !== null && s.max_kb !== undefined) {
        if (kb === null) notes.push("容量を渡していないので、容量の上限（" + fmtN(s.max_kb) + " KB）は見ていない");
        else if (kb > s.max_kb) problems.push("容量が大きすぎる（" + fmtF(kb) + " KB。上限 " + fmtN(s.max_kb) + " KB）");
      }
      if (s.types) {
        if (!ftype) notes.push("形式を渡していないので、形式は見ていない");
        else if ((s.maybe || []).indexOf(ftype) >= 0) notes.push(ftype + " はヘルプとAPIで扱いが食い違う（ヘルプは JPG・PNG、API は GIF も可）。事前にテスト入稿");
        else if (s.types.indexOf(ftype) < 0) problems.push("形式 " + ftype + " は使えない（" + s.types.join("・") + "）");
      } else notes.push("形式の決まりは知識ベースに無い（見ていない）");
      var row = {fmt: s.fmt, slot: s.slot, ratio: s.ratio[0] + ":" + s.ratio[1], 判定: problems.length ? "合わない" : "合う", 理由: problems, rec: s.rec ? s.rec[0] + "×" + s.rec[1] : null, 注記: notes, refs: s.refs};
      (problems.length ? near : fits).push(row);
    });
    var upload = null;
    if (!wanted || wanted.indexOf("イメージ広告（アップロード）") >= 0) {
      var group = null;
      Object.keys(CK.upload).forEach(function (g) { if (!group && CK.upload[g].some(function (x) { return x[0] === w && x[1] === h; })) group = g; });
      var pr = [], nt = [];
      if (!group) pr.push("決まった寸法（20 種）のどれでもない");
      if (kb === null) nt.push("容量を渡していないので、上限（" + CK.uploadMaxKb + " KB）は見ていない");
      else if (kb > CK.uploadMaxKb) pr.push("容量が大きすぎる（" + fmtF(kb) + " KB。上限 " + CK.uploadMaxKb + " KB）");
      if (!ftype) nt.push("形式を渡していないので、形式は見ていない");
      else if (CK.uploadTypes.indexOf(ftype) < 0) pr.push("形式 " + ftype + " は使えない（GIF・JPG・PNG）");
      upload = {fmt: "イメージ広告（アップロード）", slot: group, 判定: pr.length ? "合わない" : "合う", 理由: pr, 注記: nt, refs: [{file: "16", key: "D-74"}, {file: "16", key: "形式", sec: "5-2"}]};
    }
    return {w: w, h: h, kb: kb, ftype: ftype, ratio: Math.round(w / h * 10000) / 10000, fits: fits, near: near, miss: miss, upload: upload};
  }

  function ratioName(w, h) {
    var r = w / h, R = CK.v.ratios;
    for (var i = 0; i < R.length; i++) if (Math.abs(r / R[i][1] - 1) <= CK.v.tol) return [R[i][0], R[i][2]];
    return ["その他", r > 1 ? "横" : (r < 1 ? "縦" : "正方形")];
  }
  function f2(x) { return x.toFixed(2); }
  function f1(x) { return x.toFixed(1); }
  function f3(x) { return x.toFixed(3); }

  function common(w, h, ratio, orient, sizeBytes, ftype, hasVideo, audio) {
    var rows = [], findings = [], V = CK.v;
    function row(item, verdict, detail, refs) { rows.push({項目: item, 判定: verdict, 中身: detail, refs: refs}); if (verdict === "合わない" || verdict === "要確認") findings.push(item + ": " + detail); }
    if (ftype === null) row("形式", "未確認", "形式が分からないので見ていない", [{file: "39", key: "V-01"}]);
    else if (V.audioOnly.indexOf(ftype) >= 0) row("形式", "合わない", ftype + " は音声だけのファイル。映像が要る", [{file: "39", key: "V-03"}]);
    else {
      var nm = Object.prototype.hasOwnProperty.call(V.accepted, ftype) ? V.accepted[ftype] : "?";
      if (nm) row("形式", nm !== "?" ? "合う" : "未確認", nm !== "?" ? nm + "（受け付ける形式の一覧にある）" : ftype + " は受け付ける形式の一覧と照らせなかった", [{file: "39", key: "V-01"}]);
      else row("形式", "合わない", ftype + " は受け付ける形式の一覧に無い（MP4・MOV・WebM などで書き出す）", [{file: "39", key: "V-01"}]);
    }
    if (!hasVideo) row("映像", "合わない", "映像の流れが見つからない", [{file: "39", key: "V-03"}]);
    if (sizeBytes === null) row("容量", "未確認", "容量を渡していないので見ていない（上限 256 GB）", [{file: "39", key: "V-02"}]);
    else row("容量", sizeBytes < V.maxBytes ? "合う" : "合わない", (sizeBytes / 1048576).toLocaleString("en-US", {minimumFractionDigits: 1, maximumFractionDigits: 1}) + " MB（上限 256 GB 未満）", [{file: "39", key: "V-02"}]);
    if (V.recRatios.indexOf(ratio) >= 0) row("縦横比", "合う", ratio + "（推奨の比率）", [{file: "39", key: "V-04"}]);
    else if (ratio !== "その他") row("縦横比", "合う", ratio + "（受け付けるが推奨ではない。推奨は 16:9・9:16・1:1）", [{file: "39", key: "V-04"}]);
    else row("縦横比", "要確認", w + "×" + h + "（" + f3(w / h) + "）は一覧のどの比率にも当たらない（±1% で見た）。黒帯が付くか断られる可能性", [{file: "39", key: "V-04"}]);
    var tiers = ["16:9", "9:16", "1:1"].indexOf(ratio) >= 0 ? V.res[orient] : null;
    if (tiers) {
      var rec = tiers[0], hd = tiers[1], sd = tiers[2];
      if (w >= rec[0] && h >= rec[1]) row("解像度", "合う", w + "×" + h + "（推奨の 1080p 以上）", [{file: "39", key: "V-05"}]);
      else if (w >= hd[0] && h >= hd[1]) row("解像度", "要確認", w + "×" + h + "（HD の最小 " + hd[0] + "×" + hd[1] + " 以上だが、推奨の " + rec[0] + "×" + rec[1] + " 未満）", [{file: "39", key: "V-06"}]);
      else if (w >= sd[0] && h >= sd[1]) row("解像度", "要確認", w + "×" + h + "（SD。公式は SD を推奨しない）", [{file: "39", key: "V-07"}]);
      else row("解像度", "合わない", w + "×" + h + "（SD の最小 " + sd[0] + "×" + sd[1] + " 未満。受け付けられない可能性。39 の V-07 は推測を含む）", [{file: "39", key: "V-07"}]);
    } else row("解像度", "未確認", w + "×" + h + "。" + ratio + " の比率の推奨・最小の解像度は知識ベースに無い", [{file: "39", key: "V-05"}]);
    if (audio === null) rows.push({項目: "音声", 判定: "未確認", 中身: "音声の有無を渡していない", refs: []});
    else if (!audio) rows.push({項目: "音声", 判定: "参考", 中身: "音声が無い（無音）。仕様の決まりではない。38 の ABCD は音を使うことを勧める", refs: []});
    return [rows, findings];
  }

  function slotCheck(s, dur, ratio, orient) {
    var problems = [], notes = [], extra = null, E = CK.v.eps;
    if (s.ratios && s.ratios.indexOf(ratio) < 0) problems.push("比率 " + ratio + " はこの枠の比率（" + s.ratios.join("・") + "）に無い");
    if (s.must_horizontal && orient !== "横") problems.push("この枠は横長でなければならない");
    if (s.rec_ratios && s.rec_ratios.indexOf(ratio) < 0 && !problems.length) notes.push("この枠の推奨の向きは " + s.rec_ratios.join("・"));
    if (dur === null) notes.push("長さが分からないので、長さは見ていない");
    else {
      var mn = s.min, mx = s.max, alt = s.alt_max;
      if (mn != null && dur < mn - E) problems.push("短すぎる（" + f2(dur) + " 秒。" + mn + " 秒以上）");
      if (mx != null && dur > mx + E) problems.push("長すぎる（" + f2(dur) + " 秒。" + mx + " 秒以下）");
      else if (alt != null && dur > alt + E) extra = "英語版の上限（" + mx + " 秒）なら合うが、日本語版の上限（" + alt + " 秒）だと超過";
      if (s.rec_max && dur >= s.rec_max) notes.push(s.rec_max + " 秒未満を推奨（" + f1(dur) + " 秒）");
      if (s.rec_min && dur <= s.rec_min) notes.push(s.rec_min + " 秒超を推奨（" + f1(dur) + " 秒）");
      if (s.rec && Math.abs(dur - s.rec) > 0.5) notes.push("推奨は " + s.rec + " 秒（" + f1(dur) + " 秒）");
      if (s.instream_min && dur < s.instream_min && !problems.length) notes.push(s.instream_min + " 秒未満なので YouTube のインストリームには出ない（インフィード・ショートなどには出る）");
      if (mn == null) notes.push("長さの下限は知識ベースで未確認");
    }
    if (s.note) notes.push(s.note);
    if (s.conflict) notes.push(s.conflict);
    notes = Array.from(new Set(notes));
    var verdict = problems.length ? "合わない" : (extra ? "どちらとも言えない（公式の中で食い違う）" : "合う");
    if (extra) notes.unshift(extra);
    return {fmt: s.fmt, 判定: verdict, 理由: problems, 注記: notes, refs: s.refs};
  }

  function videoCheck(o) {
    var w = parseInt(o.width, 10), h = parseInt(o.height, 10);
    if (!(w > 0) || !(h > 0)) throw new Error("幅と高さを 1 以上の数字で入れてください");
    var dur = (o.duration === null || o.duration === undefined || o.duration === "") ? null : Number(o.duration);
    if (dur !== null && !(dur > 0)) throw new Error("長さは 0 より大きい秒数で入れてください");
    var sizeBytes = o.sizeBytes != null ? o.sizeBytes : ((o.sizeMb === null || o.sizeMb === undefined || o.sizeMb === "") ? null : Math.trunc(Number(o.sizeMb) * 1048576));
    var ftype = strip(o.fileFormat || "").toLowerCase().replace(/^\./, "") || null;
    var rn = ratioName(w, h), ratio = rn[0], orient = rn[1];
    var wanted = o.formats && o.formats.length ? o.formats : null;
    var c = common(w, h, ratio, orient, sizeBytes, ftype, true, o.audio === undefined ? null : o.audio);
    var slots = CK.v.slots.filter(function (s) { return !wanted || wanted.indexOf(s.fmt) >= 0; }).map(function (s) { return slotCheck(s, dur, ratio, orient); });
    var combos = [];
    if (dur !== null) CK.v.combos.forEach(function (cb) { if (cb.orient === orient && cb.lo - CK.v.eps <= dur && dur <= cb.hi + CK.v.eps) combos.push(cb); });
    var fits = slots.filter(function (s) { return s.判定 === "合う"; }).map(function (s) { return s.fmt; });
    var summary = c[1].slice();
    summary.push(fits.length ? "合う枠: " + fits.join("、") : "どの枠にも合わない（理由は「フォーマットごと」）");
    return {w: w, h: h, dur: dur, ratio: ratio, orient: orient, ftype: ftype, common: c[0], findings: summary, slots: slots, combos: combos};
  }

  var api = {setData: setData, width: width, editorialFlags: editorialFlags, adTextCheck: adTextCheck, imageCheck: imageCheck, videoCheck: videoCheck};
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.CKE = api;
})(this);
