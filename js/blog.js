// Blog main page functionality

class BlogApp {
    constructor() {
        this.posts = [];
        this.allPosts = [];
        this.currentPage = 1;
        this.postsPerPage = CONFIG.POSTS_PER_PAGE;
        this.currentTag = getUrlParameter('tag') || '';
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
            console.log('📡 Fetching posts from Google Sheets...');
            this.allPosts = await window.SheetsAPI.fetchPosts();
            this.filterPosts();
            console.log(`✅ Loaded ${this.allPosts.length} posts`);
            
            // Debug: Show first few posts
            if (this.allPosts.length > 0) {
                console.log('📋 Loaded posts:', this.allPosts.slice(0, 3).map(p => ({
                    id: p.id,
                    title: p.title,
                    idType: typeof p.id
                })));
            } else {
                console.warn('⚠️ No posts loaded! Check Google Sheets configuration.');
            }
        } catch (error) {
            console.error('❌ Error loading posts:', error);
            console.log('⚠️ Failed to load posts. Please check your Google Sheets configuration.');
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

        this.posts = filteredPosts;
        this.currentPage = 1; // Reset to first page
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Browser back/forward buttons
        window.addEventListener('popstate', (e) => {
            this.currentTag = getUrlParameter('tag') || '';
            this.filterPosts();
            this.renderPage();
        });
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
            // post.tags가 배열인지 확인
            if (Array.isArray(post.tags)) {
                post.tags.forEach(tag => {
                    counts[tag] = (counts[tag] || 0) + 1;
                });
            }
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

        // Add post click handlers
        this.setupPostClickHandlers();

        // Add lazy loading for images
        this.setupLazyLoading();
    }

    /**
     * Setup post click handlers
     */
    setupPostClickHandlers() {
        const postCards = document.querySelectorAll('.post-card');
        postCards.forEach(card => {
            card.addEventListener('click', (e) => {
                const postId = card.dataset.postId;
                this.openPostDetail(postId);
            });
        });
    }

    /**
     * Open post detail in new page
     * @param {string} postId - Post ID
     */
    async openPostDetail(postId) {
        try {
            console.log('🔍 Opening post ID:', postId);
            
            const post = this.allPosts.find(p => p.id === postId || String(p.id) === String(postId));
            if (!post) {
                console.error('❌ Post not found:', postId);
                showToast('포스트를 찾을 수 없습니다', 'error');
                return;
            }

            console.log('✅ Navigating to post:', post.title);
            // Navigate to post.html with post ID
            window.location.href = `post.html?id=${encodeURIComponent(postId)}`;
            
        } catch (error) {
            console.error('❌ Error opening post:', error);
            showToast('포스트를 불러오는데 실패했습니다', 'error');
        }
    }



    /**
     * Render individual post card
     * @param {Object} post - Post object
     * @returns {string} HTML string
     */
    renderPostCard(post) {
        const hasThumbnail = post.thumbnail && post.thumbnail.trim() !== '';
        
        // post.tags가 배열인지 확인하고 안전하게 처리
        const tags = Array.isArray(post.tags) ? post.tags : [];
        const tagsHTML = tags.map(tag => 
            `<a href="?tag=${encodeURIComponent(tag)}" class="post-tag" onclick="event.stopPropagation()">${tag}</a>`
        ).join('');

        if (hasThumbnail) {
            // 썸네일이 있는 경우: 배경 이미지 카드
            return `
                <article class="post-card post-card-with-image" data-post-id="${post.id}" style="background-image: url('${post.thumbnail}')">
                    <div class="post-card-overlay">
                        <div class="post-card-content">
                            <div class="post-card-meta">
                                <span class="post-date">${formatDate(post.date)}</span>
                            </div>
                            
                            <h2 class="post-card-title">
                                ${post.title}
                            </h2>
                            
                            <p class="post-card-excerpt">${post.excerpt}</p>
                            
                            <div class="post-card-tags">
                                ${tagsHTML}
                            </div>
                        </div>
                    </div>
                </article>
            `;
        } else {
            // 썸네일이 없는 경우: 기본 카드
            return `
                <article class="post-card post-card-no-image" data-post-id="${post.id}">
                    <div class="post-card-content">
                        <div class="post-card-tags">
                            ${tagsHTML}
                        </div>
                        
                        <h2 class="post-card-title">
                        ${post.title}
                        </h2>
                        <p class="post-card-excerpt">${post.excerpt}</p>
                        <div class="post-card-meta">
                            <span class="post-date">${formatDate(post.date)}</span>
                        </div>
                        
                        
                    </div>
                </article>
                `;
            }
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
        
        if (this.currentTag) {
            message = `"${this.currentTag}" 태그의 포스트가 없습니다.`;
        }

        postsContainer.innerHTML = `
            <div class="empty-state">
                <h3>${message}</h3>
                <p>다른 검색어나 태그를 시도해보세요.</p>
                ${this.currentTag ? 
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
        
        // Update URL
        const url = new URL(window.location);
        url.searchParams.delete('tag');
        window.history.replaceState({}, '', url);
        
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
    
    // Escape: Clear filters
    if (e.key === 'Escape') {
        if (app && app.currentTag) {
            app.clearFilters();
        }
    }
});