/**
 * Gomoku v3.0.9 Firebase configuration.
 * Uses the official Firebase browser SDK loaded from gstatic in index.html.
 */
(function configureGomokuFirebase(global) {
  "use strict";

  const firebaseConfig = {
    apiKey: "AIzaSyCxr91S6LJ3GXjKIXt3PbLpfCw_IvUkcsQ",
    authDomain: "binbinlab-gomoku.firebaseapp.com",
    databaseURL: "https://binbinlab-gomoku-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "binbinlab-gomoku",
    storageBucket: "binbinlab-gomoku.firebasestorage.app",
    messagingSenderId: "438281544648",
    appId: "1:438281544648:web:ceaaac10ecc270f07b16fd",
  };

  function getFirebaseApp() {
    if (!global.firebase) {
      return null;
    }

    if (global.firebase.apps && global.firebase.apps.length > 0) {
      return global.firebase.apps[0];
    }

    return global.firebase.initializeApp(firebaseConfig);
  }

  function getDatabase() {
    const app = getFirebaseApp();

    if (!app || !global.firebase.database) {
      return null;
    }

    return global.firebase.database(app);
  }

  global.GomokuFirebase = Object.freeze({
    config: firebaseConfig,
    getApp: getFirebaseApp,
    getDatabase,
    serverTimestamp() {
      return global.firebase.database.ServerValue.TIMESTAMP;
    },
  });
}(window));
