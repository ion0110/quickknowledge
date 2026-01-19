// Firebase設定
// ここにあなたのFirebaseプロジェクトの設定を入力してください
// Firebaseコンソール → プロジェクト設定 → マイアプリ → Firebase SDK snippet → 構成

const firebaseConfig = {
  apiKey: "AIzaSyAGVVB9RtYdRPdXTejgG1DtvbB-ewclIo0",
  authDomain: "quickknowledge-8fde5.firebaseapp.com",
  projectId: "quickknowledge-8fde5",
  storageBucket: "quickknowledge-8fde5.firebasestorage.app",
  messagingSenderId: "499313198970",
  appId: "1:499313198970:web:b3f00de83cdaef7f06f8c3",
  measurementId: "G-SF6TG47YC1"
};

// Firebase初期化
firebase.initializeApp(firebaseConfig);

// Firestore参照
const db = firebase.firestore();

// FAQsコレクション参照
const faqsCollection = db.collection('faqs');

// 管理者コレクション参照
const adminsCollection = db.collection('admins');

console.log('Firebase初期化完了');
