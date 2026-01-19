// Firebase設定
// ここにあなたのFirebaseプロジェクトの設定を入力してください
// Firebaseコンソール → プロジェクト設定 → マイアプリ → Firebase SDK snippet → 構成

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Firebase初期化
firebase.initializeApp(firebaseConfig);

// Firestore参照
const db = firebase.firestore();

// FAQsコレクション参照
const faqsCollection = db.collection('faqs');

console.log('Firebase初期化完了');
