/* その日に何をやったかを、全部のページで同じ所（ap_activity）に記録する。📅 計画のカレンダーとゴールが読む。
   {"2026-10-14": {"rec": 1, "words": 20, "wordsTest": 1, "wordsPm": 1, "shadow": 1, "exam": 1}}
   rec＝本コースの「今日の復習（録音）」で録音した章の数（2026-11-16 kimi）。chunk・adlib・mix は前の「話す」の分（古い記録に残る） */
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
  var S0 = window.SITE || {}, honka = !!S0.login;   /* ログインのあるサイト（本コース・団体の本コース版）：生徒IDは決まっている・/start/ へ・rec */
  /* 無料版（training）：2週間が過ぎて study・doboku から来た人だけ（?from=study で印 ap_free）。はじめての人は study の2週間フルアクセスへ（2026-11-19 kimi）。
     ponytail: 印は端末だけ＝URL に ?from=study を付ければ入れる。困ったら kanri に聞く形に */
  if (S0.free) {
    try { if (/[?&]from=study\b/.test(location.search)) localStorage.setItem("ap_free", "1"); if (!localStorage.getItem("ap_free")) { location.replace("https://study.apush.jp/"); return; } } catch (e) {}
  }
  var o = { org: S0.org || (honka ? "honka" : "free"), site: S0.domain || location.hostname, to: "A-PUSHの講師" };   /* org：団体の本コース版は団体の名簿（doboku）。2026-11-18 */
  if (honka) {
    try {
      var sid = JSON.parse(localStorage.getItem("ap_sid") || "null"), nm = JSON.parse(localStorage.getItem("ap_name") || "null");
      if (sid && nm) { o.sid = sid; o.name = nm; }   /* 本コースは会員番号＝生徒ID。名前も決まっている＝聞かない */
      /* 自分の計画（2026-11-17 kimi）：入っていて、まだ「なぜ」を答えていない人は、どのページを開いても /start/ へ（半強制。生徒に考えさせない） */
      var g0 = JSON.parse(localStorage.getItem("ap_goals") || "{}");
      var inok = !!JSON.parse(localStorage.getItem("ap_pass") || "null") || !!JSON.parse(localStorage.getItem("ap_tcode") || "null");   /* ログアウト中は飛ばさない（/start/ のログインの守りと往復しないように）。体験コード（training の full access）の人も初回は通す（2026-11-17 kimi） */
      /* 体験・団体の期限（2026-11-19 kimi「2週間切れるとほとんど全てにアクセス制限」）：過ぎていたらトップへ＝トップが kanri に聞き直し、終わりの画面を出す */
      var un = JSON.parse(localStorage.getItem("ap_until") || "null"), d0 = new Date(), p0 = function (x) { return (x < 10 ? "0" : "") + x; };
      if (un && JSON.parse(localStorage.getItem("ap_tcode") || "null") && un < d0.getFullYear() + "-" + p0(d0.getMonth() + 1) + "-" + p0(d0.getDate()) && location.pathname !== "/") { location.replace("/"); return; }
      if (sid && nm && inok && !g0.why && !/^\/(start\/|words\/check)/.test(location.pathname)) location.replace("/start/");
    } catch (e) {}
  }
  /* スマホを替えて生徒IDで入り直した時：前の記録を、このページの記録（ap_activity）に戻す。数は大きい方。
     本コースの sp は録音した章（rec。sync.js が rec を sp で送る） */
  o.restore = function (days) {
    try {
      var a = JSON.parse(localStorage.getItem("ap_activity") || "{}"), map = { sp: honka ? "rec" : "chunk", wd: "words", sh: "shadow" };
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
