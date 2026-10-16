/* その日に何をやったかを、全部のページで同じ所（ap_activity）に記録する。📅 計画のカレンダーとゴールが読む。
   {"2026-10-14": {"chunk": 1, "words": 20, "wordsTest": 1, "wordsPm": 1, "shadow": 1, "mix": 4}} */
window.apMark = function (k, n) {
  try {
    var d = new Date(), p = function (x) { return (x < 10 ? "0" : "") + x; };
    var t = d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
    var a = JSON.parse(localStorage.getItem("ap_activity") || "{}");
    a[t] = a[t] || {}; a[t][k] = (a[t][k] || 0) + (n || 1);
    localStorage.setItem("ap_activity", JSON.stringify(a));
  } catch (e) {}
};

/* ---- A-PUSH 共通の記録（kanri.apush.jp）につなぐ。2026-10-16 ----
   本コース（study）・無料版（training）・団体のサイトで、同じデータの形・同じ流れ（名前＋同意 → 練習した日を送る → お知らせ・既読）。
   生徒が同意した時だけ送る。kanri の config.js が未設定の間は何もしない。 */
(function () {
  var honka = /^study\./.test(location.hostname);
  var o = { org: honka ? "honka" : "free", site: honka ? "study.apush.jp" : "training.apush.jp", to: "A-PUSHの講師" };
  if (honka) {
    try {
      var sid = JSON.parse(localStorage.getItem("ap_sid") || "null"), nm = JSON.parse(localStorage.getItem("ap_name") || "null");
      if (sid) o.name = sid + (nm ? " " + nm : "");   /* 本コースは会員番号が名前＝聞かない */
    } catch (e) {}
  }
  (window.aps = window.aps || []).push(["start", o]);
  var s = document.createElement("script"); s.src = "https://kanri.apush.jp/sync.js"; s.defer = true; document.head.appendChild(s);
  var mark0 = window.apMark;
  window.apMark = function (k, n) { mark0(k, n); window.aps.push(["mark", k, n || 1]); };
})();
