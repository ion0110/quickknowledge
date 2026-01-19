// 認証モジュール（Firebase Authentication）

// Firebase Auth参照
const auth = firebase.auth();
const googleProvider = new firebase.auth.GoogleAuthProvider();

// 現在のユーザー
let currentUser = null;

const AuthService = {
    // Googleでログイン
    async loginWithGoogle() {
        try {
            const result = await auth.signInWithPopup(googleProvider);
            currentUser = result.user;
            showToast('ログインしました', 'success');
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
        return auth.onAuthStateChanged((user) => {
            currentUser = user;
            callback(user);
        });
    },

    // ログイン済みかどうか
    isLoggedIn() {
        return currentUser !== null;
    }
};
