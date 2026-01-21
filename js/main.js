// 検索・閲覧画面のメインロジック

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const categoryTags = document.getElementById('categoryTags');
    const faqList = document.getElementById('faqList');
    const faqSection = document.getElementById('faqSection');
    const recentSection = document.getElementById('recentSection');
    const recentList = document.getElementById('recentList');

    const favoritesSection = document.getElementById('favoritesSection');
    const favoritesList = document.getElementById('favoritesList');
    const favoritesTabBtn = document.getElementById('favoritesTabBtn'); // お気に入りタブボタン
    const tabControls = document.getElementById('tabControls'); // タブコントロール
    const searchBtn = document.getElementById('searchBtn'); // 検索ボタン
    const voiceSearchBtn = document.getElementById('voiceSearchBtn'); // 音声検索ボタン

    let currentCategory = null;
    let isSearching = false;

    // ローカルストレージで「役に立った」済みを管理
    const helpfulVotes = JSON.parse(localStorage.getItem('helpfulVotes') || '[]');

    // お気に入りを管理
    let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');

    // 初期化
    init();

    async function init() {
        await loadCategories();
        await loadFavorites();
        await loadRecentFaqs();
        await loadFaqs();
        setupEventListeners();
        setupVoiceSearch(); // 音声検索機能
    }

    // お気に入りを読み込み
    async function loadFavorites() {
        if (!favoritesTabBtn) return;

        if (favorites.length === 0) {
            favoritesTabBtn.style.display = 'none';
            // もし現在お気に入りタブが開いていたら、最近の更新タブに戻す
            if (favoritesTabBtn.classList.contains('active')) {
                document.querySelector('[data-tab="recent"]').click();
            }
            return;
        }

        try {
            const allFaqs = await FaqService.getAll();
            const favoriteFaqs = allFaqs.filter(faq => favorites.includes(faq.id));

            if (favoriteFaqs.length > 0) {
                favoritesTabBtn.style.display = 'block';
                favoritesList.innerHTML = favoriteFaqs.map(faq => `
          <div class="favorite-item" data-id="${faq.id}">
            <span class="favorite-star" data-id="${faq.id}">⭐</span>
            <span class="favorite-question">${escapeHtml(faq.question)}</span>
            ${faq.category ? `<span class="faq-category">${escapeHtml(faq.category)}</span>` : ''}
          </div>
        `).join('');
            } else {
                favoritesTabBtn.style.display = 'none';
            }
        } catch (error) {
            console.error('お気に入り読み込みエラー:', error);
        }
    }

    // 最近の更新を読み込み
    async function loadRecentFaqs() {
        try {
            const faqs = await FaqService.getRecent(3);
            const recentFaqs = faqs.filter(faq => isRecent(faq.updated_at, 7));

            if (recentFaqs.length > 0) {
                // recentSection.style.display = 'block'; // タブ制御(activeクラス)任せにする
                recentList.innerHTML = recentFaqs.map(faq => `
          <div class="recent-item" data-id="${faq.id}">
            <span class="new-badge">NEW</span>
            <span class="recent-question">${escapeHtml(faq.question)}</span>
            ${faq.category ? `<span class="faq-category">${escapeHtml(faq.category)}</span>` : ''}
          </div>
        `).join('');
            }
        } catch (error) {
            console.error('最近の更新読み込みエラー:', error);
        }
    }



    // カテゴリ一覧読み込み
    async function loadCategories() {
        try {
            const categories = await FaqService.getCategories();
            renderCategories(categories);
        } catch (error) {
            console.error('カテゴリ読み込みエラー:', error);
        }
    }

    // カテゴリ表示
    function renderCategories(categories) {
        categoryTags.innerHTML = `
      <button class="category-tag active" data-category="">すべて</button>
      ${categories.map(cat => `
        <button class="category-tag" data-category="${cat}">${cat}</button>
      `).join('')}
    `;
    }

    // FAQデータを読み込み
    // saveLog: trueの場合のみFirestoreに検索ログを保存する（Enter確定や音声検索時）
    async function loadFaqs(keyword = '', category = null, saveLog = false) {
        const faqList = document.getElementById('faqList');
        const compactSections = document.getElementById('compactSections');

        // 検索状態の管理
        const isSearching = !!keyword;

        // 検索キーワード入力時のみタブエリアを非表示（カテゴリ選択時は表示したまま）
        if (isSearching) {
            if (compactSections) compactSections.style.display = 'none';
        } else {
            if (compactSections) compactSections.style.display = 'block';
        }
        // カテゴリ選択時もFAQリストは表示する

        faqList.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

        try {
            // 検索ログ保存（Enterキーまたは音声検索による明示的な場合のみ）
            // デバッグ: ログ保存条件の確認
            console.log('[loadFaqs] keyword:', keyword, 'saveLog:', saveLog);

            if (keyword && isSearching && saveLog === true) {
                console.log('[loadFaqs] ログ保存を実行します:', keyword);
                // background処理として実行（awaitしない）
                FaqService.logSearch(keyword).catch(err => console.error(err));
            }

            let faqs = await FaqService.getAll();

            // カテゴリフィルター（クライアントサイド）
            if (category) {
                faqs = faqs.filter(faq => faq.category === category);
            }

            // キーワード検索（クライアントサイド）
            if (keyword) {
                const lowerKeyword = keyword.toLowerCase();
                faqs = faqs.filter(faq => {
                    const questionMatch = faq.question.toLowerCase().includes(lowerKeyword);
                    const answerMatch = faq.answer.toLowerCase().includes(lowerKeyword);
                    const tagsMatch = faq.tags && faq.tags.some(tag =>
                        tag.toLowerCase().includes(lowerKeyword)
                    );
                    return questionMatch || answerMatch || tagsMatch;
                });
            }

            renderFaqs(faqs);
        } catch (error) {
            console.error('FAQ読み込みエラー:', error);
            faqList.innerHTML = `
        <div class="no-results">
          <div class="no-results-icon">⚠️</div>
          <p>データの読み込みに失敗しました</p>
          <p>Firebase設定を確認してください</p>
        </div>
      `;
        }
    }

    // FAQ表示
    function renderFaqs(faqs) {
        if (faqs.length === 0) {
            faqList.innerHTML = `
        <div class="no-results">
          <div class="no-results-icon">🔍</div>
          <p>該当するFAQが見つかりませんでした</p>
        </div>
      `;
            return;
        }

        faqList.innerHTML = faqs.map(faq => {
            const hasVoted = helpfulVotes.includes(faq.id);
            const isNew = isRecent(faq.updated_at, 7);
            const isFavorite = favorites.includes(faq.id);

            return `
        <div class="faq-item" data-id="${faq.id}">
          <div class="faq-question">
            <h3>
              ${isNew ? '<span class="new-badge">NEW</span>' : ''}
              ${escapeHtml(faq.question)}
            </h3>
            <div class="faq-meta">
              <button class="favorite-btn ${isFavorite ? 'active' : ''}" data-id="${faq.id}" title="お気に入り">
                ${isFavorite ? '⭐' : '☆'}
              </button>
              ${faq.view_count ? `<span class="view-badge">👁 ${faq.view_count}</span>` : ''}
              ${faq.category ? `<span class="faq-category">${escapeHtml(faq.category)}</span>` : ''}
              <span class="faq-toggle">▼</span>
            </div>
          </div>
          <div class="faq-answer">
            <div class="faq-answer-content">
              ${renderMarkdown(faq.answer)}
              
              <div class="faq-footer">
                <button class="helpful-btn ${hasVoted ? 'voted' : ''}" data-id="${faq.id}" ${hasVoted ? 'disabled' : ''}>
                  👍 役に立った ${faq.helpful_count ? `(${faq.helpful_count})` : ''}
                </button>
                <div class="faq-footer-right">
                  <a href="#" class="scroll-to-search" title="検索に戻る">🔍 検索</a>
                  <span class="faq-updated">最終更新: ${formatDate(faq.updated_at)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
        }).join('');
    }

    // イベントリスナー設定
    function setupEventListeners() {
        // タブ切り替え
        if (tabControls) {
            tabControls.addEventListener('click', (e) => {
                if (e.target.classList.contains('tab-btn')) {
                    const tabId = e.target.dataset.tab;

                    // タブボタンのアクティブ化
                    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
                    e.target.classList.add('active');

                    // タブペインの表示切り替え
                    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

                    if (tabId === 'recent') {
                        document.getElementById('recentSection').classList.add('active');
                    } else if (tabId === 'favorites') {
                        document.getElementById('favoritesSection').classList.add('active');
                    }
                }
            });
        }


        // 検索（ボタン/Enter/IME確定時のみ実行）
        let isComposing = false; // IME入力中フラグ
        let justCompositionEnded = false; // IME確定直後フラグ（Enterキー重複防止用）

        // IME入力開始
        searchInput.addEventListener('compositionstart', () => {
            isComposing = true;
        });

        // IME入力終了（変換確定）→ここでログ保存付きの検索を実行
        searchInput.addEventListener('compositionend', () => {
            isComposing = false;
            justCompositionEnded = true;

            const keyword = searchInput.value.trim();
            if (keyword) {
                // IME確定時にログ保存付きで検索実行（日本語入力の自然な動作）
                console.log('[compositionend] IME確定でログ保存:', keyword);
                loadFaqs(keyword, currentCategory, true);
            }

            // 短い時間後にフラグをリセット（直後のEnterキーイベントとの重複防止）
            setTimeout(() => {
                justCompositionEnded = false;
            }, 100);
        });

        // inputイベントではリアルタイム検索しない（検索ボタン/Enter/IME確定時のみ検索）
        searchInput.addEventListener('input', (e) => {
            // IME入力中は何もしない
            if (isComposing || e.isComposing) return;

            const keyword = e.target.value.trim();

            // 検索欄がクリアされた場合のみ、元の表示に戻す
            if (!keyword) {
                loadFaqs('', currentCategory, false);
                loadFavorites();
                loadRecentFaqs();
            }
        });

        // Enterキーでログ保存（英数字入力用）
        searchInput.addEventListener('keydown', (e) => {
            // IME確定直後のEnterは無視（compositionendで処理済み）
            if (e.key === 'Enter' && !isComposing && !e.isComposing && !justCompositionEnded) {
                const keyword = searchInput.value.trim();
                if (keyword) {
                    // 英数字入力確定時にログ保存
                    console.log('[keydown] Enterでログ保存:', keyword);
                    loadFaqs(keyword, currentCategory, true);
                }
            }
        });

        // 検索ボタンクリックでログ保存
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                const keyword = searchInput.value.trim();
                if (keyword) {
                    console.log('[searchBtn] ボタンクリックでログ保存:', keyword);
                    loadFaqs(keyword, currentCategory, true);
                }
            });
        }

        // カテゴリフィルター
        categoryTags.addEventListener('click', (e) => {
            if (e.target.classList.contains('category-tag')) {
                document.querySelectorAll('.category-tag').forEach(tag => tag.classList.remove('active'));
                e.target.classList.add('active');
                currentCategory = e.target.dataset.category || null;
                loadFaqs(searchInput.value.trim(), currentCategory);
            }
        });

        // アコーディオン & 閲覧数カウント & お気に入り
        faqList.addEventListener('click', async (e) => {
            // お気に入りボタン
            const favoriteBtn = e.target.closest('.favorite-btn');
            if (favoriteBtn) {
                e.stopPropagation();
                const faqId = favoriteBtn.dataset.id;
                toggleFavorite(faqId, favoriteBtn);
                return;
            }

            // 検索に戻るリンク
            const scrollToSearchLink = e.target.closest('.scroll-to-search');
            if (scrollToSearchLink) {
                e.preventDefault();
                searchInput.scrollIntoView({ behavior: 'smooth', block: 'start' });
                searchInput.focus();
                return;
            }

            const question = e.target.closest('.faq-question');
            if (question) {
                const item = question.closest('.faq-item');
                const wasOpen = item.classList.contains('open');
                item.classList.toggle('open');

                // 開いた時に閲覧数をインクリメント
                if (!wasOpen) {
                    const faqId = item.dataset.id;
                    FaqService.incrementViewCount(faqId);
                }
            }

            // 役に立ったボタン
            const helpfulBtn = e.target.closest('.helpful-btn');
            if (helpfulBtn && !helpfulBtn.disabled) {
                const faqId = helpfulBtn.dataset.id;
                const success = await FaqService.incrementHelpfulCount(faqId);

                if (success) {
                    helpfulVotes.push(faqId);
                    localStorage.setItem('helpfulVotes', JSON.stringify(helpfulVotes));
                    helpfulBtn.classList.add('voted');
                    helpfulBtn.disabled = true;

                    // カウント表示を更新
                    const currentText = helpfulBtn.textContent;
                    const match = currentText.match(/\((\d+)\)/);
                    const newCount = match ? parseInt(match[1]) + 1 : 1;
                    helpfulBtn.textContent = `👍 役に立った (${newCount})`;

                    showToast('ご評価ありがとうございます！', 'success');
                }
            }
        });

        // お気に入りセクションクリック
        if (favoritesList) {
            favoritesList.addEventListener('click', (e) => {
                const star = e.target.closest('.favorite-star');
                if (star) {
                    const faqId = star.dataset.id;
                    toggleFavorite(faqId);
                    loadFavorites();
                    loadFaqs(searchInput.value.trim(), currentCategory);
                    return;
                }

                const item = e.target.closest('.favorite-item');
                if (item) {
                    scrollToFaq(item.dataset.id);
                }
            });
        }

        // 最近の更新クリック
        if (recentList) {
            recentList.addEventListener('click', (e) => {
                const item = e.target.closest('.recent-item');
                if (item) {
                    scrollToFaq(item.dataset.id);
                }
            });
        }

        // 人気FAQクリック
        if (popularList) {
            popularList.addEventListener('click', (e) => {
                const item = e.target.closest('.popular-item');
                if (item) {
                    scrollToFaq(item.dataset.id);
                }
            });
        }
    }

    // お気に入りをトグル
    function toggleFavorite(faqId, btn = null) {
        const index = favorites.indexOf(faqId);
        if (index > -1) {
            favorites.splice(index, 1);
            if (btn) {
                btn.classList.remove('active');
                btn.textContent = '☆';
            }
            showToast('お気に入りから削除しました', 'info');
        } else {
            favorites.push(faqId);
            if (btn) {
                btn.classList.add('active');
                btn.textContent = '⭐';
            }
            showToast('お気に入りに追加しました', 'success');
        }
        localStorage.setItem('favorites', JSON.stringify(favorites));
        loadFavorites();
    }

    // ========== 音声検索機能 ==========
    function setupVoiceSearch() {
        // ブラウザが音声認識をサポートしているか確認
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            console.log('Voice search not supported in this browser.');
            return;
        }

        // マイクボタンを表示
        if (voiceSearchBtn) voiceSearchBtn.style.display = 'flex';

        const recognition = new SpeechRecognition();
        recognition.lang = 'ja-JP'; // 日本語
        recognition.interimResults = false; // 確定した結果のみ取得
        recognition.maxAlternatives = 1;

        let isListening = false;

        voiceSearchBtn.addEventListener('click', () => {
            if (isListening) {
                recognition.stop();
            } else {
                recognition.start();
            }
        });

        // 音声認識開始
        recognition.onstart = () => {
            isListening = true;
            voiceSearchBtn.classList.add('listening');
            searchInput.placeholder = 'お話しください...';
        };

        // 音声認識終了
        recognition.onend = () => {
            isListening = false;
            voiceSearchBtn.classList.remove('listening');
            if (searchInput.value === '') {
                searchInput.placeholder = '例：領収書、WiFi、休暇申請...';
            }
        };

        // 結果取得
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;

            // 検索ボックスに入力して検索実行
            searchInput.value = transcript;

            // 検索実行（ログ保存する）
            loadFaqs(transcript, currentCategory, true);
        };

        // エラー処理
        recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            isListening = false;
            voiceSearchBtn.classList.remove('listening');
            searchInput.placeholder = 'エラーが発生しました';
            setTimeout(() => {
                searchInput.placeholder = '例：領収書、WiFi、休暇申請...';
            }, 2000);
        };
    }

    // 指定FAQにスクロールして開く
    async function scrollToFaq(faqId) {
        let faqItem = document.querySelector(`.faq-item[data-id="${faqId}"]`);

        // 現在のリストにない場合（カテゴリ絞り込み中など）、フィルタを解除して再表示
        if (!faqItem) {
            // カテゴリ選択を「すべて」に戻す
            const allBtn = document.querySelector('.category-tag[data-category=""]');
            if (allBtn) {
                document.querySelectorAll('.category-tag').forEach(tag => tag.classList.remove('active'));
                allBtn.classList.add('active');
            }
            currentCategory = null;

            // カテゴリ解除して再ロード
            await loadFaqs(searchInput.value.trim(), null);
            faqItem = document.querySelector(`.faq-item[data-id="${faqId}"]`);

            // それでもなければ検索ワードもクリア
            if (!faqItem && searchInput.value.trim()) {
                searchInput.value = '';
                await loadFaqs('', null);
                faqItem = document.querySelector(`.faq-item[data-id="${faqId}"]`);
            }
        }

        if (faqItem) {
            // ヘッダーの高さを取得
            const header = document.querySelector('.header');
            const headerHeight = header ? header.offsetHeight : 60;

            // FAQアイテムの位置を計算
            const elementPosition = faqItem.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerHeight - 20;

            // スクロール
            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });

            setTimeout(() => {
                if (!faqItem.classList.contains('open')) {
                    faqItem.classList.add('open');
                    FaqService.incrementViewCount(faqId);
                }
            }, 500);
        } else {
            showToast('該当するFAQが見つかりませんでした', 'error');
        }
    }

    // マークダウン変換
    function renderMarkdown(text) {
        if (typeof marked !== 'undefined') {
            return marked.parse(text);
        }
        // marked.jsがない場合の簡易変換
        return text
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
    }

    // HTMLエスケープ
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});
