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
