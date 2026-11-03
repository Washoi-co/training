/* 英語の読み上げ（全サイト共通）：OpenAI の声（kanri の say 関数。同じ文は保存して全員で使い回す）。
   うまくいかない時（上限・電波・古い端末）は端末の読み上げに戻る。2026-11-03
   使い方：<script src="/say.js"></script> を置いて、window.apSay("英文")。 */
(function () {
  "use strict";
  var FN = "https://apush-training.web.app/say";   // 配信網（Firebase Hosting）経由。中身は kanri の say 関数（2026-11-04）   // ?v= は kanri の say.js の VER と合わせる（変えると端末に残る古い音声を使わない）
  var cur = null;
  function device(t) {
    try { if (!("speechSynthesis" in window)) return; speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(t); u.lang = "en-US"; u.rate = .9; speechSynthesis.speak(u); } catch (e) {}
  }
  window.apSayStop = function () { try { speechSynthesis.cancel(); } catch (e) {} if (cur) { cur.pause(); cur = null; } };
  window.apSay = function (t) {
    t = String(t || "").replace(/\s+/g, " ").trim().slice(0, 300);
    if (!t) return;
    window.apSayStop();
    var a = cur = new Audio(FN + "?v=3&t=" + encodeURIComponent(t)), fell = false;
    var back = function () { if (fell || cur !== a) return; fell = true; cur = null; device(t); };
    a.onerror = back;
    var p = a.play(); if (p && p.catch) p.catch(back);
  };
})();
