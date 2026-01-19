// 検索・閲覧画面のメインロジック

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const categoryTags = document.getElementById('categoryTags');
    const faqList = document.getElementById('faqList');
    const faqSection = document.getElementById('faqSection');
    const recentSection = document.getElementById('recentSection');
    const recentList = document.getElementById('recentList');
    const popularSection = document.getElementById('popularSection');
    const popularList = document.getElementById('popularList');
    const favoritesSection = document.getElementById('favoritesSection');
    const favoritesList = document.getElementById('favoritesList');

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
        await loadPopularFaqs();
        await loadFaqs();
        setupEventListeners();
    }

    // お気に入りを読み込み
    async function loadFavorites() {
        if (favorites.length === 0) {
            favoritesSection.style.display = 'none';
            return;
        }

        try {
            const allFaqs = await FaqService.getAll();
            const favoriteFaqs = allFaqs.filter(faq => favorites.includes(faq.id));

            if (favoriteFaqs.length > 0) {
                favoritesSection.style.display = 'block';
                favoritesList.innerHTML = favoriteFaqs.map(faq => `
          <div class="favorite-item" data-id="${faq.id}">
            <span class="favorite-star" data-id="${faq.id}">⭐</span>
            <span class="favorite-question">${escapeHtml(faq.question)}</span>
            ${faq.category ? `<span class="faq-category">${escapeHtml(faq.category)}</span>` : ''}
          </div>
        `).join('');
            } else {
                favoritesSection.style.display = 'none';
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
                recentSection.style.display = 'block';
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

    // 人気のFAQを読み込み
    async function loadPopularFaqs() {
        try {
            const faqs = await FaqService.getPopular(3);
            const popularFaqs = faqs.filter(faq => (faq.view_count || 0) > 0);

            if (popularFaqs.length > 0) {
                popularSection.style.display = 'block';
                popularList.innerHTML = popularFaqs.map(faq => `
          <div class="popular-item" data-id="${faq.id}">
            <span class="view-count">👁 ${faq.view_count || 0}</span>
            <span class="popular-question">${escapeHtml(faq.question)}</span>
            ${faq.category ? `<span class="faq-category">${escapeHtml(faq.category)}</span>` : ''}
          </div>
        `).join('');
            }
        } catch (error) {
            console.error('人気FAQ読み込みエラー:', error);
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

    // FAQ一覧読み込み
    async function loadFaqs(keyword = '', category = null) {
        faqList.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
        isSearching = !!keyword;

        // 検索中は特殊セクションを非表示
        if (isSearching) {
            favoritesSection.style.display = 'none';
            recentSection.style.display = 'none';
            popularSection.style.display = 'none';
        }

        try {
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
                <span class="faq-updated">最終更新: ${formatDate(faq.updated_at)}</span>
              </div>
            </div>
          </div>
        </div>
      `;
        }).join('');
    }

    // イベントリスナー設定
    function setupEventListeners() {
        // 検索
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                const keyword = e.target.value.trim();
                loadFaqs(keyword, currentCategory);

                // 検索クリア時にセクション再表示
                if (!keyword && !isSearching) {
                    loadFavorites();
                    loadRecentFaqs();
                    loadPopularFaqs();
                }
            }, 300);
        });

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

    // 指定FAQにスクロールして開く
    function scrollToFaq(faqId) {
        const faqItem = document.querySelector(`.faq-item[data-id="${faqId}"]`);
        if (faqItem) {
            faqItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => {
                if (!faqItem.classList.contains('open')) {
                    faqItem.classList.add('open');
                    FaqService.incrementViewCount(faqId);
                }
            }, 500);
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
