/* ============================================
   AI Pulse — Application Logic
   Clickable cards, heart/like, save, search
   ============================================ */

(function () {
    'use strict';

    // ---------- State ----------
    const state = {
        articles: [],
        savedIds: new Set(),
        likedIds: new Set(),
        activeFilter: 'all',
        searchQuery: '',
    };

    // ---------- DOM Refs ----------
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const grid = $('#articles-grid');
    const searchInput = $('#search-input');
    const filterTabs = $('#filter-tabs');
    const emptyState = $('#empty-state');
    const lastUpdated = $('#last-updated .update-text');
    const btnRefresh = $('#btn-refresh');

    // ---------- Data Loading ----------

    async function loadArticles() {
        showLoading(true);

        try {
            let data;

            // Try fetch first (works with any server)
            try {
                const resp = await fetch('./articles.json');
                if (resp.ok) {
                    data = await resp.json();
                }
            } catch (e) {
                // Fetch failed — try localStorage cache
                const cached = localStorage.getItem('aipulse_articles');
                if (cached) {
                    data = JSON.parse(cached);
                }
            }

            if (!data) {
                data = getSampleData();
            }

            // Cache the data
            localStorage.setItem('aipulse_articles', JSON.stringify(data));

            // Load saved & liked IDs from localStorage
            const savedRaw = localStorage.getItem('aipulse_saved');
            if (savedRaw) {
                JSON.parse(savedRaw).forEach((id) => state.savedIds.add(id));
            }

            const likedRaw = localStorage.getItem('aipulse_liked');
            if (likedRaw) {
                JSON.parse(likedRaw).forEach((id) => state.likedIds.add(id));
            }

            // Mark articles
            state.articles = data.articles.map((article) => ({
                ...article,
                isSaved: state.savedIds.has(article.id),
                isLiked: state.likedIds.has(article.id),
            }));

            // Update last-updated timestamp
            const scrapedAt = new Date(data.scrapedAt);
            lastUpdated.textContent = formatRelativeTime(scrapedAt);

            updateCounts();
            renderArticles();
            showLoading(false);
        } catch (err) {
            console.error('Failed to load articles:', err);
            showLoading(false);
            showToast('⚠️ Failed to load articles');
        }
    }

    // ---------- Rendering ----------

    function renderArticles() {
        const filtered = getFilteredArticles();

        grid.innerHTML = '';
        emptyState.style.display = filtered.length === 0 ? 'block' : 'none';

        filtered.forEach((article, index) => {
            const card = createCard(article, index);
            grid.appendChild(card);
        });

        // Update stat bar
        $('#stat-total').textContent = filtered.length;
        $('#stat-sources').textContent = getActiveSources(filtered);
        $('#stat-saved').textContent = state.savedIds.size;
        $('#stat-liked').textContent = state.likedIds.size;
    }

    function createCard(article, index) {
        const card = document.createElement('article');
        card.className = 'article-card';
        card.dataset.source = article.source;
        card.dataset.id = article.id;
        card.style.animationDelay = `${index * 50}ms`;

        const sourceLabels = {
            'bens-bites': "Ben's Bites",
            'ai-rundown': 'AI Rundown',
            'reddit': 'Reddit',
        };
        const sourceEmojis = {
            'bens-bites': '🍪',
            'ai-rundown': '⚡',
            'reddit': '🔴',
        };

        const imageHtml = article.imageUrl
            ? `<div class="card-image-wrapper">
                 <img class="card-image" src="${escapeHtml(article.imageUrl)}"
                      alt="" loading="lazy"
                      onerror="this.parentElement.outerHTML='<div class=\\'card-no-image\\'>${sourceEmojis[article.source] || '📰'}</div>'">
               </div>`
            : `<div class="card-no-image">${sourceEmojis[article.source] || '📰'}</div>`;

        const timeAgo = formatRelativeTime(new Date(article.publishedAt));
        const isNew = (Date.now() - new Date(article.publishedAt).getTime()) < 3600000;
        const initials = (article.author || '?').charAt(0).toUpperCase();
        const isLiked = state.likedIds.has(article.id);
        const isSaved = state.savedIds.has(article.id);

        card.innerHTML = `
            ${isNew ? '<div class="new-badge">NEW</div>' : ''}
            <a href="${escapeHtml(article.url)}" target="_blank" rel="noopener noreferrer" class="card-link-overlay" aria-label="Read: ${escapeHtml(article.title)}"></a>
            ${imageHtml}
            <div class="card-body">
                <div class="card-meta">
                    <span class="source-badge ${article.source}">${sourceEmojis[article.source]} ${sourceLabels[article.source] || article.sourceName}</span>
                    <span class="card-time">${timeAgo}</span>
                </div>
                <h2 class="card-title">${escapeHtml(article.title)}</h2>
                ${article.summary ? `<p class="card-summary">${escapeHtml(article.summary)}</p>` : ''}
                <div class="card-footer">
                    <span class="card-author">
                        <span class="author-avatar">${initials}</span>
                        ${escapeHtml(article.author || 'Unknown')}
                    </span>
                    <div class="card-actions">
                        <button class="btn-action btn-like ${isLiked ? 'liked' : ''}"
                                data-id="${article.id}" title="${isLiked ? 'Unlike' : 'Like'} article">
                            <svg class="heart-icon" width="16" height="16" viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                            </svg>
                        </button>
                        <button class="btn-action btn-save ${isSaved ? 'saved' : ''}"
                                data-id="${article.id}" title="${isSaved ? 'Unsave' : 'Save'} article">
                            ${isSaved ? '⭐' : '☆'}
                        </button>
                        <a href="${escapeHtml(article.url)}" target="_blank" rel="noopener noreferrer"
                           class="btn-action btn-open" title="Read article">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                <polyline points="15 3 21 3 21 9"></polyline>
                                <line x1="10" y1="14" x2="21" y2="3"></line>
                            </svg>
                        </a>
                    </div>
                </div>
            </div>
        `;

        // Like button handler
        const likeBtn = card.querySelector('.btn-like');
        likeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleLike(article.id);
        });

        // Save button handler
        const saveBtn = card.querySelector('.btn-save');
        saveBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleSave(article.id);
        });

        // Open link handler — prevent overlay link on action buttons
        const actionBtns = card.querySelectorAll('.btn-action, .btn-open');
        actionBtns.forEach((btn) => {
            btn.addEventListener('click', (e) => e.stopPropagation());
        });

        return card;
    }

    // ---------- Filtering ----------

    function getFilteredArticles() {
        let articles = [...state.articles];

        // Filter by source
        if (state.activeFilter === 'saved') {
            articles = articles.filter((a) => state.savedIds.has(a.id));
        } else if (state.activeFilter === 'liked') {
            articles = articles.filter((a) => state.likedIds.has(a.id));
        } else if (state.activeFilter !== 'all') {
            articles = articles.filter((a) => a.source === state.activeFilter);
        }

        // Filter by search query
        if (state.searchQuery) {
            const q = state.searchQuery.toLowerCase();
            articles = articles.filter(
                (a) =>
                    a.title.toLowerCase().includes(q) ||
                    (a.summary && a.summary.toLowerCase().includes(q)) ||
                    (a.author && a.author.toLowerCase().includes(q))
            );
        }

        return articles;
    }

    function updateCounts() {
        const articles = state.articles;
        $('#count-all').textContent = articles.length;
        $('#count-bens-bites').textContent = articles.filter((a) => a.source === 'bens-bites').length;
        $('#count-ai-rundown').textContent = articles.filter((a) => a.source === 'ai-rundown').length;
        $('#count-reddit').textContent = articles.filter((a) => a.source === 'reddit').length;
        $('#count-saved').textContent = state.savedIds.size;
        $('#count-liked').textContent = state.likedIds.size;
    }

    function getActiveSources(articles) {
        return new Set(articles.map((a) => a.source)).size;
    }

    // ---------- Like/Unlike ----------

    function toggleLike(articleId) {
        if (state.likedIds.has(articleId)) {
            state.likedIds.delete(articleId);
            showToast('💔 Removed from liked');
        } else {
            state.likedIds.add(articleId);
            showToast('❤️ Article liked!');
        }

        state.articles = state.articles.map((a) => ({
            ...a,
            isLiked: state.likedIds.has(a.id),
        }));

        localStorage.setItem('aipulse_liked', JSON.stringify([...state.likedIds]));
        updateCounts();
        renderArticles();
    }

    // ---------- Save/Unsave ----------

    function toggleSave(articleId) {
        if (state.savedIds.has(articleId)) {
            state.savedIds.delete(articleId);
            showToast('☆ Article removed from saved');
        } else {
            state.savedIds.add(articleId);
            showToast('⭐ Article saved!');
        }

        state.articles = state.articles.map((a) => ({
            ...a,
            isSaved: state.savedIds.has(a.id),
        }));

        localStorage.setItem('aipulse_saved', JSON.stringify([...state.savedIds]));
        updateCounts();
        renderArticles();
    }

    // ---------- UI Helpers ----------

    function showLoading(show) {
        const skeletons = $$('.skeleton-card');
        skeletons.forEach((s) => (s.style.display = show ? 'block' : 'none'));
    }

    function showToast(message) {
        const container = $('#toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('toast-exit');
            toast.addEventListener('animationend', () => toast.remove());
        }, 2500);
    }

    function formatRelativeTime(date) {
        const now = new Date();
        const diff = now - date;
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ---------- Event Listeners ----------

    // Search input
    let searchDebounce;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(() => {
            state.searchQuery = e.target.value.trim();
            renderArticles();
        }, 200);
    });

    // Keyboard shortcut: Ctrl+K
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            searchInput.focus();
        }
        if (e.key === 'Escape') {
            searchInput.blur();
            searchInput.value = '';
            state.searchQuery = '';
            renderArticles();
        }
    });

    // Filter tabs
    filterTabs.addEventListener('click', (e) => {
        const tab = e.target.closest('.filter-tab');
        if (!tab) return;

        $$('.filter-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');

        state.activeFilter = tab.dataset.filter;
        renderArticles();
    });

    // Refresh button
    btnRefresh.addEventListener('click', () => {
        btnRefresh.classList.add('spinning');
        setTimeout(() => btnRefresh.classList.remove('spinning'), 800);
        loadArticles();
    });

    // ---------- Sample Data Fallback ----------

    function getSampleData() {
        return {
            scrapedAt: new Date().toISOString(),
            totalArticles: 2,
            articles: [
                {
                    id: 'sample-1',
                    title: 'Welcome to AI Pulse',
                    subtitle: 'Your daily AI intelligence feed',
                    url: '#',
                    source: 'ai-rundown',
                    sourceName: 'AI Rundown',
                    publishedAt: new Date().toISOString(),
                    scrapedAt: new Date().toISOString(),
                    summary: 'Run the aggregator (python tools/aggregate.py) to populate this dashboard with real articles.',
                    imageUrl: null,
                    author: 'AI Pulse',
                    tags: ['welcome'],
                    isSaved: false,
                    isLiked: false,
                    isNew: true,
                },
            ],
        };
    }

    // ---------- Init ----------
    loadArticles();
})();
