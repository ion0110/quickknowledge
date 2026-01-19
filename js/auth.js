// 認証モジュール（Firebase Authentication）

// Firebase Auth参照
const auth = firebase.auth();
const googleProvider = new firebase.auth.GoogleAuthProvider();

// 現在のユーザー
let currentUser = null;

// スーパー管理者（管理者を追加できる管理者）
const SUPER_ADMIN_EMAIL = 'mono0110@gmail.com';

// 管理者リスト（Firestoreから読み込み）
let adminEmails = [];

// 管理者リストを読み込み
async function loadAdminEmails() {
    try {
        const snapshot = await adminsCollection.get();
        adminEmails = snapshot.docs.map(doc => doc.data().email.toLowerCase());
        // スーパー管理者は常に管理者
        if (!adminEmails.includes(SUPER_ADMIN_EMAIL.toLowerCase())) {
            adminEmails.push(SUPER_ADMIN_EMAIL.toLowerCase());
        }
    } catch (error) {
        console.error('管理者リスト読み込みエラー:', error);
        // エラー時はスーパー管理者のみ
        adminEmails = [SUPER_ADMIN_EMAIL.toLowerCase()];
    }
}

// 初期化時に管理者リストを読み込み
loadAdminEmails();

const AuthService = {
    // Googleでログイン
    async loginWithGoogle() {
        try {
            const result = await auth.signInWithPopup(googleProvider);
            currentUser = result.user;

            // 管理者リストを再読み込み
            await loadAdminEmails();

            // 管理者かどうかチェック
            if (this.isAdmin()) {
                showToast('管理者としてログインしました', 'success');
            } else {
                showToast('ログインしました（閲覧のみ）', 'info');
            }
            return result.user;
        } catch (error) {
            console.error('ログインエラー:', error);
            if (error.code === 'auth/popup-closed-by-user') {
                showToast('ログインがキャンセルされました', 'error');
            } else {
                showToast('ログインに失敗しました', 'error');
            }
            throw error;
        }
    },

    // ログアウト
    async logout() {
        try {
            await auth.signOut();
            currentUser = null;
            showToast('ログアウトしました', 'success');
        } catch (error) {
            console.error('ログアウトエラー:', error);
            showToast('ログアウトに失敗しました', 'error');
            throw error;
        }
    },

    // 現在のユーザーを取得
    getCurrentUser() {
        return currentUser;
    },

    // ログイン状態を監視
    onAuthStateChanged(callback) {
        return auth.onAuthStateChanged(async (user) => {
            currentUser = user;
            if (user) {
                await loadAdminEmails();
            }
            callback(user);
        });
    },

    // ログイン済みかどうか
    isLoggedIn() {
        return currentUser !== null;
    },

    // 管理者かどうか
    isAdmin() {
        if (!currentUser || !currentUser.email) return false;
        return adminEmails.includes(currentUser.email.toLowerCase());
    },

    // スーパー管理者かどうか
    isSuperAdmin() {
        if (!currentUser || !currentUser.email) return false;
        return currentUser.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
    },

    // 管理者リストを取得
    async getAdminList() {
        await loadAdminEmails();
        return [...adminEmails];
    },

    // 管理者を追加（スーパー管理者のみ）
    async addAdmin(email) {
        if (!this.isSuperAdmin()) {
            throw new Error('権限がありません');
        }

        const normalizedEmail = email.toLowerCase().trim();
        if (adminEmails.includes(normalizedEmail)) {
            throw new Error('すでに管理者です');
        }

        await adminsCollection.add({
            email: normalizedEmail,
            added_at: firebase.firestore.FieldValue.serverTimestamp(),
            added_by: currentUser.email
        });

        await loadAdminEmails();
        return true;
    },

    // 管理者を削除（スーパー管理者のみ）
    async removeAdmin(email) {
        if (!this.isSuperAdmin()) {
            throw new Error('権限がありません');
        }

        const normalizedEmail = email.toLowerCase().trim();
        if (normalizedEmail === SUPER_ADMIN_EMAIL.toLowerCase()) {
            throw new Error('スーパー管理者は削除できません');
        }

        const snapshot = await adminsCollection.where('email', '==', normalizedEmail).get();
        for (const doc of snapshot.docs) {
            await doc.ref.delete();
        }

        await loadAdminEmails();
        return true;
    }
};
