// Blog main page functionality

class BlogApp {
    constructor() {
        this.posts = [];
        this.allPosts = [];
        this.currentPage = 1;
        this.postsPerPage = CONFIG.POSTS_PER_PAGE;
        this.currentTag = getUrlParameter('tag') || '';
        this.currentQuery = getUrlParameter('q') || '';
        this.isLoading = false;
        
        this.init();
    }

    /**
     * Initialize the blog app
     */
    async init() {
        console.log('🚀 Initializing Blog App...');
        
        this.setupEventListeners();
        this.showLoading();
        
        try {
            await this.loadPosts();
            this.renderPage();
        } catch (error) {
            console.error('❌ Blog initialization error:', error);
            this.showError('블로그를 초기화하는데 실패했습니다.');
        }
    }

    /**
     * Load posts from Google Sheets
     */
    async loadPosts() {
        try {
            this.allPosts = await window.SheetsAPI.fetchPosts();
            this.filterPosts();
            console.log(`✅ Loaded ${this.allPosts.length} posts`);
        } catch (error) {
            console.error('❌ Error loading posts:', error);
            throw new Error('포스트를 불러오는데 실패했습니다');
        }
    }

    /**
     * Filter posts based on current filters
     */
    filterPosts() {
        let filteredPosts = [...this.allPosts];

        // Filter by tag
        if (this.currentTag) {
            filteredPosts = window.SheetsAPI.filterByTag(filteredPosts, this.currentTag);
        }

        // Filter by search query
        if (this.currentQuery) {
            filteredPosts = window.SheetsAPI.searchPosts(filteredPosts, this.currentQuery);
        }

        this.posts = filteredPosts;
        this.currentPage = 1; // Reset to first page
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');

        if (searchInput) {
            searchInput.value = this.currentQuery;
            
            // Debounced search
            const debouncedSearch = debounce((query) => {
                this.handleSearch(query);
            }, 500);

            searchInput.addEventListener('input', (e) => {
                debouncedSearch(e.target.value);
            });

            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleSearch(e.target.value);
                }
            });
        }

        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                const query = searchInput?.value || '';
                this.handleSearch(query);
            });
        }

        // Browser back/forward buttons
        window.addEventListener('popstate', () => {
            this.currentTag = getUrlParameter('tag') || '';
            this.currentQuery = getUrlParameter('q') || '';
            this.filterPosts();
            this.renderPage();
        });
    }

    /**
     * Handle search
     * @param {string} query - Search query
     */
    handleSearch(query) {
        this.currentQuery = query.trim();
        setUrlParameter('q', this.currentQuery);
        this.filterPosts();
        this.renderPage();
    }

    /**
     * Handle tag filter
     * @param {string} tag - Tag to filter by
     */
    handleTagFilter(tag) {
        this.currentTag = tag;
        setUrlParameter('tag', tag);
        this.filterPosts();
        this.renderPage();
    }

    /**
     * Render the entire page
     */
    renderPage() {
        this.hideLoading();
        this.renderTagFilters();
        this.renderPosts();
        this.renderPagination();
        this.updatePageTitle();
    }

    /**
     * Render tag filters
     */
    renderTagFilters() {
        const tagFiltersContainer = document.getElementById('tagFilters');
        if (!tagFiltersContainer) return;

        const allTags = window.SheetsAPI.getAllTags(this.allPosts);
        const tagCounts = this.getTagCounts();

        let filtersHTML = `
            <button class="tag-filter ${!this.currentTag ? 'active' : ''}" data-tag="">
                전체 (${this.allPosts.length})
            </button>
        `;

        allTags.forEach(tag => {
            const count = tagCounts[tag] || 0;
            const isActive = this.currentTag === tag;
            
            filtersHTML += `
                <button class="tag-filter ${isActive ? 'active' : ''}" data-tag="${tag}">
                    ${tag} (${count})
                </button>
            `;
        });

        tagFiltersContainer.innerHTML = filtersHTML;

        // Add event listeners
        tagFiltersContainer.addEventListener('click', (e) => {
            const tagButton = e.target.closest('.tag-filter');
            if (tagButton) {
                const tag = tagButton.dataset.tag;
                this.handleTagFilter(tag);
            }
        });
    }

    /**
     * Get tag counts
     * @returns {Object} Tag counts
     */
    getTagCounts() {
        const counts = {};
        
        this.allPosts.forEach(post => {
            post.tags.forEach(tag => {
                counts[tag] = (counts[tag] || 0) + 1;
            });
        });

        return counts;
    }

    /**
     * Render posts
     */
    renderPosts() {
        const postsContainer = document.getElementById('postsContainer');
        if (!postsContainer) return;

        if (this.posts.length === 0) {
            this.showEmptyState();
            return;
        }

        // Calculate pagination
        const startIndex = (this.currentPage - 1) * this.postsPerPage;
        const endIndex = startIndex + this.postsPerPage;
        const currentPosts = this.posts.slice(startIndex, endIndex);

        // Render posts
        const postsHTML = currentPosts.map(post => this.renderPostCard(post)).join('');
        postsContainer.innerHTML = postsHTML;

        // Add lazy loading for images
        this.setupLazyLoading();
    }

    /**
     * Render individual post card
     * @param {Object} post - Post object
     * @returns {string} HTML string
     */
    renderPostCard(post) {
        const thumbnailSrc = post.thumbnail || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
        
        const tagsHTML = post.tags.map(tag => 
            `<a href="?tag=${encodeURIComponent(tag)}" class="post-tag">${tag}</a>`
        ).join('');

        return `
            <article class="post-card">
                <img src="${thumbnailSrc}" 
                     alt="${post.title}" 
                     class="post-card-image"
                     loading="lazy"
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='">
                
                <div class="post-card-content">
                    <h2 class="post-card-title">
                        <a href="post.html?id=${post.id}">${post.title}</a>
                    </h2>
                    
                    <div class="post-card-meta">
                        <span class="post-date">${formatDate(post.date)}</span>
                        <span class="post-author">${post.author}</span>
                        <span class="read-time">${post.readTime}분 읽기</span>
                    </div>
                    
                    <p class="post-card-excerpt">${post.excerpt}</p>
                    
                    <div class="post-card-tags">
                        ${tagsHTML}
                    </div>
                    
                    <div class="post-card-footer">
                        <a href="post.html?id=${post.id}" class="read-more">더 읽기 →</a>
                    </div>
                </div>
            </article>
        `;
    }

    /**
     * Setup lazy loading for images
     */
    setupLazyLoading() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src || img.src;
                        img.classList.remove('lazy');
                        observer.unobserve(img);
                    }
                });
            });

            document.querySelectorAll('img[loading="lazy"]').forEach(img => {
                imageObserver.observe(img);
            });
        }
    }

    /**
     * Render pagination
     */
    renderPagination() {
        const paginationContainer = document.getElementById('pagination');
        if (!paginationContainer) return;

        const totalPages = Math.ceil(this.posts.length / this.postsPerPage);
        
        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }

        let paginationHTML = '';

        // Previous button
        if (this.currentPage > 1) {
            paginationHTML += `
                <button class="page-btn" data-page="${this.currentPage - 1}">
                    ← 이전
                </button>
            `;
        }

        // Page numbers
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);

        if (startPage > 1) {
            paginationHTML += `<button class="page-btn" data-page="1">1</button>`;
            if (startPage > 2) {
                paginationHTML += `<span class="page-dots">...</span>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            const isActive = i === this.currentPage;
            paginationHTML += `
                <button class="page-btn ${isActive ? 'active' : ''}" data-page="${i}">
                    ${i}
                </button>
            `;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += `<span class="page-dots">...</span>`;
            }
            paginationHTML += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
        }

        // Next button
        if (this.currentPage < totalPages) {
            paginationHTML += `
                <button class="page-btn" data-page="${this.currentPage + 1}">
                    다음 →
                </button>
            `;
        }

        paginationContainer.innerHTML = paginationHTML;

        // Add event listeners
        paginationContainer.addEventListener('click', (e) => {
            const pageBtn = e.target.closest('.page-btn');
            if (pageBtn) {
                const page = parseInt(pageBtn.dataset.page);
                this.goToPage(page);
            }
        });
    }

    /**
     * Go to specific page
     * @param {number} page - Page number
     */
    goToPage(page) {
        this.currentPage = page;
        this.renderPosts();
        this.renderPagination();
        scrollToElement('.posts', 100);
    }

    /**
     * Show loading state
     */
    showLoading() {
        this.isLoading = true;
        const loadingSpinner = document.getElementById('loadingSpinner');
        const postsContainer = document.getElementById('postsContainer');
        
        if (loadingSpinner) loadingSpinner.style.display = 'flex';
        if (postsContainer) postsContainer.innerHTML = '';
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        this.isLoading = false;
        const loadingSpinner = document.getElementById('loadingSpinner');
        
        if (loadingSpinner) loadingSpinner.style.display = 'none';
    }

    /**
     * Show error state
     * @param {string} message - Error message
     */
    showError(message) {
        this.hideLoading();
        const errorMessage = document.getElementById('errorMessage');
        const postsContainer = document.getElementById('postsContainer');
        
        if (errorMessage) {
            errorMessage.innerHTML = `
                <h2>오류가 발생했습니다</h2>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="location.reload()">다시 시도</button>
            `;
            errorMessage.style.display = 'block';
        }
        
        if (postsContainer) postsContainer.innerHTML = '';
    }

    /**
     * Show empty state
     */
    showEmptyState() {
        const postsContainer = document.getElementById('postsContainer');
        if (!postsContainer) return;

        let message = '포스트가 없습니다.';
        
        if (this.currentQuery) {
            message = `"${this.currentQuery}"에 대한 검색 결과가 없습니다.`;
        } else if (this.currentTag) {
            message = `"${this.currentTag}" 태그의 포스트가 없습니다.`;
        }

        postsContainer.innerHTML = `
            <div class="empty-state">
                <h3>${message}</h3>
                <p>다른 검색어나 태그를 시도해보세요.</p>
                ${this.currentQuery || this.currentTag ? 
                    '<button class="btn btn-secondary" onclick="app.clearFilters()">필터 초기화</button>' : 
                    '<a href="editor.html" class="btn btn-primary">첫 번째 포스트 작성하기</a>'
                }
            </div>
        `;
    }

    /**
     * Clear all filters
     */
    clearFilters() {
        this.currentTag = '';
        this.currentQuery = '';
        
        // Update URL
        const url = new URL(window.location);
        url.searchParams.delete('tag');
        url.searchParams.delete('q');
        window.history.replaceState({}, '', url);
        
        // Update search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = '';
        
        // Re-filter and render
        this.filterPosts();
        this.renderPage();
    }

    /**
     * Update page title based on current filters
     */
    updatePageTitle() {
        let title = CONFIG.BLOG_TITLE;
        
        if (this.currentTag) {
            title = `${this.currentTag} - ${CONFIG.BLOG_TITLE}`;
        } else if (this.currentQuery) {
            title = `"${this.currentQuery}" 검색 결과 - ${CONFIG.BLOG_TITLE}`;
        }
        
        document.title = title;
    }

    /**
     * Refresh posts data
     */
    async refreshPosts() {
        this.showLoading();
        
        try {
            await window.SheetsAPI.refreshPosts();
            await this.loadPosts();
            this.renderPage();
            showToast('포스트가 새로고침되었습니다', 'success');
        } catch (error) {
            console.error('❌ Refresh error:', error);
            this.showError('포스트를 새로고침하는데 실패했습니다.');
        }
    }

    /**
     * Show blog statistics (for debugging)
     */
    showStats() {
        const stats = window.SheetsAPI.getPostsStats(this.allPosts);
        console.table(stats);
        
        showToast(`총 ${stats.totalPosts}개 포스트, ${stats.totalTags}개 태그`, 'info');
    }
}

// Initialize blog app
let app = null;

document.addEventListener('DOMContentLoaded', () => {
    app = new BlogApp();
});

// Export for global use
if (typeof window !== 'undefined') {
    window.BlogApp = BlogApp;
    window.app = app;
}

// Add some additional utility functions for the blog
function refreshBlog() {
    if (app) {
        app.refreshPosts();
    }
}

function clearBlogCache() {
    clearCache();
    if (app) {
        app.refreshPosts();
    }
}

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + R: Refresh posts
    if ((e.ctrlKey || e.metaKey) && e.key === 'r' && e.shiftKey) {
        e.preventDefault();
        refreshBlog();
    }
    
    // Escape: Clear search and filters
    if (e.key === 'Escape') {
        if (app && (app.currentQuery || app.currentTag)) {
            app.clearFilters();
        }
    }
    
    // /: Focus search
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.focus();
        }
    }
});