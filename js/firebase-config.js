// Firebase設定
// ここにあなたのFirebaseプロジェクトの設定を入力してください
// Firebaseコンソール → プロジェクト設定 → マイアプリ → Firebase SDK snippet → 構成

// ⚠️ 重要: このファイルに含まれるAPIキーは公開されます。
// セキュリティのため、Google Cloud ConsoleでこのAPIキーに「HTTPリファラー制限」を設定し、
// 許可されたドメイン（例: your-username.github.io）からのみ使用できるようにしてください。
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

// 検索ログコレクション参照
const searchLogsCollection = db.collection('search_logs');

console.log('Firebase初期化完了');
