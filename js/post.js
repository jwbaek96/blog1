// Post detail page functionality

class PostApp {
    constructor() {
        this.post = null;
        this.allPosts = [];
        this.postId = null;
        this.isLoading = false;
        
        this.init();
    }

    /**
     * Initialize the post app
     */
    async init() {
        console.log('🚀 Initializing Post App...');
        
        // Get post ID from URL
        this.postId = getUrlParameter('id');
        
        if (!this.postId) {
            this.showError('포스트 ID가 없습니다.');
            return;
        }

        console.log('📋 Loading post ID:', this.postId);
        
        this.setupEventListeners();
        this.showLoading();
        
        try {
            await this.loadAllPosts();
            await this.loadPost();
            this.setupSocialSharing();
            this.loadRelatedPosts();
            this.setupNavigation();
        } catch (error) {
            console.error('❌ Post initialization error:', error);
            this.showError('포스트를 불러오는데 실패했습니다.');
        }
    }

    /**
     * Load all posts for navigation and related posts
     */
    async loadAllPosts() {
        try {
            console.log('📡 Fetching all posts...');
            this.allPosts = await window.SheetsAPI.fetchPosts();
            console.log(`✅ Loaded ${this.allPosts.length} posts`);
        } catch (error) {
            console.error('❌ Error loading all posts:', error);
            // Continue even if we can't load all posts
        }
    }

    /**
     * Load specific post
     */
    async loadPost() {
        try {
            console.log('🔍 Looking for post ID:', this.postId, '(type:', typeof this.postId, ')');
            console.log('🔍 Available posts:', this.allPosts.map(p => ({
                id: p.id, 
                idType: typeof p.id,
                title: p.title
            })));
            
            // Find post by ID (try both string and number comparison)
            this.post = this.allPosts.find(p => 
                String(p.id) === String(this.postId) || 
                parseInt(p.id) === parseInt(this.postId)
            );
            
            if (!this.post) {
                console.error('❌ Post not found for ID:', this.postId);
                console.error('❌ Available post IDs:', this.allPosts.map(p => p.id));
                this.showError('포스트를 찾을 수 없습니다.');
                return;
            }

            console.log('✅ Post found:', {
                id: this.post.id,
                title: this.post.title,
                contentLength: this.post.content ? this.post.content.length : 0
            });
            this.renderPost();
            this.hideLoading();
            
        } catch (error) {
            console.error('❌ Error loading post:', error);
            this.showError('포스트를 불러오는데 실패했습니다.');
        }
    }

    /**
     * Render post content
     */
    renderPost() {
        if (!this.post) return;

        // Update page title and meta tags
        this.updatePageMeta();

        // Show post content
        document.getElementById('postContent').style.display = 'block';

        // Render post header
        this.renderPostHeader();

        // Render post thumbnail
        this.renderPostThumbnail();

        // Render post content
        this.renderPostContent();

        console.log('✅ Post rendered successfully');
    }

    /**
     * Update page meta tags
     */
    updatePageMeta() {
        // Update title
        document.title = `${this.post.title} - JW.BAEK Blog`;

        // Update meta description
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
            metaDescription.content = this.post.excerpt || this.post.title;
        }

        // Update Open Graph tags
        const ogTitle = document.querySelector('meta[property="og:title"]');
        const ogDescription = document.querySelector('meta[property="og:description"]');
        const ogUrl = document.querySelector('meta[property="og:url"]');

        if (ogTitle) ogTitle.content = `${this.post.title} - JW.BAEK Blog`;
        if (ogDescription) ogDescription.content = this.post.excerpt || this.post.title;
        if (ogUrl) ogUrl.content = window.location.href;

        // Add og:image if post has thumbnail
        if (this.post.thumbnail) {
            let ogImage = document.querySelector('meta[property="og:image"]');
            if (!ogImage) {
                ogImage = document.createElement('meta');
                ogImage.setAttribute('property', 'og:image');
                document.head.appendChild(ogImage);
            }
            ogImage.content = this.post.thumbnail;
        }
    }

    /**
     * Render post header
     */
    renderPostHeader() {
        // Date
        const postDate = document.getElementById('postDate');
        if (postDate) {
            postDate.textContent = formatDate(this.post.date);
        }

        // Read time (estimate based on content length)
        // const postReadTime = document.getElementById('postReadTime');
        // if (postReadTime) {
        //     const readTime = this.estimateReadTime(this.post.content || this.post.excerpt);
        //     postReadTime.textContent = `${readTime}분 읽기`;
        // }

        // Title
        const postTitle = document.getElementById('postTitle');
        if (postTitle) {
            postTitle.textContent = this.post.title;
        }

        // Tags
        const postTags = document.getElementById('postTags');
        if (postTags && this.post.tags) {
            const tagsHTML = this.post.tags.map(tag => 
                `<a href="blog.html?tag=${encodeURIComponent(tag)}" class="post-tag">${tag}</a>`
            ).join('');
            postTags.innerHTML = tagsHTML;
        }
    }

    /**
     * Render post thumbnail
     */
    renderPostThumbnail() {
        const thumbnailContainer = document.getElementById('postThumbnail');
        const thumbnailImage = document.getElementById('thumbnailImage');

        if (this.post.thumbnail && thumbnailContainer && thumbnailImage) {
            thumbnailImage.src = this.post.thumbnail;
            thumbnailImage.alt = this.post.title;
            thumbnailContainer.style.display = 'block';
        }
    }

    /**
     * Render post content
     */
    renderPostContent() {
        const contentBody = document.getElementById('postContentBody');
        if (contentBody) {
            const content = this.post.content || this.post.excerpt;
            
            // HTML 콘텐츠인지 확인 (HTML 태그가 포함되어 있는지)
            if (content && content.includes('<')) {
                // HTML 콘텐츠는 그대로 렌더링
                contentBody.innerHTML = content;
                console.log('📄 Rendering HTML content directly');
            } else {
                // 플레인 텍스트는 처리해서 렌더링
                const processedContent = this.processContent(content);
                contentBody.innerHTML = processedContent;
                console.log('📄 Processing plain text content');
            }
        }
    }

    /**
     * Process content text to HTML (플레인 텍스트용)
     */
    processContent(content) {
        if (!content) return '';

        // Simple text processing - convert line breaks to paragraphs
        return content
            .split('\n\n')
            .map(paragraph => paragraph.trim())
            .filter(paragraph => paragraph.length > 0)
            .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
            .join('');
    }

    /**
     * Estimate reading time
     */
    // estimateReadTime(content) {
    //     if (!content) return 1;
        
    //     const wordsPerMinute = 200; // Average reading speed
    //     const wordCount = content.split(/\s+/).length;
    //     const readTime = Math.max(1, Math.ceil(wordCount / wordsPerMinute));
        
    //     return readTime;
    // }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Browser back/forward buttons
        window.addEventListener('popstate', () => {
            // If user navigates back, go to blog page
            window.location.href = 'blog.html';
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Escape: Go back to blog
            if (e.key === 'Escape') {
                window.location.href = 'blog.html';
            }
            
            // Arrow keys for navigation
            if (e.key === 'ArrowLeft') {
                this.navigateToPrevious();
            } else if (e.key === 'ArrowRight') {
                this.navigateToNext();
            }
        });
    }

    /**
     * Setup social sharing
     */
    setupSocialSharing() {
        if (!this.post) return;

        const url = window.location.href;
        const title = this.post.title;
        const text = this.post.excerpt || this.post.title;

        // Twitter share
        const shareTwitter = document.getElementById('shareTwitter');
        if (shareTwitter) {
            shareTwitter.addEventListener('click', () => {
                const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
                window.open(twitterUrl, '_blank', 'width=600,height=400');
            });
        }

        // Facebook share
        const shareFacebook = document.getElementById('shareFacebook');
        if (shareFacebook) {
            shareFacebook.addEventListener('click', () => {
                const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
                window.open(facebookUrl, '_blank', 'width=600,height=400');
            });
        }

        // Copy URL
        const copyUrl = document.getElementById('copyUrl');
        if (copyUrl) {
            copyUrl.addEventListener('click', async (e) => {
                try {
                    await navigator.clipboard.writeText(url);
                    
                    // Show tooltip popup
                    const tooltip = copyUrl.querySelector('.copied-tooltip');
                    if (tooltip) {
                        tooltip.classList.add('show');
                        
                        // Hide tooltip after 2 seconds
                        setTimeout(() => {
                            tooltip.classList.remove('show');
                        }, 2000);
                    }
                    
                    // Optional: Also show toast (you can remove this if you prefer only the tooltip)
                    // showToast('링크가 복사되었습니다', 'success');
                } catch (error) {
                    console.error('Failed to copy URL:', error);
                    showToast('링크 복사에 실패했습니다', 'error');
                }
            });
        }
    }

    /**
     * Load related posts
     */
    loadRelatedPosts() {
        if (!this.post || !this.allPosts || this.allPosts.length <= 1) return;

        // Find posts with similar tags
        const relatedPosts = this.findRelatedPosts();
        
        if (relatedPosts.length > 0) {
            this.renderRelatedPosts(relatedPosts);
        }
    }

    /**
     * Find related posts based on tags
     */
    findRelatedPosts() {
        const currentTags = this.post.tags || [];
        const otherPosts = this.allPosts.filter(p => String(p.id) !== String(this.postId));
        
        // Score posts based on common tags
        const scoredPosts = otherPosts.map(post => {
            const commonTags = currentTags.filter(tag => post.tags.includes(tag));
            return {
                post,
                score: commonTags.length
            };
        });

        // Sort by score and take top 3
        return scoredPosts
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 3)
            .map(item => item.post);
    }

    /**
     * Render related posts
     */
    renderRelatedPosts(relatedPosts) {
        const relatedPostsSection = document.getElementById('relatedPosts');
        const relatedPostsGrid = document.getElementById('relatedPostsGrid');

        if (!relatedPostsSection || !relatedPostsGrid) return;

        const postsHTML = relatedPosts.map(post => `
            <article class="related-post-card" onclick="navigateToPost('${post.id}')">
                ${post.thumbnail ? `
                    <div class="related-post-thumbnail">
                        <img src="${post.thumbnail}" alt="${post.title}" loading="lazy">
                    </div>
                ` : ''}
                <div class="related-post-content">
                    <h3 class="related-post-title">${post.title}</h3>
                    <p class="related-post-excerpt">${post.excerpt}</p>
                    <div class="related-post-meta">
                        <span class="related-post-date">${formatDate(post.date)}</span>
                    </div>
                </div>
            </article>
        `).join('');

        relatedPostsGrid.innerHTML = postsHTML;
        relatedPostsSection.style.display = 'block';
    }

    /**
     * Setup navigation between posts
     */
    setupNavigation() {
        if (!this.allPosts || this.allPosts.length <= 1) return;

        const currentIndex = this.allPosts.findIndex(p => String(p.id) === String(this.postId));
        
        if (currentIndex === -1) return;

        // Previous post
        if (currentIndex < this.allPosts.length - 1) {
            const prevPost = this.allPosts[currentIndex + 1];
            this.setupNavigationLink('prevPost', prevPost);
        }

        // Next post
        if (currentIndex > 0) {
            const nextPost = this.allPosts[currentIndex - 1];
            this.setupNavigationLink('nextPost', nextPost);
        }
    }

    /**
     * Setup navigation link
     */
    setupNavigationLink(elementId, post) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const titleElement = element.querySelector('.nav-title');
        if (titleElement) {
            titleElement.textContent = post.title;
        }

        element.href = `post.html?id=${post.id}`;
        element.style.display = 'block';
    }

    /**
     * Navigate to previous post
     */
    navigateToPrevious() {
        const prevPost = document.getElementById('prevPost');
        if (prevPost && prevPost.style.display !== 'none') {
            window.location.href = prevPost.href;
        }
    }

    /**
     * Navigate to next post
     */
    navigateToNext() {
        const nextPost = document.getElementById('nextPost');
        if (nextPost && nextPost.style.display !== 'none') {
            window.location.href = nextPost.href;
        }
    }

    /**
     * Show loading state
     */
    showLoading() {
        this.isLoading = true;
        const loadingState = document.getElementById('loadingState');
        const postContent = document.getElementById('postContent');
        const errorState = document.getElementById('errorState');
        
        if (loadingState) loadingState.style.display = 'flex';
        if (postContent) postContent.style.display = 'none';
        if (errorState) errorState.style.display = 'none';
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        this.isLoading = false;
        const loadingState = document.getElementById('loadingState');
        
        if (loadingState) loadingState.style.display = 'none';
    }

    /**
     * Show error state
     */
    showError(message) {
        this.hideLoading();
        const errorState = document.getElementById('errorState');
        const postContent = document.getElementById('postContent');
        
        if (errorState) {
            const errorContent = errorState.querySelector('.error-content p');
            if (errorContent) {
                errorContent.textContent = message;
            }
            errorState.style.display = 'flex';
        }
        
        if (postContent) postContent.style.display = 'none';
        
        // Update page title
        document.title = '포스트를 찾을 수 없습니다 - JW.BAEK Blog';
    }
}

// Global function for related post navigation
function navigateToPost(postId) {
    window.location.href = `post.html?id=${postId}`;
}

// Initialize post app
let postApp = null;

document.addEventListener('DOMContentLoaded', () => {
    postApp = new PostApp();
});

// Export for global use
if (typeof window !== 'undefined') {
    window.PostApp = PostApp;
    window.postApp = postApp;
}

// Add smooth scroll for back to top
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}