/* 通知を裏で受け取る小さな仕組み（club-kit が作る） */
importScripts("https://www.gstatic.com/firebasejs/11.0.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.0.2/firebase-messaging-compat.js");
firebase.initializeApp({"apiKey": "AIzaSyBunl7P06I7DEibz4xIhQmymPGMD58cKb8", "authDomain": "apush-training.firebaseapp.com", "projectId": "apush-training", "storageBucket": "apush-training.firebasestorage.app", "messagingSenderId": "950173330906", "appId": "1:950173330906:web:6311e8d2f09effd53a24e3"});
firebase.messaging();
