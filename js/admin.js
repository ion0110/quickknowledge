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

    // 一括登録関連
    const importBtn = document.getElementById('importBtn');
    const importModal = document.getElementById('importModal');
    const importModalClose = document.getElementById('importModalClose');
    const importCancelBtn = document.getElementById('importCancelBtn');
    const importExecBtn = document.getElementById('importExecBtn');
    const csvFile = document.getElementById('csvFile');
    const importPreview = document.getElementById('importPreview');
    const importStats = document.getElementById('importStats');
    const importError = document.getElementById('importError');
    const importPreviewBody = document.getElementById('importPreviewBody');
    let importedData = [];

    // CSVエクスポート関連
    const exportBtn = document.getElementById('exportBtn');

    // 一括削除関連
    const deleteAllBtn = document.getElementById('deleteAllBtn');

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

        // 管理者チェック
        if (AuthService.isAdmin()) {
            // 管理者：全機能有効
            enableAdminFeatures();
        } else {
            // 非管理者：閲覧のみ
            disableAdminFeatures();
        }
    }

    // 管理者機能を有効化
    function enableAdminFeatures() {
        addNewBtn.style.display = 'inline-flex';
        addNewBtn.style.display = 'inline-flex';
        if (initSampleBtn) initSampleBtn.style.display = 'inline-flex';
        if (importBtn) importBtn.style.display = 'inline-flex';
        if (exportBtn) exportBtn.style.display = 'inline-flex';

        // インポート機能のセットアップ
        setupImportListeners();

        // エクスポート機能のセットアップ
        setupExportListener();

        // 一括削除機能のセットアップ
        setupDeleteAllListener();

        // 非管理者メッセージを非表示
        const notAdminNotice = document.getElementById('notAdminNotice');
        if (notAdminNotice) notAdminNotice.style.display = 'none';

        // スーパー管理者の場合、管理者管理セクションを表示
        const adminManagementSection = document.getElementById('adminManagementSection');
        if (adminManagementSection && AuthService.isSuperAdmin()) {
            adminManagementSection.style.display = 'block';
            setupAdminManagement();
            loadAdminList();
        }
    }

    // 管理者機能を無効化（閲覧のみ）
    function disableAdminFeatures() {
        addNewBtn.style.display = 'none';
        addNewBtn.style.display = 'none';
        if (initSampleBtn) initSampleBtn.style.display = 'none';
        if (importBtn) importBtn.style.display = 'none';
        if (exportBtn) exportBtn.style.display = 'none';
        if (deleteAllBtn) deleteAllBtn.style.display = 'none';

        // 管理者管理セクションを非表示
        const adminManagementSection = document.getElementById('adminManagementSection');
        if (adminManagementSection) adminManagementSection.style.display = 'none';

        // 非管理者メッセージを表示
        let notAdminNotice = document.getElementById('notAdminNotice');
        if (!notAdminNotice) {
            notAdminNotice = document.createElement('div');
            notAdminNotice.id = 'notAdminNotice';
            notAdminNotice.className = 'notice notice-warning';
            notAdminNotice.innerHTML = `
        <p>⚠️ <strong>閲覧専用モード</strong></p>
        <p>このアカウントには編集権限がありません。FAQの追加・編集・削除はできません。</p>
      `;
            adminContent.insertBefore(notAdminNotice, adminContent.firstChild);
        }
        notAdminNotice.style.display = 'block';
    }

    // 管理者管理のセットアップ
    function setupAdminManagement() {
        const addAdminBtn = document.getElementById('addAdminBtn');
        const newAdminEmail = document.getElementById('newAdminEmail');

        if (addAdminBtn && !addAdminBtn.hasListener) {
            addAdminBtn.hasListener = true;
            addAdminBtn.addEventListener('click', async () => {
                const email = newAdminEmail.value.trim();
                if (!email) {
                    showToast('メールアドレスを入力してください', 'error');
                    return;
                }

                try {
                    await AuthService.addAdmin(email);
                    showToast(`${email} を管理者に追加しました`, 'success');
                    newAdminEmail.value = '';
                    loadAdminList();
                } catch (error) {
                    showToast(error.message || 'エラーが発生しました', 'error');
                }
            });
        }
    }

    // 管理者リストを表示
    async function loadAdminList() {
        const adminListEl = document.getElementById('adminList');
        if (!adminListEl) return;

        try {
            const admins = await AuthService.getAdminList();
            adminListEl.innerHTML = admins.map(email => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; background: var(--background); border-radius: var(--radius-sm); margin-bottom: 0.5rem;">
          <span>${email}</span>
          ${email.toLowerCase() === 'mono0110@gmail.com'
                    ? '<span style="color: var(--warning); font-size: 0.85rem;">👑 スーパー管理者</span>'
                    : `<button class="btn btn-danger btn-sm remove-admin-btn" data-email="${email}">削除</button>`
                }
        </div>
      `).join('');

            // 削除ボタンのイベント
            adminListEl.querySelectorAll('.remove-admin-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const email = btn.dataset.email;
                    if (confirm(`${email} を管理者から削除しますか？`)) {
                        try {
                            await AuthService.removeAdmin(email);
                            showToast(`${email} を管理者から削除しました`, 'info');
                            loadAdminList();
                        } catch (error) {
                            showToast(error.message || 'エラーが発生しました', 'error');
                        }
                    }
                });
            });
        } catch (error) {
            console.error('管理者リスト取得エラー:', error);
        }
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

        const isAdmin = AuthService.isAdmin();

        faqTableBody.innerHTML = faqs.map(faq => `
      <tr>
        <td>${escapeHtml(faq.question)}</td>
        <td>${escapeHtml(faq.category || '-')}</td>
        <td>${formatDate(faq.updated_at)}</td>
        <td>
          ${isAdmin ? `
          <div class="action-buttons">
            <button class="btn btn-secondary btn-sm edit-btn" data-id="${faq.id}">編集</button>
            <button class="btn btn-danger btn-sm delete-btn" data-id="${faq.id}">削除</button>
          </div>
          ` : '<span style="color: var(--text-secondary);">-</span>'}
        </td>
      </tr>
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

    // ========== 一括登録機能 ==========
    function setupImportListeners() {
        if (!importBtn) return;

        // モーダル表示
        importBtn.addEventListener('click', () => {
            importModal.classList.add('active');
            csvFile.value = '';
            importPreview.style.display = 'none';
            importExecBtn.disabled = true;
            importedData = [];
        });

        // モーダル閉じる
        const closeImportModal = () => {
            importModal.classList.remove('active');
        };
        importModalClose.addEventListener('click', closeImportModal);
        importCancelBtn.addEventListener('click', closeImportModal);

        // CSV読み込み
        csvFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                parseCSV(event.target.result);
            };
            reader.readAsText(file);
        });

        // 登録実行
        importExecBtn.addEventListener('click', async () => {
            if (importedData.length === 0) return;

            if (!confirm(`${importedData.length}件のデータを登録します。よろしいですか？`)) return;

            importExecBtn.disabled = true;
            importExecBtn.textContent = '登録中...';

            try {
                let successCount = 0;
                let errorCount = 0;

                for (const item of importedData) {
                    try {
                        await FaqService.create(item);
                        successCount++;
                    } catch (err) {
                        console.error('登録エラー:', err, item);
                        errorCount++;
                    }
                }

                alert(`登録完了: 成功 ${successCount}件 / 失敗 ${errorCount}件`);
                closeImportModal();
                loadFaqs(); // 一覧更新
            } catch (error) {
                console.error('一括登録エラー:', error);
                alert('エラーが発生しました: ' + error.message);
            } finally {
                importExecBtn.disabled = false;
                importExecBtn.textContent = '登録実行';
            }
        });
    }

    function parseCSV(csvText) {
        importError.style.display = 'none';
        importPreviewBody.innerHTML = '';
        importedData = [];

        try {
            // 改行コード正規化と分割
            const lines = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(line => line.trim() !== '');
            if (lines.length < 2) {
                throw new Error('データがありません。ヘッダー行とデータ行が必要です。');
            }

            // ヘッダー解析（小文字に正規化）
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
            console.log('CSVヘッダー:', headers);

            // データ解析（CSVパース）
            for (let i = 1; i < lines.length; i++) {
                const row = parseCSVLine(lines[i]);

                // ヘッダー数と一致しなくても、最低限 question, answer があればOKとする柔軟性を持たせる
                // ここでは簡易的にオブジェクト化
                const item = { tags: [] };

                // ヘッダーに基づいてマッピング
                headers.forEach((header, index) => {
                    let value = row[index] || '';
                    if (header === 'tags') {
                        if (value) {
                            item.tags = value.split(/[,\s]+/).map(t => t.trim()).filter(t => t !== '');
                        }
                    } else if (header) {
                        item[header] = value;
                    }
                });

                if (!item.question || !item.answer) {
                    console.warn(`必須項目不足の行をスキップ: 行 ${i + 1}`);
                    continue;
                }

                importedData.push(item);
            }

            if (importedData.length === 0) {
                throw new Error('有効なデータが見つかりませんでした。ヘッダー（question, answer）を確認してください。');
            }

            // プレビュー表示
            importStats.textContent = `読み込み成功: ${importedData.length}件`;
            importPreview.style.display = 'block';

            // 最大5件表示
            importedData.slice(0, 5).forEach(item => {
                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid var(--border-color)';
                tr.innerHTML = `
                    <td style="padding:4px; font-size:0.8rem;">${escapeHtml(item.question)}</td>
                    <td style="padding:4px; font-size:0.8rem;">${escapeHtml(item.answer.substring(0, 20))}...</td>
                    <td style="padding:4px; font-size:0.8rem;">${escapeHtml(item.category || '-')}</td>
                `;
                importPreviewBody.appendChild(tr);
            });

            importExecBtn.disabled = false;

        } catch (err) {
            importError.textContent = err.message;
            importError.style.display = 'block';
            importPreview.style.display = 'block';
            importExecBtn.disabled = true;
        }
    }

    // 引用符対応のCSV行パース
    function parseCSVLine(text) {
        const result = [];
        let start = 0;
        let inQuotes = false;

        for (let i = 0; i < text.length; i++) {
            if (text[i] === '"') {
                inQuotes = !inQuotes;
            } else if (text[i] === ',' && !inQuotes) {
                let field = text.substring(start, i).trim();
                if (field.startsWith('"') && field.endsWith('"')) {
                    field = field.substring(1, field.length - 1).replace(/""/g, '"');
                }
                result.push(field);
                start = i + 1;
            }
        }

        let field = text.substring(start).trim();
        if (field.startsWith('"') && field.endsWith('"')) {
            field = field.substring(1, field.length - 1).replace(/""/g, '"');
        }
        result.push(field);

        return result;
    }

    // ========== CSVエクスポート機能 ==========
    function setupExportListener() {
        if (!exportBtn) return;

        exportBtn.addEventListener('click', async () => {
            exportBtn.disabled = true;
            exportBtn.textContent = 'エクスポート中...';

            try {
                const faqs = await FaqService.getAll();

                if (faqs.length === 0) {
                    alert('エクスポートするデータがありません。');
                    return;
                }

                // CSVヘッダー
                const headers = ['question', 'answer', 'category', 'tags'];

                // CSVデータ生成
                let csv = headers.join(',') + '\n';

                faqs.forEach(faq => {
                    const row = headers.map(header => {
                        let value = faq[header] || '';

                        // tagsは配列の場合があるので文字列化
                        if (header === 'tags' && Array.isArray(value)) {
                            value = value.join(' ');
                        }

                        // カンマや改行、ダブルクォートを含む場合は引用符で囲む
                        if (typeof value === 'string' && (value.includes(',') || value.includes('\n') || value.includes('"'))) {
                            value = '"' + value.replace(/"/g, '""') + '"';
                        }

                        return value;
                    });
                    csv += row.join(',') + '\n';
                });

                // BOMを追加してExcelで文字化けしないように
                const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
                const blob = new Blob([bom, csv], { type: 'text/csv;charset=utf-8' });

                // ダウンロードリンク発火
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `faq_export_${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                showToast(`${faqs.length}件のFAQをエクスポートしました`, 'success');
            } catch (error) {
                console.error('エクスポートエラー:', error);
                alert('エクスポートに失敗しました: ' + error.message);
            } finally {
                exportBtn.disabled = false;
                exportBtn.textContent = '📥 CSV出力';
            }
        });
    }

    // ========== 一括削除機能 ==========
    function setupDeleteAllListener() {
        if (!deleteAllBtn) return;

        deleteAllBtn.addEventListener('click', async () => {
            // 二重確認
            const confirmFirst = confirm('⚠️ 本当に全てのFAQを削除しますか？\nこの操作は取り消せません。');
            if (!confirmFirst) return;

            const confirmSecond = confirm('最終確認：全てのFAQデータが完全に削除されます。続行しますか？');
            if (!confirmSecond) return;

            deleteAllBtn.disabled = true;
            deleteAllBtn.textContent = '削除中...';

            try {
                const faqs = await FaqService.getAll();

                if (faqs.length === 0) {
                    alert('削除するデータがありません。');
                    return;
                }

                let successCount = 0;
                let errorCount = 0;

                for (const faq of faqs) {
                    try {
                        await FaqService.delete(faq.id);
                        successCount++;
                    } catch (err) {
                        console.error('削除エラー:', err, faq.id);
                        errorCount++;
                    }
                }

                alert(`削除完了: 成功 ${successCount}件 / 失敗 ${errorCount}件`);
                loadFaqs(); // 一覧更新
            } catch (error) {
                console.error('一括削除エラー:', error);
                alert('エラーが発生しました: ' + error.message);
            } finally {
                deleteAllBtn.disabled = false;
                deleteAllBtn.textContent = '🗑️ 一括削除';
            }
        });
    }


    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});
