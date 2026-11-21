
(function (root) {
  var MONTH = 30.4; // 付録A 式 24 の 1 か月の日数
  function ceil7(d) { return Math.ceil(d / 7) * 7; }
  function thCalc(x) {
    var m = +x.monthly, c = +x.cycle, t = +x.target, delta = +x.delta;
    var d90 = x.d90 === '' || x.d90 == null || isNaN(+x.d90) ? null : +x.d90;
    var lam = m / MONTH;                               // 平常の 1 日の件数
    var W = ceil7(Math.max(2 * c, 14));                // 閾02
    var L = d90 === null ? 7 : Math.max(5, d90);       // 閾03（不明なら 7 日）
    var d30 = lam > 0 ? 30 / lam : Infinity;           // 確定 30 件がたまる日数
    var P = isFinite(d30) ? ceil7(Math.max(W, d30)) : Infinity; // 式 23
    var nP = lam * (isFinite(P) ? P : 0);              // 1 判定期間の件数
    var need = Math.round(15.698 / (delta * delta));   // 閾05・式 6（1 期間の件数。15.698 ＝ 2 ×（1.960 ＋ 0.842）²、付録A §4 の検算の値）
    var dNeed = lam > 0 ? Math.max(Math.ceil(need / lam), W) : Infinity; // 式 24（W が下限）
    return {
      lam: lam, W: W, L: L, d30: d30, P: P, total: P + L, nP: nP,
      swing: nP > 0 ? 1.96 / Math.sqrt(nP) : Infinity,       // 式 7
      dmin: nP > 0 ? 3.96 / Math.sqrt(nP) : Infinity,        // 式 6 の逆
      timeout: !(P <= 56),                                    // 閾36（8 週間）
      need: need, dNeed: dNeed, dNeedTotal: 2 * dNeed + L, testOk: dNeed <= 56, // 閾17
      zeroStart: 2 * t, zeroMiss: 3 * t,                      // 閾06
      budgetMin: 2 * t,                                       // 閾11（検索）
      zeroDays: lam > 0 ? Math.ceil(3 / lam) : Infinity       // 閾28
    };
  }
  root.thCalc = thCalc;
  if (typeof document === 'undefined') return;
  function $(id) { return document.getElementById(id); }
  function yen(v) { return isFinite(v) ? Math.round(v).toLocaleString('ja-JP') + ' 円' : '—'; }
  function day(v) { return isFinite(v) ? Math.round(v).toLocaleString('ja-JP') + ' 日' : '—'; }
  function wk(v) { return isFinite(v) ? '（' + (v / 7).toFixed(v % 7 ? 1 : 0) + ' 週）' : ''; }
  function pct(v) { return isFinite(v) ? '±' + Math.round(v * 100) + '%' : '—'; }
  function run() {
    var f = $('tc'); if (!f) return;
    var x = { monthly: $('tc-m').value, cycle: $('tc-c').value, d90: $('tc-l').value, target: $('tc-t').value, delta: $('tc-d').value };
    if (!(+x.monthly > 0) || !(+x.cycle >= 0)) { $('tc-out').innerHTML = '<p class="sb-note">月の成果数（1 以上）と、成果までの日数を入れてください。</p>'; return; }
    var r = thCalc(x), dl = Math.round(+x.delta * 100);
    var h = '';
    h += '<div class="tc-card"><p class="tc-k">1 回の判定に待つ日数</p><p class="tc-v">' + day(r.total) + '</p>' +
      '<p class="tc-s">変えてから <b>' + day(r.P) + wk(r.P) + '</b> 分の成果を集め、さらに <b>' + day(r.L) + '</b> 待って数が出そろってから判定します。' +
      'この期間の成果はおよそ ' + Math.round(r.nP) + ' 件で、何も変えなくても ' + pct(r.swing) + ' は揺れます。</p>' +
      (r.timeout ? '<p class="tc-w">8 週間を超えます。成果の数での判定はやめ、手前の成果（問い合わせの開始など）か、クリック率などの指標で見ます（閾36）。</p>' : '') + '</div>';
    h += '<div class="tc-card"><p class="tc-k">' + dl + '% の差を言うのに要る日数</p><p class="tc-v">' + day(r.dNeed) + '<small> × 前後 2 回</small></p>' +
      '<p class="tc-s">1 回の期間に約 ' + Math.round(r.need).toLocaleString('ja-JP') + ' 件が要ります。前と後の 2 回分を集め、出そろうのを待つと、合わせて約 ' + day(r.dNeedTotal) + '。' +
      '1 回の判定の期間で言えるのは、およそ ' + (isFinite(r.dmin) ? Math.round(r.dmin * 100) + '%' : '—') + ' 以上の差だけです。</p>' +
      (r.testOk ? '' : '<p class="tc-w">1 回に 8 週間を超えます。この差を A/B テストで決めるのはやめ、差の大きい案にするか、手前の指標で見ます（閾17）。</p>') + '</div>';
    if (+x.target > 0) {
      h += '<div class="tc-card"><p class="tc-k">成果が 0 件のまま使った費用</p><p class="tc-v">' + yen(r.zeroStart) + '<small> で見直し</small></p>' +
        '<p class="tc-s"><b>' + yen(r.zeroMiss) + '</b> まで 0 件なら「目標に届かない」と言えます（目標どおりでも 0 件になる確率が 5%）。計測が確かでない間は使いません（閾06）。</p></div>';
      h += '<div class="tc-card"><p class="tc-k">検索の 1 日の予算の下限</p><p class="tc-v">' + yen(r.budgetMin) + '</p>' +
        '<p class="tc-s">目標の獲得単価の 2 倍です（閾11）。デマンド ジェネレーションは別の値です。</p></div>';
    }
    h += '<div class="tc-card"><p class="tc-k">0 件が続いたら計測を疑う日数</p><p class="tc-v">' + day(r.zeroDays) + '</p>' +
      '<p class="tc-s">ふだん 1 日 ' + r.lam.toFixed(1) + ' 件なら、この日数続けて 0 件になるのは 5% しか起きません。タグや計測が止まっていないかを先に見ます（閾28）。</p></div>';
    $('tc-out').innerHTML = h;
  }
  document.addEventListener('DOMContentLoaded', function () {
    var f = $('tc'); if (!f) return;
    f.addEventListener('input', run); f.addEventListener('change', run); run();
  });
})(typeof window !== 'undefined' ? window : globalThis);
