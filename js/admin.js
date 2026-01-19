// 管理画面のロジック

document.addEventListener('DOMContentLoaded', () => {
    const faqTableBody = document.getElementById('faqTableBody');
    const addNewBtn = document.getElementById('addNewBtn');
    const modal = document.getElementById('faqModal');
    const modalTitle = document.getElementById('modalTitle');
    const faqForm = document.getElementById('faqForm');
    const modalClose = document.querySelector('.modal-close');
    const cancelBtn = document.getElementById('cancelBtn');
    const tagsInput = document.getElementById('tagsInput');
    const tagInputField = document.getElementById('tagInputField');
    const initSampleBtn = document.getElementById('initSampleBtn');

    // 認証関連の要素
    const loginBtn = document.getElementById('loginBtn');
    const loginBtn2 = document.getElementById('loginBtn2');
    const logoutBtn = document.getElementById('logoutBtn');
    const userSection = document.getElementById('userSection');
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    const loginRequiredNotice = document.getElementById('loginRequiredNotice');
    const adminContent = document.getElementById('adminContent');

    let editingId = null;
    let currentTags = [];

    // 初期化
    init();

    async function init() {
        setupAuthListeners();
        setupEventListeners();
    }

    // 認証状態の監視
    function setupAuthListeners() {
        AuthService.onAuthStateChanged((user) => {
            if (user) {
                // ログイン済み
                showLoggedInUI(user);
                loadFaqs();
            } else {
                // 未ログイン
                showLoggedOutUI();
            }
        });

        // ログインボタン
        loginBtn.addEventListener('click', () => AuthService.loginWithGoogle());
        loginBtn2.addEventListener('click', () => AuthService.loginWithGoogle());

        // ログアウトボタン
        logoutBtn.addEventListener('click', () => AuthService.logout());
    }

    // ログイン済みUI表示
    function showLoggedInUI(user) {
        loginBtn.style.display = 'none';
        userSection.style.display = 'flex';
        userAvatar.src = user.photoURL || '';
        userName.textContent = user.displayName || user.email;

        loginRequiredNotice.style.display = 'none';
        adminContent.style.display = 'block';
    }

    // 未ログインUI表示
    function showLoggedOutUI() {
        loginBtn.style.display = 'block';
        userSection.style.display = 'none';

        loginRequiredNotice.style.display = 'block';
        adminContent.style.display = 'none';
    }

    // FAQ一覧読み込み
    async function loadFaqs() {
        faqTableBody.innerHTML = '<tr><td colspan="4"><div class="loading"><div class="spinner"></div></div></td></tr>';

        try {
            const faqs = await FaqService.getAll();
            renderFaqTable(faqs);
        } catch (error) {
            console.error('FAQ読み込みエラー:', error);
            faqTableBody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; padding: 2rem;">
            <p>⚠️ データの読み込みに失敗しました</p>
            <p style="color: var(--text-secondary);">Firebase設定を確認してください</p>
          </td>
        </tr>
      `;
        }
    }

    // テーブル表示
    function renderFaqTable(faqs) {
        if (faqs.length === 0) {
            faqTableBody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; padding: 2rem;">
            <p>FAQがまだ登録されていません</p>
            <p style="color: var(--text-secondary);">「新規追加」ボタンから登録してください</p>
          </td>
        </tr>
      `;
            return;
        }

        faqTableBody.innerHTML = faqs.map(faq => `
      <tr>
        <td>${escapeHtml(faq.question)}</td>
        <td>${escapeHtml(faq.category || '-')}</td>
        <td>${formatDate(faq.updated_at)}</td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-secondary btn-sm edit-btn" data-id="${faq.id}">編集</button>
            <button class="btn btn-danger btn-sm delete-btn" data-id="${faq.id}">削除</button>
          </div>
        </td>
      </tr>
    `).join('');
    }

    // イベントリスナー設定
    function setupEventListeners() {
        // 新規追加ボタン
        addNewBtn.addEventListener('click', () => openModal());

        // モーダルを閉じる
        modalClose.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // フォーム送信
        faqForm.addEventListener('submit', handleSubmit);

        // テーブル内のボタン（編集・削除）
        faqTableBody.addEventListener('click', async (e) => {
            const editBtn = e.target.closest('.edit-btn');
            const deleteBtn = e.target.closest('.delete-btn');

            if (editBtn) {
                const id = editBtn.dataset.id;
                await openEditModal(id);
            }

            if (deleteBtn) {
                const id = deleteBtn.dataset.id;
                if (confirm('このFAQを削除してもよろしいですか？')) {
                    await deleteFaq(id);
                }
            }
        });

        // タグ入力
        tagInputField.addEventListener('keydown', handleTagInput);

        // タグ削除
        tagsInput.addEventListener('click', (e) => {
            if (e.target.classList.contains('tag-remove')) {
                const tag = e.target.parentElement;
                const tagText = tag.dataset.tag;
                currentTags = currentTags.filter(t => t !== tagText);
                tag.remove();
            }
        });

        // サンプルデータ投入
        if (initSampleBtn) {
            initSampleBtn.addEventListener('click', async () => {
                if (confirm('サンプルデータを投入しますか？')) {
                    try {
                        await FaqService.initSampleData();
                        showToast('サンプルデータを投入しました', 'success');
                        await loadFaqs();
                    } catch (error) {
                        showToast('エラーが発生しました', 'error');
                    }
                }
            });
        }
    }

    // モーダルを開く（新規）
    function openModal() {
        editingId = null;
        modalTitle.textContent = '新規FAQ追加';
        faqForm.reset();
        currentTags = [];
        renderTags();
        modal.classList.add('active');
    }

    // モーダルを開く（編集）
    async function openEditModal(id) {
        try {
            const faq = await FaqService.getById(id);
            if (!faq) {
                showToast('FAQが見つかりません', 'error');
                return;
            }

            editingId = id;
            modalTitle.textContent = 'FAQ編集';
            document.getElementById('question').value = faq.question;
            document.getElementById('answer').value = faq.answer;
            document.getElementById('category').value = faq.category || '';
            currentTags = faq.tags || [];
            renderTags();
            modal.classList.add('active');
        } catch (error) {
            showToast('エラーが発生しました', 'error');
        }
    }

    // モーダルを閉じる
    function closeModal() {
        modal.classList.remove('active');
        editingId = null;
        faqForm.reset();
        currentTags = [];
        renderTags();
    }

    // フォーム送信
    async function handleSubmit(e) {
        e.preventDefault();

        const data = {
            question: document.getElementById('question').value.trim(),
            answer: document.getElementById('answer').value.trim(),
            category: document.getElementById('category').value,
            tags: currentTags
        };

        if (!data.question || !data.answer) {
            showToast('質問と回答は必須です', 'error');
            return;
        }

        try {
            if (editingId) {
                await FaqService.update(editingId, data);
                showToast('FAQを更新しました', 'success');
            } else {
                await FaqService.create(data);
                showToast('FAQを追加しました', 'success');
            }

            closeModal();
            await loadFaqs();
        } catch (error) {
            showToast('エラーが発生しました', 'error');
        }
    }

    // 削除
    async function deleteFaq(id) {
        try {
            await FaqService.delete(id);
            showToast('FAQを削除しました', 'success');
            await loadFaqs();
        } catch (error) {
            showToast('エラーが発生しました', 'error');
        }
    }

    // タグ入力処理
    function handleTagInput(e) {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const value = tagInputField.value.trim().replace(',', '');
            if (value && !currentTags.includes(value)) {
                currentTags.push(value);
                renderTags();
            }
            tagInputField.value = '';
        }
    }

    // タグ表示
    function renderTags() {
        const existingTags = tagsInput.querySelectorAll('.tag');
        existingTags.forEach(tag => tag.remove());

        currentTags.forEach(tag => {
            const tagEl = document.createElement('span');
            tagEl.className = 'tag';
            tagEl.dataset.tag = tag;
            tagEl.innerHTML = `${escapeHtml(tag)}<span class="tag-remove">×</span>`;
            tagsInput.insertBefore(tagEl, tagInputField);
        });
    }

    // HTMLエスケープ
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});
