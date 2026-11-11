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

/* 単語帳を1つ読む → Promise（{id, title, words}。無い・開けない時は null）。単語・レベルチェック・テスト・単語ミックスが使う。
   本コースは words/courses/<id>.enc（AES-GCM。club-kit/build.py の write_words が作る）。鍵 ap_pk はログインの時に data.enc から（2026-11-04 監査 M1）。
   無料版はそのまま <id>.js（window.APW_COURSE） */
window.apWords = function (id) {
  var S = window.SITE || {}, base = "/words/" + ((S.words || {}).dir || "") + id;
  if (!/^[a-z0-9_]+$/.test(id || "")) return Promise.resolve(null);
  if (S.login) {
    var pk = null; try { pk = JSON.parse(localStorage.getItem("ap_pk") || "null"); } catch (e) {}
    if (!pk) return Promise.resolve(null);
    var u = function (s) { return Uint8Array.from(atob(s), function (c) { return c.charCodeAt(0); }); }, box;
    return fetch(base + ".enc").then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (b) { box = b; return crypto.subtle.importKey("raw", u(pk), "AES-GCM", false, ["decrypt"]); })
      .then(function (k) { return crypto.subtle.decrypt({ name: "AES-GCM", iv: u(box.i) }, k, u(box.c)); })
      .then(function (b) { var C = JSON.parse(new TextDecoder().decode(b)); return C.id === id ? C : null; })
      .catch(function () { return null; });
  }
  return new Promise(function (done) {
    var s = document.createElement("script"); s.src = base + ".js";
    s.onload = function () { var C = window.APW_COURSE; done(C && C.id === id ? C : null); };
    s.onerror = function () { done(null); };
    document.head.appendChild(s);
  });
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
      if (sid && nm) { o.sid = sid; o.name = nm; }   /* 本コースは会員番号＝生徒ID。名前も決まっている＝聞かない */
    } catch (e) {}
  }
  /* スマホを替えて生徒IDで入り直した時：前の記録を、このページの記録（ap_activity）に戻す。数は大きい方 */
  o.restore = function (days) {
    try {
      var a = JSON.parse(localStorage.getItem("ap_activity") || "{}"), map = { sp: "chunk", wd: "words", sh: "shadow" };
      Object.keys(days).forEach(function (t) {
        a[t] = a[t] || {};
        Object.keys(map).forEach(function (k) { if (days[t][k]) a[t][map[k]] = Math.max(a[t][map[k]] || 0, days[t][k]); });
      });
      localStorage.setItem("ap_activity", JSON.stringify(a));
    } catch (e) {}
  };
  (window.aps = window.aps || []).push(["start", o]);
  /* 計画（ゴール）も送る。変わっていなければ sync.js が何もしない */
  try { var g = JSON.parse(localStorage.getItem("ap_goals") || "null"); if (g) window.aps.push(["plan", g]); } catch (e) {}
  var s = document.createElement("script"); s.src = "/sync.js";   /* 2026-10-19：型に焼き込み（club-kit/template/pages/sync.js）。外から読まない */ s.defer = true; document.head.appendChild(s);
  var mark0 = window.apMark;
  window.apMark = function (k, n, what) { mark0(k, n); window.aps.push(["mark", k, n || 1, what]); };   /* what：どこまでやったか（本コースは管理サイトに出る） */
})();
