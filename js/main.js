// 検索・閲覧画面のメインロジック

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const categoryTags = document.getElementById('categoryTags');
    const faqList = document.getElementById('faqList');
    const faqSection = document.getElementById('faqSection');

    let currentCategory = null;

    // 初期化
    init();

    async function init() {
        await loadCategories();
        await loadFaqs();
        setupEventListeners();
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

        try {
            let faqs;
            if (keyword) {
                faqs = await FaqService.search(keyword);
                if (category) {
                    faqs = faqs.filter(faq => faq.category === category);
                }
            } else if (category) {
                faqs = await FaqService.getByCategory(category);
            } else {
                faqs = await FaqService.getAll();
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

        faqList.innerHTML = faqs.map(faq => `
      <div class="faq-item" data-id="${faq.id}">
        <div class="faq-question">
          <h3>${escapeHtml(faq.question)}</h3>
          <div class="faq-meta">
            ${faq.category ? `<span class="faq-category">${escapeHtml(faq.category)}</span>` : ''}
            <span class="faq-toggle">▼</span>
          </div>
        </div>
        <div class="faq-answer">
          <div class="faq-answer-content">
            ${renderMarkdown(faq.answer)}
            <div class="faq-updated">最終更新: ${formatDate(faq.updated_at)}</div>
          </div>
        </div>
      </div>
    `).join('');
    }

    // イベントリスナー設定
    function setupEventListeners() {
        // 検索
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                loadFaqs(e.target.value.trim(), currentCategory);
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

        // アコーディオン
        faqList.addEventListener('click', (e) => {
            const question = e.target.closest('.faq-question');
            if (question) {
                const item = question.closest('.faq-item');
                item.classList.toggle('open');
            }
        });
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
