// データ操作モジュール（Firestore CRUD）

const FaqService = {
    // 全件取得
    async getAll() {
        try {
            const snapshot = await faqsCollection.orderBy('updated_at', 'desc').get();
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('FAQ取得エラー:', error);
            throw error;
        }
    },

    // ID指定で取得
    async getById(id) {
        try {
            const doc = await faqsCollection.doc(id).get();
            if (!doc.exists) return null;
            return { id: doc.id, ...doc.data() };
        } catch (error) {
            console.error('FAQ取得エラー:', error);
            throw error;
        }
    },

    // キーワード検索（クライアントサイド）
    async search(keyword) {
        try {
            const allFaqs = await this.getAll();
            const lowerKeyword = keyword.toLowerCase();

            return allFaqs.filter(faq => {
                const questionMatch = faq.question.toLowerCase().includes(lowerKeyword);
                const answerMatch = faq.answer.toLowerCase().includes(lowerKeyword);
                const tagsMatch = faq.tags && faq.tags.some(tag =>
                    tag.toLowerCase().includes(lowerKeyword)
                );
                return questionMatch || answerMatch || tagsMatch;
            });
        } catch (error) {
            console.error('検索エラー:', error);
            throw error;
        }
    },

    // カテゴリでフィルター
    async getByCategory(category) {
        try {
            const snapshot = await faqsCollection
                .where('category', '==', category)
                .orderBy('updated_at', 'desc')
                .get();
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('カテゴリ取得エラー:', error);
            throw error;
        }
    },

    // カテゴリ一覧取得
    async getCategories() {
        try {
            const allFaqs = await this.getAll();
            const categories = [...new Set(allFaqs.map(faq => faq.category))];
            return categories.filter(c => c);
        } catch (error) {
            console.error('カテゴリ一覧取得エラー:', error);
            throw error;
        }
    },

    // 新規作成
    async create(data) {
        try {
            const docRef = await faqsCollection.add({
                question: data.question,
                answer: data.answer,
                category: data.category || '',
                tags: data.tags || [],
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });
            return docRef.id;
        } catch (error) {
            console.error('FAQ作成エラー:', error);
            throw error;
        }
    },

    // 更新
    async update(id, data) {
        try {
            await faqsCollection.doc(id).update({
                question: data.question,
                answer: data.answer,
                category: data.category || '',
                tags: data.tags || [],
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error('FAQ更新エラー:', error);
            throw error;
        }
    },

    // 削除
    async delete(id) {
        try {
            await faqsCollection.doc(id).delete();
            return true;
        } catch (error) {
            console.error('FAQ削除エラー:', error);
            throw error;
        }
    },

    // サンプルデータ投入
    async initSampleData() {
        const sampleData = [
            {
                question: '領収書の提出期限は？',
                answer: '領収書は**経費発生日から1ヶ月以内**に提出してください。\n\n### 提出方法\n1. 経費精算システムにログイン\n2. 「新規申請」をクリック\n3. 領収書画像をアップロード\n\n※月末締めの場合は翌月5日までに提出をお願いします。\n\n詳細は[経費精算マニュアル](https://example.com/manual)をご確認ください。',
                category: '経理',
                tags: ['精算', '月末', '領収書']
            },
            {
                question: '社内WiFiのパスワードは？',
                answer: '### 社内WiFi接続情報\n\n- **SSID**: `Company-WiFi`\n- **パスワード**: IT部門にお問い合わせください\n\n### 注意事項\n- パスワードは毎月1日に変更されます\n- ゲスト用WiFiは `Guest-WiFi` をご利用ください\n\n接続できない場合はIT部門（内線: 1234）までご連絡ください。',
                category: 'IT',
                tags: ['WiFi', 'ネットワーク', 'パスワード']
            },
            {
                question: '有給休暇の申請方法は？',
                answer: '### 申請手順\n\n1. 勤怠システムにログイン\n2. 「休暇申請」メニューを選択\n3. 取得希望日を選択\n4. 理由を入力（任意）\n5. 上長に申請\n\n### 注意事項\n- **3日前まで**に申請してください\n- 緊急の場合は直接上長に連絡してください\n- 残り日数は勤怠システムで確認できます',
                category: '総務',
                tags: ['休暇', '申請', '有給']
            },
            {
                question: '会議室の予約方法は？',
                answer: '### 予約方法\n\nOutlookカレンダーから予約できます。\n\n1. 新しい予定を作成\n2. 「会議室を追加」をクリック\n3. 利用可能な会議室を選択\n4. 予定を保存\n\n### 会議室一覧\n| 名前 | 収容人数 | 設備 |\n|------|----------|------|\n| MTG-A | 6名 | プロジェクター |\n| MTG-B | 10名 | ホワイトボード |\n| MTG-C | 20名 | ビデオ会議システム |',
                category: '総務',
                tags: ['会議室', '予約', 'Outlook']
            },
            {
                question: 'VPN接続の設定方法は？',
                answer: '### Windows の場合\n\n1. 設定 → ネットワークとインターネット → VPN\n2. 「VPN接続を追加する」をクリック\n3. 以下の情報を入力:\n   - サーバー名: `vpn.company.com`\n   - VPNの種類: `IKEv2`\n4. 社員IDとパスワードでログイン\n\n### Mac の場合\n\nシステム環境設定 → ネットワーク から設定できます。\n\n詳細な手順は[VPN設定ガイド](https://example.com/vpn-guide)をご覧ください。',
                category: 'IT',
                tags: ['VPN', 'リモートワーク', '接続']
            }
        ];

        for (const data of sampleData) {
            await this.create(data);
        }
        console.log('サンプルデータを投入しました');
    }
};

// ユーティリティ関数
function formatDate(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// トースト通知
function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}
