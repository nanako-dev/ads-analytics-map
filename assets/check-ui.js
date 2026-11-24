
(function () {
  "use strict";
  var E = window.CKE, CK = window.CK, $ = function (id) { return document.getElementById(id); };
  function H(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]; }); }
  function refs(rs) { return (rs || []).map(function (r) { return H(r.file + " " + r.key + (r.sec ? "（" + r.sec + "）" : "")); }).join("・"); }
  function tone(v) { return /合わない|超過/.test(v) ? "ng" : (/要確認|どちら|食い違|未確認/.test(v) ? "mid" : (/参考/.test(v) ? "" : "ok")); }

  document.querySelectorAll("[data-t]").forEach(function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll("[data-t]").forEach(function (x) { x.classList.toggle("on", x === b); });
      ["text", "img", "vid"].forEach(function (k) { $("ck-" + k).hidden = k !== b.dataset.t; });
    });
  });

  var SAMPLE = {"見出し": "駅前の焼きたてパン工房\n毎朝 7 時から焼きたて\n今だけ！！！ ★特価★", "説明文": "毎朝 7 時から焼きたてを並べています。電話で取り置きもできます。\n季節のパンは数量限定です。", "パス1": "パン", "パス2": "焼きたて"};
  var kept = {};
  function fieldsFor(name) {
    if (name === "数えるだけ") return {"文": {max: null}};
    return CK.ad[name].items;
  }
  function drawFields() {
    var name = $("ad-type").value, items = fieldsFor(name);
    $("ad-fields").innerHTML = Object.keys(items).map(function (f) {
      var r = items[f], c = r.count || [0, null];
      var lim = r.max != null ? "上限 半角 " + r.max + (r.alt_max ? " か " + r.alt_max + "（食い違い）" : "") : "上限なし・未確認";
      var cnt = r.count ? "・" + c[0] + "〜" + (c[1] == null ? "" : c[1]) + " 本" : "";
      var v = kept[name + "|" + f] !== undefined ? kept[name + "|" + f] : (kept["*|" + f] !== undefined ? kept["*|" + f] : (SAMPLE[f] || ""));
      return '<label class="ckf"><span class="sl">' + H(f) + '<em class="mk">' + H(lim + cnt) + '</em></span><textarea data-f="' + H(f) + '" rows="' + Math.min(6, Math.max(2, (c[1] || 2))) + '" placeholder="1 行に 1 本">' + H(v) + '</textarea><small>根拠: ' + refs(r.refs) + '</small></label>';
    }).join("");
    $("ad-fields").querySelectorAll("textarea").forEach(function (t) { t.addEventListener("input", function () { kept[name + "|" + t.dataset.f] = t.value; kept["*|" + t.dataset.f] = t.value; runText(); }); });
    runText();
  }
  function runText() {
    var name = $("ad-type").value, fields = {};
    $("ad-fields").querySelectorAll("textarea").forEach(function (t) { var lines = t.value.split(/\r?\n/); if (lines.length === 1 && lines[0] === "") lines = []; fields[t.dataset.f] = lines; });
    var o;
    try { o = E.adTextCheck(name, fields); } catch (ex) { $("ad-sum").innerHTML = '<p class="k-err">' + H(ex.message) + "</p>"; return; }
    var n = o.findings.length;
    $("ad-sum").innerHTML = '<div class="k-big"><div class="w"><span>' + H(o.name) + '</span><b>' + (n ? "気になる点 " + n + " 件" : "気になる点なし") + '</b><small>文字数・本数・編集基準の目印</small></div></div>' +
      (n ? '<ul class="ck-fl">' + o.findings.map(function (f) { return "<li>" + H(f) + "</li>"; }).join("") + "</ul>" : '<p class="k-say">上限・本数・編集基準の目印で、気になる点は見つかりませんでした。</p>');
    var spec = o.spec;
    $("ad-rows").innerHTML = o.rows.length ? '<div class="sim-tw"><table class="sim-t ck-t"><thead><tr><th>項目</th><th>#</th><th>文</th><th>半角換算</th><th>判定</th><th>気になる点</th></tr></thead><tbody>' +
      o.rows.map(function (r) {
        var mx = Array.isArray(r.上限) ? Math.min(r.上限[0], r.上限[1]) : r.上限, pct = mx ? Math.min(100, 100 * r.半角換算 / mx) : 0;
        var bar = mx ? '<span class="ck-bar' + (r.半角換算 > mx ? " over" : "") + '"><i style="width:' + pct.toFixed(1) + '%"></i></span>' : "";
        return "<tr><th>" + H(r.項目) + "</th><td>" + r.番号 + '</td><td class="ck-txt">' + H(r.文) + "</td><td>" + bar + r.半角換算 + (mx ? " / " + (Array.isArray(r.上限) ? r.上限.join(" か ") : mx) : "") + '</td><td class="' + tone(r.判定 || "") + '">' + H(r.判定 || "—") + '</td><td class="ck-fl2">' + (r.気になる点.length ? r.気になる点.map(H).join("<br>") : "—") + "</td></tr>";
      }).join("") + "</tbody></table></div>" : "";
  }
  $("ad-type").addEventListener("change", drawFields);
  drawFields();

  function imgHtml(o, title) {
    function rows(list) {
      return list.map(function (r) {
        return '<tr><th>' + H(r.fmt) + '</th><td>' + H(r.slot || "—") + '</td><td class="' + tone(r.判定) + '">' + H(r.判定) + '</td><td>' + H((r.理由 || []).join("、") || "—") + (r.rec ? '<br><small>推奨 ' + H(r.rec) + '</small>' : "") + '</td><td class="ck-fl2">' + (r.注記 || []).map(H).join("<br>") + '</td><td class="ref">' + refs(r.refs) + "</td></tr>";
      }).join("");
    }
    var all = o.fits.concat(o.near).concat(o.upload ? [o.upload] : []);
    var nfit = o.fits.length + (o.upload && o.upload.判定 === "合う" ? 1 : 0);
    return '<div class="ck-res"><h3 class="sim-h3">' + H(title) + "　" + o.w + "×" + o.h + "（比率 " + o.ratio + "）" + (o.kb != null ? "・" + o.kb + " KB" : "") + (o.ftype ? "・" + H(o.ftype) : "") + '</h3>' +
      '<p class="k-say">合う枠 <b>' + nfit + "</b> ／ 比率は合うが条件を満たさない " + (o.near.length + (o.upload && o.upload.判定 !== "合う" ? 1 : 0)) + " ／ 比率が合わない " + o.miss.length + "</p>" +
      (all.length ? '<div class="sim-tw"><table class="sim-t ck-t"><thead><tr><th>フォーマット</th><th>枠</th><th>判定</th><th>理由</th><th>注記</th><th>根拠</th></tr></thead><tbody>' + rows(all) + "</tbody></table></div>" : "") +
      (o.miss.length ? '<details class="sb-paste"><summary>比率が合わない枠（' + o.miss.length + '）</summary><p class="sb-note">' + o.miss.map(H).join("、") + "</p></details>" : "") + "</div>";
  }
  function runImgNum() {
    var f = $("img-f").value;
    try {
      var o = E.imageCheck({width: $("img-w").value, height: $("img-h").value, sizeKb: $("img-kb").value === "" ? null : $("img-kb").value, fileFormat: $("img-t").value, formats: f ? [f] : null});
      $("img-out").innerHTML = imgHtml(o, "数字で入れた画像");
      var nfit = o.fits.length + (o.upload && o.upload.判定 === "合う" ? 1 : 0);
      $("img-sum").innerHTML = '<div class="k-big"><div class="w"><span>' + o.w + "×" + o.h + '</span><b>合う枠 ' + nfit + '</b><small>比率の許容は ±1%</small></div></div><ul class="ck-fl">' + o.fits.map(function (r) { return "<li>" + H(r.fmt + "／" + r.slot) + "</li>"; }).join("") + (o.upload && o.upload.判定 === "合う" ? "<li>イメージ広告（アップロード）／" + H(o.upload.slot) + "</li>" : "") + "</ul>";
    } catch (ex) { $("img-sum").innerHTML = '<p class="k-err">' + H(ex.message) + "</p>"; $("img-out").innerHTML = ""; }
  }
  ["img-w", "img-h", "img-kb", "img-t", "img-f"].forEach(function (id) { $(id).addEventListener("input", runImgNum); $(id).addEventListener("change", runImgNum); });
  var MIME = {"image/png": "PNG", "image/jpeg": "JPEG", "image/gif": "GIF", "image/webp": "WEBP", "image/bmp": "BMP"};
  $("img-file").addEventListener("change", function () {
    var files = [].slice.call(this.files || []), out = [], done = 0, f = $("img-f").value;
    if (!files.length) return;
    $("img-out").innerHTML = '<p class="sim-empty">読んでいます…</p>';
    files.forEach(function (file, i) {
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function () {
        try {
          var o = E.imageCheck({width: im.naturalWidth, height: im.naturalHeight, sizeKb: Math.round(file.size / 1024 * 10) / 10, fileFormat: MIME[file.type] || file.name.split(".").pop(), formats: f ? [f] : null});
          out[i] = '<div class="ck-thumb"><img src="' + url + '" alt=""></div>' + imgHtml(o, file.name);
        } catch (ex) { out[i] = '<p class="k-err">' + H(file.name + ": " + ex.message) + "</p>"; }
        if (++done === files.length) { $("img-out").innerHTML = out.join(""); $("img-sum").innerHTML = '<p class="k-say">' + files.length + " 枚を読みました。下に 1 枚ずつ出します。</p>"; }
      };
      im.onerror = function () { out[i] = '<p class="k-err">' + H(file.name) + ": この形式はブラウザで読めませんでした。数字で入れてください</p>"; if (++done === files.length) $("img-out").innerHTML = out.join(""); };
      im.src = url;
    });
  });
  runImgNum();

  function vidHtml(o, title) {
    var c = '<div class="sim-tw"><table class="sim-t ck-t"><thead><tr><th>共通の決まり</th><th>判定</th><th>中身</th><th>根拠</th></tr></thead><tbody>' +
      o.common.map(function (r) { return "<tr><th>" + H(r.項目) + '</th><td class="' + tone(r.判定) + '">' + H(r.判定) + "</td><td>" + H(r.中身) + '</td><td class="ref">' + refs(r.refs) + "</td></tr>"; }).join("") + "</tbody></table></div>";
    var s = '<div class="sim-tw"><table class="sim-t ck-t"><thead><tr><th>フォーマット</th><th>判定</th><th>理由</th><th>注記</th><th>根拠</th></tr></thead><tbody>' +
      o.slots.map(function (r) { return "<tr><th>" + H(r.fmt) + '</th><td class="' + tone(r.判定) + '">' + H(r.判定) + "</td><td>" + H(r.理由.join("、") || "—") + '</td><td class="ck-fl2">' + r.注記.map(H).join("<br>") + '</td><td class="ref">' + refs(r.refs) + "</td></tr>"; }).join("") + "</tbody></table></div>";
    var k = o.combos.length ? '<ul class="sim-list">' + o.combos.map(function (cb) { return "<li>" + H(cb.campaign) + "：推奨の 1 本「" + H(cb.piece) + "」（" + H(cb.ref.file + " " + cb.ref.key) + "）</li>"; }).join("") + "</ul>" : '<p class="sb-note">どの推奨の 1 本にも当たりません（または長さが分かりません）。</p>';
    return '<div class="ck-res"><h3 class="sim-h3">' + H(title) + "　" + (o.dur != null ? o.dur + " 秒・" : "") + o.w + "×" + o.h + "（" + H(o.ratio) + "・" + H(o.orient) + "）</h3>" + c + '<h3 class="sim-h3">フォーマットごと</h3>' + s +
      '<h3 class="sim-h3">推奨の組み合わせのどれに当たるか</h3>' + k + '<p class="sb-note">' + H(CK.v.comboNote) + "。比率の許容は ±1%（動画の許容幅は知識ベースに無いので、画像と同じ幅で見た）。</p></div>";
  }
  function vidSum(o) {
    $("vid-sum").innerHTML = '<div class="k-big"><div class="w"><span>' + (o.dur != null ? o.dur + " 秒・" : "") + o.w + "×" + o.h + '</span><b>' + (o.slots.filter(function (s) { return s.判定 === "合う"; }).length) + ' 枠に合う</b><small>' + H(o.ratio + "・" + o.orient) + '</small></div></div><ul class="ck-fl">' + o.findings.map(function (f) { return "<li>" + H(f) + "</li>"; }).join("") + "</ul>";
  }
  function audio() { var v = $("vid-a").value; return v === "" ? null : v === "1"; }
  function runVidNum() {
    var f = $("vid-f").value;
    try {
      var o = E.videoCheck({duration: $("vid-d").value === "" ? null : $("vid-d").value, width: $("vid-w").value, height: $("vid-h").value, sizeMb: $("vid-mb").value === "" ? null : $("vid-mb").value, fileFormat: $("vid-t").value, audio: audio(), formats: f ? [f] : null});
      vidSum(o); $("vid-out").innerHTML = vidHtml(o, "数字で入れた動画");
    } catch (ex) { $("vid-sum").innerHTML = '<p class="k-err">' + H(ex.message) + "</p>"; $("vid-out").innerHTML = ""; }
  }
  ["vid-d", "vid-w", "vid-h", "vid-mb", "vid-t", "vid-a", "vid-f"].forEach(function (id) { $(id).addEventListener("input", runVidNum); $(id).addEventListener("change", runVidNum); });
  $("vid-file").addEventListener("change", function () {
    var file = (this.files || [])[0]; if (!file) return;
    var url = URL.createObjectURL(file), v = document.createElement("video"), f = $("vid-f").value;
    v.preload = "metadata"; v.muted = true;
    v.onloadedmetadata = function () {
      try {
        var o = E.videoCheck({duration: isFinite(v.duration) ? Math.round(v.duration * 1000) / 1000 : null, width: v.videoWidth, height: v.videoHeight, sizeBytes: file.size, fileFormat: file.name.split(".").pop(), audio: audio(), formats: f ? [f] : null});
        vidSum(o); $("vid-out").innerHTML = '<div class="ck-thumb v"><video src="' + url + '" muted controls preload="metadata"></video></div>' + vidHtml(o, file.name);
        $("vid-d").value = o.dur; $("vid-w").value = o.w; $("vid-h").value = o.h; $("vid-mb").value = Math.round(file.size / 1048576 * 100) / 100;
      } catch (ex) { $("vid-sum").innerHTML = '<p class="k-err">' + H(ex.message) + "</p>"; }
    };
    v.onerror = function () { $("vid-sum").innerHTML = '<p class="k-err">この動画はブラウザで読めませんでした（AVI・WMV などはブラウザが再生できません）。長さと寸法を数字で入れてください。</p>'; };
    v.src = url;
  });
  runVidNum();
})();
