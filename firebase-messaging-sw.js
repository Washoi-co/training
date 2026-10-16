/* 通知を裏で受け取る小さな仕組み（study.apush.jp・training.apush.jp の一番上に置く）。
   Firebaseの設定は kanri.apush.jp/config.js から読む＝設定を1か所で直せば全部に効く。 */
importScripts("https://www.gstatic.com/firebasejs/11.0.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.0.2/firebase-messaging-compat.js");
importScripts("https://kanri.apush.jp/config.js");
if (self.FB_CONFIG && String(self.FB_CONFIG.apiKey).indexOf("__") !== 0) {
  firebase.initializeApp(self.FB_CONFIG);
  firebase.messaging();
}
