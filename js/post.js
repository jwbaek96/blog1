// Post detail page functionality

class PostPage {
    constructor() {
        this.postId = getUrlParameter('id');
        this.post = null;
        this.allPosts = [];
        this.adjacentPosts = { prev: null, next: null };
        
        this.init();
    }

    /**
     * Initialize the post page
     */
    async init() {
        console.log('📄 Initializing Post Page...');
        
        if (!this.postId) {
            this.showError('포스트 ID가 제공되지 않았습니다.');
            return;
        }

        this.showLoading();
        
        try {
            await this.loadPost();
            this.renderPost();
            this.setupComments();
            this.setupPageNavigation();
        } catch (error) {
            console.error('❌ Post page initialization error:', error);
            this.showError('포스트를 불러오는데 실패했습니다.');
        }
    }

    /**
     * Load post data
     */
    async loadPost() {
        try {
            // Load all posts first
            this.allPosts = await window.SheetsAPI.fetchPosts();
            
            // Find the specific post
            this.post = window.SheetsAPI.getPostById(this.allPosts, this.postId);
            
            if (!this.post) {
                throw new Error('포스트를 찾을 수 없습니다');
            }

            // Get adjacent posts for navigation
            this.adjacentPosts = window.SheetsAPI.getAdjacentPosts(this.allPosts, this.postId);
            
            console.log('✅ Post loaded:', this.post.title);
        } catch (error) {
            console.error('❌ Error loading post:', error);
            throw error;
        }
    }

    /**
     * Render the post
     */
    renderPost() {
        this.hideLoading();
        
        this.updatePageMeta();
        this.renderPostHeader();
        this.renderPostThumbnail();
        this.renderPostContent();
        this.renderPostNavigation();
        
        // Add scroll progress indicator
        this.setupScrollProgress();
        
        // Setup copy link functionality
        this.setupCopyLink();
    }

    /**
     * Update page meta information
     */
    updatePageMeta() {
        // Update page title
        document.title = `${this.post.title} - ${CONFIG.BLOG_TITLE}`;
        
        // Update meta description
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            metaDesc.content = this.post.excerpt;
        }
        
        // Update meta keywords
        const metaKeywords = document.querySelector('meta[name="keywords"]');
        if (metaKeywords) {
            metaKeywords.content = this.post.tags.join(', ');
        }
        
        // Update Open Graph meta tags
        this.updateOpenGraphMeta();
    }

    /**
     * Update Open Graph meta tags
     */
    updateOpenGraphMeta() {
        const ogTitle = document.querySelector('meta[property="og:title"]');
        const ogDesc = document.querySelector('meta[property="og:description"]');
        const ogUrl = document.querySelector('meta[property="og:url"]');
        const ogImage = document.querySelector('meta[property="og:image"]');
        
        if (ogTitle) ogTitle.content = this.post.title;
        if (ogDesc) ogDesc.content = this.post.excerpt;
        if (ogUrl) ogUrl.content = window.location.href;
        if (ogImage && this.post.thumbnail) ogImage.content = this.post.thumbnail;
    }

    /**
     * Render post header
     */
    renderPostHeader() {
        const postTitle = document.getElementById('postTitle');
        const postDate = document.getElementById('postDate');
        const postAuthor = document.getElementById('postAuthor');
        const postTags = document.getElementById('postTags');

        if (postTitle) {
            postTitle.textContent = this.post.title;
        }

        if (postDate) {
            postDate.textContent = formatDate(this.post.date);
        }

        if (postAuthor) {
            postAuthor.textContent = this.post.author;
        }

        if (postTags) {
            const tagsHTML = this.post.tags.map(tag => 
                `<a href="/?tag=${encodeURIComponent(tag)}" class="post-tag">${tag}</a>`
            ).join('');
            postTags.innerHTML = tagsHTML;
        }
    }

    /**
     * Render post thumbnail
     */
    renderPostThumbnail() {
        const thumbnailContainer = document.getElementById('postThumbnail');
        
        if (thumbnailContainer && this.post.thumbnail) {
            thumbnailContainer.innerHTML = `
                <img src="${this.post.thumbnail}" 
                     alt="${this.post.title}" 
                     loading="lazy">
            `;
        } else if (thumbnailContainer) {
            thumbnailContainer.style.display = 'none';
        }
    }

    /**
     * Render post content
     */
    renderPostContent() {
        const postContent = document.getElementById('postContent');
        
        if (postContent) {
            postContent.innerHTML = this.post.content;
            
            // Process content after rendering
            this.processPostContent(postContent);
        }
    }

    /**
     * Process post content (links, images, etc.)
     */
    processPostContent(contentElement) {
        // Make external links open in new tab
        const links = contentElement.querySelectorAll('a[href^="http"]');
        links.forEach(link => {
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
        });

        // Add loading="lazy" to images
        const images = contentElement.querySelectorAll('img');
        images.forEach(img => {
            if (!img.hasAttribute('loading')) {
                img.loading = 'lazy';
            }
            
            // Add click to zoom functionality
            img.style.cursor = 'pointer';
            img.addEventListener('click', () => {
                this.showImageModal(img.src, img.alt);
            });
        });

        // Process code blocks for syntax highlighting (optional)
        this.processCodeBlocks(contentElement);
        
        // Setup table of contents if there are headings
        this.setupTableOfContents(contentElement);
    }

    /**
     * Process code blocks
     */
    processCodeBlocks(contentElement) {
        const codeBlocks = contentElement.querySelectorAll('pre code');
        codeBlocks.forEach(block => {
            // Add copy button
            const pre = block.parentElement;
            const copyBtn = document.createElement('button');
            copyBtn.className = 'code-copy-btn';
            copyBtn.textContent = '📋';
            copyBtn.title = '코드 복사';
            
            copyBtn.addEventListener('click', async () => {
                const success = await copyToClipboard(block.textContent);
                if (success) {
                    copyBtn.textContent = '✅';
                    setTimeout(() => {
                        copyBtn.textContent = '📋';
                    }, 2000);
                }
            });
            
            pre.style.position = 'relative';
            pre.appendChild(copyBtn);
        });
    }

    /**
     * Setup table of contents
     */
    setupTableOfContents(contentElement) {
        const headings = contentElement.querySelectorAll('h1, h2, h3, h4, h5, h6');
        
        if (headings.length < 3) return; // Don't show TOC for short posts
        
        const tocHTML = Array.from(headings).map((heading, index) => {
            const id = `heading-${index}`;
            heading.id = id;
            
            const level = parseInt(heading.tagName.charAt(1));
            const indent = '  '.repeat(level - 1);
            
            return `${indent}<a href="#${id}" class="toc-link toc-level-${level}">${heading.textContent}</a>`;
        }).join('\n');
        
        const tocContainer = document.createElement('div');
        tocContainer.className = 'table-of-contents';
        tocContainer.innerHTML = `
            <h3>목차</h3>
            <nav class="toc-nav">
                ${tocHTML}
            </nav>
        `;
        
        // Insert TOC after first paragraph or at the beginning
        const firstParagraph = contentElement.querySelector('p');
        if (firstParagraph) {
            firstParagraph.after(tocContainer);
        } else {
            contentElement.prepend(tocContainer);
        }
    }

    /**
     * Render post navigation
     */
    renderPostNavigation() {
        const prevPost = document.getElementById('prevPost');
        const nextPost = document.getElementById('nextPost');

        if (prevPost) {
            if (this.adjacentPosts.prev) {
                const prev = this.adjacentPosts.prev;
                prevPost.innerHTML = `
                    <span class="nav-label">이전 포스트</span>
                    <a href="post.html?id=${prev.id}" class="nav-title">${prev.title}</a>
                `;
            } else {
                prevPost.innerHTML = '';
            }
        }

        if (nextPost) {
            if (this.adjacentPosts.next) {
                const next = this.adjacentPosts.next;
                nextPost.innerHTML = `
                    <span class="nav-label">다음 포스트</span>
                    <a href="post.html?id=${next.id}" class="nav-title">${next.title}</a>
                `;
            } else {
                nextPost.innerHTML = '';
            }
        }
    }

    /**
     * Setup comments system (Utterances)
     */
    setupComments() {
        if (!CONFIG.FEATURES.COMMENTS) return;
        
        const commentsContainer = document.getElementById('utterancesComments');
        if (!commentsContainer) return;

        const script = document.createElement('script');
        script.src = 'https://utteranc.es/client.js';
        script.setAttribute('repo', CONFIG.UTTERANCES.REPO);
        script.setAttribute('issue-term', CONFIG.UTTERANCES.ISSUE_TERM);
        script.setAttribute('theme', CONFIG.UTTERANCES.THEME);
        script.setAttribute('label', CONFIG.UTTERANCES.LABEL);
        script.setAttribute('crossorigin', 'anonymous');
        script.async = true;

        commentsContainer.appendChild(script);
    }

    /**
     * Setup scroll progress indicator
     */
    setupScrollProgress() {
        // Create progress bar
        const progressBar = document.createElement('div');
        progressBar.className = 'scroll-progress';
        progressBar.innerHTML = '<div class="scroll-progress-fill"></div>';
        document.body.appendChild(progressBar);

        // Update progress on scroll
        const updateProgress = throttle(() => {
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight - windowHeight;
            const scrollTop = window.pageYOffset;
            const progress = (scrollTop / documentHeight) * 100;
            
            const progressFill = progressBar.querySelector('.scroll-progress-fill');
            if (progressFill) {
                progressFill.style.width = `${Math.min(100, Math.max(0, progress))}%`;
            }
        }, 16); // ~60fps

        window.addEventListener('scroll', updateProgress);
        updateProgress(); // Initial call
    }

    /**
     * Setup copy link functionality
     */
    setupCopyLink() {
        // Add floating action button for sharing
        const shareBtn = document.createElement('button');
        shareBtn.className = 'share-btn';
        shareBtn.innerHTML = '🔗';
        shareBtn.title = '링크 복사';
        
        shareBtn.addEventListener('click', async () => {
            const success = await copyToClipboard(window.location.href);
            if (success) {
                showToast('링크가 클립보드에 복사되었습니다', 'success');
                shareBtn.innerHTML = '✅';
                setTimeout(() => {
                    shareBtn.innerHTML = '🔗';
                }, 2000);
            } else {
                showToast('링크 복사에 실패했습니다', 'error');
            }
        });
        
        document.body.appendChild(shareBtn);
    }

    /**
     * Show image modal
     */
    showImageModal(src, alt) {
        const modal = document.createElement('div');
        modal.className = 'image-modal';
        modal.innerHTML = `
            <div class="image-modal-content">
                <img src="${src}" alt="${alt}">
                <button class="image-modal-close">&times;</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close modal events
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.classList.contains('image-modal-close')) {
                modal.remove();
            }
        });
        
        // Keyboard close
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleKeyDown);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
    }

    /**
     * Setup page navigation (keyboard shortcuts)
     */
    setupPageNavigation() {
        document.addEventListener('keydown', (e) => {
            // Left arrow: Previous post
            if (e.key === 'ArrowLeft' && this.adjacentPosts.prev) {
                window.location.href = `post.html?id=${this.adjacentPosts.prev.id}`;
            }
            
            // Right arrow: Next post
            if (e.key === 'ArrowRight' && this.adjacentPosts.next) {
                window.location.href = `post.html?id=${this.adjacentPosts.next.id}`;
            }
            
            // Escape: Back to home
            if (e.key === 'Escape') {
                window.location.href = '/';
            }
        });
    }

    /**
     * Show loading state
     */
    showLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
        }
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }

    /**
     * Show error state
     */
    showError(message) {
        this.hideLoading();
        
        const errorMessage = document.getElementById('errorMessage');
        if (errorMessage) {
            errorMessage.innerHTML = `
                <div class="container">
                    <h2>포스트를 찾을 수 없습니다</h2>
                    <p>${message}</p>
                    <a href="/" class="btn btn-primary">홈으로 돌아가기</a>
                </div>
            `;
            errorMessage.style.display = 'block';
        }
        
        // Hide main content
        const postArticle = document.querySelector('.post-article');
        if (postArticle) {
            postArticle.style.display = 'none';
        }
    }
}

// Initialize post page
let postPage = null;

document.addEventListener('DOMContentLoaded', () => {
    postPage = new PostPage();
});

// Export for global use
if (typeof window !== 'undefined') {
    window.PostPage = PostPage;
    window.postPage = postPage;
}

// Add custom CSS for post page features
const postPageStyles = `
    <style>
    .scroll-progress {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 4px;
        background: rgba(0, 0, 0, 0.1);
        z-index: 1000;
    }
    
    .scroll-progress-fill {
        height: 100%;
        background: var(--primary);
        transition: width 0.1s ease;
    }
    
    .share-btn {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: var(--primary);
        color: white;
        border: none;
        font-size: 20px;
        cursor: pointer;
        box-shadow: var(--box-shadow-lg);
        z-index: 999;
        transition: var(--transition);
    }
    
    .share-btn:hover {
        transform: scale(1.1);
        background: var(--primary-dark);
    }
    
    .code-copy-btn {
        position: absolute;
        top: 8px;
        right: 8px;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        border: none;
        border-radius: 4px;
        padding: 4px 8px;
        font-size: 12px;
        cursor: pointer;
        opacity: 0;
        transition: opacity 0.2s;
    }
    
    pre:hover .code-copy-btn {
        opacity: 1;
    }
    
    .table-of-contents {
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius);
        padding: var(--spacing-lg);
        margin: var(--spacing-xl) 0;
    }
    
    .table-of-contents h3 {
        margin-bottom: var(--spacing-md);
        color: var(--text-primary);
    }
    
    .toc-nav {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
    }
    
    .toc-link {
        color: var(--text-secondary);
        text-decoration: none;
        padding: var(--spacing-xs) 0;
        transition: var(--transition-fast);
    }
    
    .toc-link:hover {
        color: var(--primary);
    }
    
    .toc-level-1 { font-weight: var(--font-weight-semibold); }
    .toc-level-2 { padding-left: var(--spacing-md); }
    .toc-level-3 { padding-left: var(--spacing-lg); }
    .toc-level-4 { padding-left: var(--spacing-xl); }
    
    .image-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        z-index: 2000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: var(--spacing-lg);
    }
    
    .image-modal-content {
        position: relative;
        max-width: 90vw;
        max-height: 90vh;
    }
    
    .image-modal img {
        width: 100%;
        height: auto;
        max-width: 100%;
        max-height: 90vh;
        object-fit: contain;
    }
    
    .image-modal-close {
        position: absolute;
        top: -40px;
        right: -40px;
        background: none;
        border: none;
        color: white;
        font-size: 30px;
        cursor: pointer;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    @media (max-width: 768px) {
        .share-btn {
            bottom: 10px;
            right: 10px;
            width: 48px;
            height: 48px;
            font-size: 18px;
        }
        
        .table-of-contents {
            margin: var(--spacing-lg) 0;
            padding: var(--spacing-md);
        }
        
        .image-modal-close {
            top: 10px;
            right: 10px;
        }
    }
    </style>
`;

// Add styles to head
document.head.insertAdjacentHTML('beforeend', postPageStyles);