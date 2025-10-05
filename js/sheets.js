// Google Sheets integration for blog data

class SheetsAPI {
    constructor() {
        this.sheetUrl = CONFIG.GOOGLE_SHEET_URL;
        this.cacheKey = CONFIG.CACHE_KEY;
        this.cacheDuration = CONFIG.CACHE_DURATION;
    }

    /**
     * Fetch posts from Google Sheets
     * @param {boolean} useCache - Whether to use cached data
     * @returns {Promise<Array>} Array of posts
     */
    async fetchPosts(useCache = true) {
        try {
            // Try cache first
            if (useCache) {
                const cached = cache(this.cacheKey);
                if (cached) {
                    console.log('📦 Using cached posts data');
                    return cached;
                }
            }

            console.log('🌐 Fetching posts from Google Sheets...');
            
            // Fetch from Google Sheets
            const response = await fetch(this.sheetUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const csvText = await response.text();
            
            if (!csvText.trim()) {
                throw new Error('Empty response from Google Sheets');
            }
            
            // Parse CSV data
            const rawData = parseCSV(csvText);
            
            // Process and validate posts
            const posts = this.processPosts(rawData);
            
            // Cache the processed data
            cache(this.cacheKey, posts, this.cacheDuration);
            
            console.log(`✅ Fetched ${posts.length} posts from Google Sheets`);
            return posts;
            
        } catch (error) {
            console.error('❌ Error fetching posts:', error);
            
            // Try to return cached data as fallback
            const cached = cache(this.cacheKey);
            if (cached) {
                console.log('📦 Using stale cached data as fallback');
                showToast('최신 데이터를 불러오는데 실패했습니다. 캐시된 데이터를 표시합니다.', 'warning', 5000);
                return cached;
            }
            
            throw error;
        }
    }

    /**
     * Process raw CSV data into post objects
     * @param {Array} rawData - Raw CSV data
     * @returns {Array} Processed posts
     */
    processPosts(rawData) {
        return rawData
            .map(row => this.processPost(row))
            .filter(post => post && post.status === 'published')
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    /**
     * Process individual post
     * @param {Object} row - Raw post data
     * @returns {Object|null} Processed post or null
     */
    processPost(row) {
        try {
            // Validate required fields
            if (!row.title || !row.content) {
                console.warn('⚠️ Skipping post with missing title or content:', row);
                return null;
            }

            const post = {
                id: parseInt(row.id) || Date.now(),
                title: row.title.trim(),
                date: this.parseDate(row.date),
                author: row.author?.trim() || CONFIG.BLOG_AUTHOR,
                content: row.content.trim(),
                excerpt: createExcerpt(row.content, 150),
                thumbnail: this.processImageUrl(row.thumbnail),
                tags: this.processTags(row.tags),
                images: this.processImages(row.images),
                videos: this.processVideos(row.videos),
                status: row.status?.toLowerCase() || 'published',
                slug: this.generateSlug(row.title),
                readTime: this.calculateReadTime(row.content)
            };

            return post;
        } catch (error) {
            console.error('❌ Error processing post:', row, error);
            return null;
        }
    }

    /**
     * Parse date string
     * @param {string} dateStr - Date string
     * @returns {Date} Parsed date
     */
    parseDate(dateStr) {
        if (!dateStr) return new Date();
        
        try {
            const date = new Date(dateStr);
            return isNaN(date.getTime()) ? new Date() : date;
        } catch {
            return new Date();
        }
    }

    /**
     * Process tags string into array
     * @param {string} tagsStr - Comma-separated tags
     * @returns {Array} Array of tags
     */
    processTags(tagsStr) {
        if (!tagsStr) return [];
        
        return tagsStr
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0)
            .map(tag => tag.toLowerCase());
    }

    /**
     * Process image URLs
     * @param {string} imagesStr - Comma-separated image URLs
     * @returns {Array} Array of image URLs
     */
    processImages(imagesStr) {
        if (!imagesStr) return [];
        
        return imagesStr
            .split(',')
            .map(url => this.processImageUrl(url.trim()))
            .filter(url => url);
    }

    /**
     * Process video URLs
     * @param {string} videosStr - Comma-separated video URLs
     * @returns {Array} Array of video URLs
     */
    processVideos(videosStr) {
        if (!videosStr) return [];
        
        return videosStr
            .split(',')
            .map(url => url.trim())
            .filter(url => url);
    }

    /**
     * Process Google Drive image URL
     * @param {string} url - Raw image URL
     * @returns {string} Processed image URL
     */
    processImageUrl(url) {
        if (!url) return '';
        
        url = url.trim();
        
        // If it's already a direct Google Drive URL, return as is
        if (url.includes('drive.google.com/uc?')) {
            return url;
        }
        
        // Extract file ID from various Google Drive URL formats
        let fileId = null;
        
        // Format: https://drive.google.com/file/d/FILE_ID/view
        let match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (match) {
            fileId = match[1];
        }
        
        // Format: https://drive.google.com/open?id=FILE_ID
        if (!fileId) {
            match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
            if (match) {
                fileId = match[1];
            }
        }
        
        // If we found a file ID, create direct access URL
        if (fileId) {
            return `https://drive.google.com/uc?export=view&id=${fileId}`;
        }
        
        // Return original URL if it's not a Google Drive URL
        return url;
    }

    /**
     * Generate URL slug from title
     * @param {string} title - Post title
     * @returns {string} URL slug
     */
    generateSlug(title) {
        return title
            .toLowerCase()
            .replace(/[^\w\s-]/g, '') // Remove special characters
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .trim();
    }

    /**
     * Calculate estimated read time
     * @param {string} content - Post content HTML
     * @returns {number} Read time in minutes
     */
    calculateReadTime(content) {
        try {
            // Remove HTML tags
            const div = document.createElement('div');
            div.innerHTML = content;
            const text = div.textContent || div.innerText || '';
            
            // Average reading speed: 200 words per minute (Korean)
            const wordsPerMinute = 200;
            const wordCount = text.trim().split(/\s+/).length;
            const readTime = Math.ceil(wordCount / wordsPerMinute);
            
            return Math.max(1, readTime); // Minimum 1 minute
        } catch {
            return 1;
        }
    }

    /**
     * Get all unique tags from posts
     * @param {Array} posts - Array of posts
     * @returns {Array} Array of unique tags
     */
    getAllTags(posts) {
        const tagSet = new Set();
        
        posts.forEach(post => {
            post.tags.forEach(tag => tagSet.add(tag));
        });
        
        return Array.from(tagSet).sort();
    }

    /**
     * Filter posts by tag
     * @param {Array} posts - Array of posts
     * @param {string} tag - Tag to filter by
     * @returns {Array} Filtered posts
     */
    filterByTag(posts, tag) {
        if (!tag) return posts;
        
        return posts.filter(post => 
            post.tags.includes(tag.toLowerCase())
        );
    }

    /**
     * Search posts by query
     * @param {Array} posts - Array of posts
     * @param {string} query - Search query
     * @returns {Array} Filtered posts
     */
    searchPosts(posts, query) {
        if (!query || query.trim().length === 0) return posts;
        
        const searchTerm = query.toLowerCase().trim();
        
        return posts.filter(post => {
            return (
                post.title.toLowerCase().includes(searchTerm) ||
                post.excerpt.toLowerCase().includes(searchTerm) ||
                post.tags.some(tag => tag.includes(searchTerm)) ||
                post.author.toLowerCase().includes(searchTerm)
            );
        });
    }

    /**
     * Get post by ID
     * @param {Array} posts - Array of posts
     * @param {number} id - Post ID
     * @returns {Object|null} Post object or null
     */
    getPostById(posts, id) {
        return posts.find(post => post.id === parseInt(id)) || null;
    }

    /**
     * Get adjacent posts (previous and next)
     * @param {Array} posts - Array of posts
     * @param {number} currentId - Current post ID
     * @returns {Object} Object with prev and next posts
     */
    getAdjacentPosts(posts, currentId) {
        const currentIndex = posts.findIndex(post => post.id === parseInt(currentId));
        
        if (currentIndex === -1) {
            return { prev: null, next: null };
        }
        
        return {
            prev: currentIndex < posts.length - 1 ? posts[currentIndex + 1] : null,
            next: currentIndex > 0 ? posts[currentIndex - 1] : null
        };
    }

    /**
     * Refresh posts data (bypass cache)
     * @returns {Promise<Array>} Fresh posts data
     */
    async refreshPosts() {
        console.log('🔄 Refreshing posts data...');
        
        // Clear cache
        localStorage.removeItem(this.cacheKey);
        
        // Fetch fresh data
        return await this.fetchPosts(false);
    }

    /**
     * Get posts statistics  
     * @param {Array} posts - Array of posts
     * @returns {Object} Statistics object
     */
    getPostsStats(posts) {
        const totalPosts = posts.length;
        const totalTags = this.getAllTags(posts).length;
        const avgReadTime = posts.reduce((sum, post) => sum + post.readTime, 0) / totalPosts;
        
        const postsByMonth = posts.reduce((acc, post) => {
            const month = post.date.toISOString().substring(0, 7); // YYYY-MM
            acc[month] = (acc[month] || 0) + 1;
            return acc;
        }, {});
        
        return {
            totalPosts,
            totalTags,
            avgReadTime: Math.round(avgReadTime),
            postsByMonth,
            latestPost: posts[0]?.date,
            oldestPost: posts[posts.length - 1]?.date
        };
    }
}

// Create global instance
const sheetsAPI = new SheetsAPI();

// Export for use in other files
if (typeof window !== 'undefined') {
    window.SheetsAPI = sheetsAPI;
}