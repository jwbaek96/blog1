// artwork page functionality - filters posts with 'artwork' tag

class artworkApp {
    constructor() {
        this.posts = [];
        this.allPosts = [];
        this.currentPage = 1;
        this.postsPerPage = CONFIG.POSTS_PER_PAGE;
        this.currentTag = getUrlParameter('tag') || '';
        this.isLoading = false;
        
        // artwork-specific filter
        this.artworkFilter = 'artwork';
        
        this.init();
    }

    /**
     * Initialize the artwork app
     */
    async init() {
        console.log('🚀 Initializing artwork App...');
        
        this.setupEventListeners();
        this.showLoading();
        
        try {
            await this.loadPosts();
            this.renderPage();
        } catch (error) {
            console.error('❌ artwork initialization error:', error);
            this.showError('아트워크을 초기화하는데 실패했습니다.');
        }
    }

    /**
     * Load posts from Google Sheets and filter for artworks
     */
    async loadPosts() {
        try {
            const allPostsFromSheets = await window.SheetsAPI.fetchPosts();
            
            // Filter for posts that have 'artwork' tag
            this.allPosts = allPostsFromSheets.filter(post => {
                return post.tags && post.tags.some(tag => 
                    tag.toLowerCase().includes(this.artworkFilter.toLowerCase())
                );
            });
            
            this.filterPosts();
        } catch (error) {
            console.error('❌ Error loading artwork posts:', error);
            console.log('⚠️ Failed to load artworks. Please check your Google Sheets configuration.');
        }
    }

    /**
     * Filter posts based on current filters (excluding the base 'artwork' filter)
     */
    filterPosts() {
        let filteredPosts = [...this.allPosts];

        // Filter by additional tag (if selected)
        if (this.currentTag && this.currentTag !== this.artworkFilter) {
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
     * Render tag filters (excluding the base 'artwork' tag)
     */
    renderTagFilters() {
        const tagFiltersContainer = document.getElementById('tagFilters');
        if (!tagFiltersContainer) return;

        // Get all tags from artwork posts, excluding 'artwork' itself
        const allTags = window.SheetsAPI.getAllTags(this.allPosts).filter(tag => 
            tag.toLowerCase() !== this.artworkFilter.toLowerCase()
        );
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
     * Get tag counts (excluding 'artwork' tag)
     * @returns {Object} Tag counts
     */
    getTagCounts() {
        const counts = {};
        
        this.allPosts.forEach(post => {
            post.tags.forEach(tag => {
                if (tag.toLowerCase() !== this.artworkFilter.toLowerCase()) {
                    counts[tag] = (counts[tag] || 0) + 1;
                }
            });
        });

        return counts;
    }



    /**
     * Render posts
     */
    renderPosts() {
        const postsContainer = document.getElementById('postsContainer');
        const emptyMessage = document.getElementById('emptyMessage');
        
        if (!postsContainer) return;

        if (this.posts.length === 0) {
            this.showEmptyState();
            return;
        }

        // Hide empty message
        if (emptyMessage) emptyMessage.style.display = 'none';

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

            // 카드에서 마우스가 벗어나면 액션 메뉴 닫기
            card.addEventListener('mouseleave', (e) => {
                const postActions = card.querySelector('.post-actions');
                const postActionsMenu = card.querySelector('.post-actions-menu');
                
                if (postActions) postActions.classList.remove('active');
                if (postActionsMenu) postActionsMenu.classList.remove('active');
            });
        });

        // 액션 메뉴 외부 클릭 시 메뉴 닫기
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.post-actions')) {
                const activeMenus = document.querySelectorAll('.post-actions-menu.active');
                const activeActions = document.querySelectorAll('.post-actions.active');
                activeMenus.forEach(menu => menu.classList.remove('active'));
                activeActions.forEach(action => action.classList.remove('active'));
            }
        });
    }

    /**
     * Open post detail in new page
     * @param {string} postId - Post ID
     */
    async openPostDetail(postId) {
        try {
            console.log('🔍 Opening artwork post ID:', postId);
            
            const post = this.allPosts.find(p => p.id === postId || String(p.id) === String(postId));
            if (!post) {
                console.error('❌ artwork post not found:', postId);
                showToast('아트워크을 찾을 수 없습니다', 'error');
                return;
            }

            // Navigate to post.html with post ID
            window.location.href = `post.html?id=${encodeURIComponent(postId)}`;
            
        } catch (error) {
            console.error('❌ Error opening artwork:', error);
            showToast('아트워크을 불러오는데 실패했습니다', 'error');
        }
    }

    /**
     * Render individual post card
     * @param {Object} post - Post object
     * @returns {string} HTML string
     */
    renderPostCard(post) {
        const hasThumbnail = post.thumbnail && post.thumbnail.trim() !== '';
        
        // Filter out 'artwork' tag from display
        const displayTags = post.tags.filter(tag => 
            tag.toLowerCase() !== this.artworkFilter.toLowerCase()
        );
        
        const tagsHTML = displayTags.map(tag => 
            `<a href="?tag=${encodeURIComponent(tag)}" class="post-tag" onclick="event.stopPropagation()">${tag}</a>`
        ).join('');

        // 더보기 버튼과 액션 메뉴 HTML (로그인 상태에서만 표시)
        const isLoggedIn = window.AuthManager && window.AuthManager.isLoggedIn();
        const actionsHTML = isLoggedIn ? `
            <div class="post-actions">
                <button class="post-more-btn" onclick="event.stopPropagation(); this.parentElement.classList.toggle('active'); this.parentElement.querySelector('.post-actions-menu').classList.toggle('active')">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="1"></circle>
                        <circle cx="12" cy="5" r="1"></circle>
                        <circle cx="12" cy="19" r="1"></circle>
                    </svg>
                </button>
                <div class="post-actions-menu">
                    <button class="post-action-btn edit-btn" onclick="event.stopPropagation(); app.editPost('${post.id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="m18 2 4 4-14 14H4v-4L18 2z"></path>
                        </svg>
                        수정
                    </button>
                    <button class="post-action-btn delete-btn" onclick="event.stopPropagation(); app.deletePost('${post.id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3,6 5,6 21,6"></polyline>
                            <path d="m19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1 2-2h4a2,2 0 0,1 2,2v2"></path>
                        </svg>
                        삭제
                    </button>
                </div>
            </div>
        ` : '';

        if (hasThumbnail) {
            // 썸네일이 있는 경우: 배경 이미지 카드
            return `
                <artwork class="post-card post-card-with-image" data-post-id="${post.id}" style="background-image: url('${post.thumbnail}')">
                    ${actionsHTML}
                    <div class="post-card-overlay">
                        <div class="post-card-content">
                            <div class="post-card-meta">
                                <span class="post-date">${formatDate(post.date)}</span>
                                <span class="post-type">artwork</span>
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
                </artwork>
            `;
        } else {
            // 썸네일이 없는 경우: 기본 카드
            return `
                <artwork class="post-card post-card-no-image" data-post-id="${post.id}">
                    ${actionsHTML}
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
                </artwork>
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
        const emptyMessage = document.getElementById('emptyMessage');
        
        if (!postsContainer) return;

        // Hide posts container and show empty message
        postsContainer.innerHTML = '';
        
        if (emptyMessage) {
            emptyMessage.style.display = 'block';
        }

        let message = '게시물이 없습니다.';
        
        if (this.currentTag) {
            message = `"${this.currentTag}" 태그의 아트워크이 없습니다.`;
        }

        if (postsContainer) {
            postsContainer.innerHTML = `
                <div class="empty-state">
                    <h3>${message}</h3>
                    ${this.currentTag ? 
                        '<button class="btn btn-secondary" onclick="app.clearFilters()">필터 초기화</button>' : 
                        '<a href="blog.html" class="btn btn-primary">블로그 둘러보기</a>'
                    }
                </div>
            `;
        }
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
        let title = 'Artwork - ' + CONFIG.BLOG_TITLE;
        
        if (this.currentTag) {
            title = `${this.currentTag} Artwork - ${CONFIG.BLOG_TITLE}`;
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
            showToast('아트워크이 새로고침되었습니다', 'success');
        } catch (error) {
            console.error('❌ Refresh error:', error);
            this.showError('아트워크을 새로고침하는데 실패했습니다.');
        }
    }

    /**
     * Edit post
     * @param {string} postId - Post ID to edit
     */
    editPost(postId) {
        console.log('✏️ Editing artwork post:', postId);
        
        // 인증 확인
        if (!window.AuthManager || !window.AuthManager.isLoggedIn()) {
            showToast('수정하려면 로그인이 필요합니다', 'error');
            return;
        }
        
        // 에디터 페이지로 이동 (수정 모드)
        window.location.href = `editor.html?edit=${encodeURIComponent(postId)}`;
    }

    /**
     * Delete post
     * @param {string} postId - Post ID to delete
     */
    async deletePost(postId) {
        console.log('🗑️ Deleting artwork post:', postId);
        
        // 인증 확인
        if (!window.AuthManager || !window.AuthManager.isLoggedIn()) {
            showToast('삭제하려면 로그인이 필요합니다', 'error');
            return;
        }
        
        const post = this.allPosts.find(p => p.id === postId || String(p.id) === String(postId));
        if (!post) {
            showToast('아트워크을 찾을 수 없습니다', 'error');
            return;
        }
        
        // 확인 다이얼로그
        const confirmed = confirm(`"${post.title}" 아트워크을 정말 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`);
        if (!confirmed) {
            return;
        }
        
        try {
            // 로딩 상태 표시
            showToast('아트워크을 삭제하는 중...', 'info');
            
            // Google Sheets에서 삭제
            await window.SheetsAPI.deletePost(postId);
            
            // 로컬 데이터에서 제거
            this.allPosts = this.allPosts.filter(p => p.id !== postId && String(p.id) !== String(postId));
            this.filterPosts();
            this.renderPage();
            
            showToast('아트워크이 삭제되었습니다', 'success');
            
        } catch (error) {
            console.error('❌ Delete error:', error);
            showToast('아트워크 삭제에 실패했습니다', 'error');
        }
    }

    /**
     * Refresh post cards when login state changes
     */
    refreshPostCards() {
        this.renderPosts();
    }

    /**
     * Show artwork statistics (for debugging)
     */
    showStats() {
        const stats = window.SheetsAPI.getPostsStats(this.allPosts);
        console.table(stats);
        
        showToast(`총 ${stats.totalPosts}개 아트워크, ${stats.totalTags}개 태그`, 'info');
    }
}

// Initialize artwork app
let app = null;

document.addEventListener('DOMContentLoaded', () => {
    app = new artworkApp();
});

// Export for global use
if (typeof window !== 'undefined') {
    window.artworkApp = artworkApp;
    window.app = app;
}

// Add some additional utility functions for the artwork page
function refreshartworks() {
    if (app) {
        app.refreshPosts();
    }
}

function clearartworkCache() {
    clearCache();
    if (app) {
        app.refreshPosts();
    }
}

function refreshartworkCards() {
    if (app) {
        app.refreshPostCards();
    }
}

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + R: Refresh artworks
    if ((e.ctrlKey || e.metaKey) && e.key === 'r' && e.shiftKey) {
        e.preventDefault();
        refreshartworks();
    }
    
    // Escape: Clear filters
    if (e.key === 'Escape') {
        if (app && app.currentTag) {
            app.clearFilters();
        }
    }
});