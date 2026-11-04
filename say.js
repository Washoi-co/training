/* 英語の読み上げ（全サイト共通）：OpenAI の声（kanri の say 関数。同じ文は保存して全員で使い回す）。
   うまくいかない時（上限・電波・古い端末）は端末の読み上げに戻る。2026-11-03
   使い方：<script src="/say.js"></script> を置いて、window.apSay("英文")。 */
(function () {
  "use strict";
  var FN = "https://apush-training.web.app/say";   // 配信網（Firebase Hosting）経由。中身は kanri の say 関数（2026-11-04）   // ?v= は kanri の say.js の VER と合わせる（変えると端末に残る古い音声を使わない）
  /* Safari（Mac・iPhone）は、タップの直後でない再生（答えの0.65秒後・録音の後・添削の返事の後）を止める。
     一度タップで鳴らした audio なら後から鳴らせるので、audio は1つだけ作って使い回し、最初のタップで鳴らせる状態にする（2026-11-04） */
  var el = new Audio(), seq = 0;
  function device(t) {
    try { if (!("speechSynthesis" in window)) return; speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(t); u.lang = "en-US"; u.rate = .9; speechSynthesis.speak(u); } catch (e) {}
  }
  function unlock() {   // 最初のタップで、無音（0.01秒）を鳴らしておく。iPhone で「タップ」になるのは touchstart・pointerdown ではなく click
    ["click", "keydown"].forEach(function (k) { document.removeEventListener(k, unlock, true); });
    if (!el.src) { el.src = "data:audio/wav;base64,UklGRnQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVAAAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA=="; var p = el.play(); if (p && p.catch) p.catch(function () {}); }
    try { speechSynthesis.speak(new SpeechSynthesisUtterance("")); } catch (e) {}   // iPhone の端末の読み上げも、最初はタップの中で1回鳴らす
  }
  ["click", "keydown"].forEach(function (k) { document.addEventListener(k, unlock, true); });
  window.apSayStop = function () { seq++; try { speechSynthesis.cancel(); } catch (e) {} el.pause(); };
  window.apSay = function (t) {
    t = String(t || "").replace(/\s+/g, " ").trim().slice(0, 300);
    if (!t) return;
    window.apSayStop();
    var n = seq, fell = false;
    var back = function (e) { if (fell || n !== seq || (e && e.name === "AbortError")) return; fell = true; device(t); };   // AbortError＝次の文に替わった
    el.onerror = back;
    el.src = FN + "?v=3&t=" + encodeURIComponent(t);
    var p = el.play(); if (p && p.catch) p.catch(back);
  };
})();
