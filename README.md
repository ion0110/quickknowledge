# QuickKnowledge - 社内FAQ検索アプリ

社内のよくある質問を管理・検索できるWebアプリケーションです。

## 機能

- **キーワード検索** - 質問、回答、タグから横断検索
- **カテゴリフィルター** - カテゴリで絞り込み
- **アコーディオンUI** - クリックで回答を展開
- **マークダウン対応** - 回答に書式を適用可能
- **管理機能** - FAQの追加・編集・削除

## セットアップ

### 1. Firebaseプロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 「プロジェクトを追加」をクリック
3. プロジェクト名を入力して作成

### 2. Firestoreの有効化

1. Firebase Console → 「Firestore Database」
2. 「データベースを作成」をクリック
3. **テストモード**を選択して開始

### 3. ウェブアプリの登録

1. Firebase Console → プロジェクト設定（歯車アイコン）
2. 「マイアプリ」セクションで「ウェブ」を選択
3. アプリ名を入力して登録
4. 表示される設定情報をコピー

### 4. 設定ファイルの編集

`js/firebase-config.js` を開き、以下の情報を入力：

```javascript
const firebaseConfig = {
  apiKey: "あなたのAPI_KEY",
  authDomain: "あなたのプロジェクトID.firebaseapp.com",
  projectId: "あなたのプロジェクトID",
  storageBucket: "あなたのプロジェクトID.appspot.com",
  messagingSenderId: "あなたのSENDER_ID",
  appId: "あなたのAPP_ID"
};
```

## 使い方

### ローカルで実行

1. フォルダをVS Codeで開く
2. Live Server拡張機能をインストール
3. `index.html` を右クリック → 「Open with Live Server」

または、直接 `index.html` をブラウザで開く

### サンプルデータの投入

1. 管理画面（`admin.html`）を開く
2. 「サンプルデータ投入」ボタンをクリック

## GitHub Pagesへのデプロイ

1. GitHubにリポジトリを作成
2. このフォルダの内容をプッシュ
3. Settings → Pages → Branch: main → Save
4. 数分後にサイトが公開されます

## ファイル構成

```
quickknowledge/
├── index.html        # 検索画面
├── admin.html        # 管理画面
├── css/
│   └── style.css     # スタイル
├── js/
│   ├── firebase-config.js  # Firebase設定
│   ├── data.js       # データ操作
│   ├── main.js       # 検索画面ロジック
│   └── admin.js      # 管理画面ロジック
└── README.md
```
