// Google Sheets integration for blog data

class SheetsAPI {
    constructor() {
        this.sheetUrl = CONFIG.GOOGLE_SHEET_URL;
        this.cacheKey = CONFIG.CACHE_KEY;
        this.cacheDuration = CONFIG.CACHE_DURATION;
    }

    /**
     * Fetch posts using Apps Script API (more reliable than CSV)
     * @returns {Promise<Array>} Array of posts
     */
    async fetchPosts() {
        try {
            console.log('🌐 Fetching posts from Apps Script API...');
            
            // Use Apps Script Web App URL with getPosts action
            const appsScriptUrl = `${CONFIG.APPS_SCRIPT_URL}?action=getPosts&t=${Date.now()}`;
            
            console.log('🔗 Apps Script URL:', appsScriptUrl);
            
            const response = await fetch(appsScriptUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                console.warn('⚠️ Apps Script failed, falling back to CSV method');
                return this.fetchPostsFromCSV();
            }
            
            const result = await response.json();
            
            console.log('📄 Apps Script response:', result);
            
            if (!result.success) {
                throw new Error(result.error || 'Apps Script returned error');
            }
            
            const posts = result.posts || [];
            
            // ID 순서로 정렬 (내림차순 - 최신 포스트 먼저)
            posts.sort((a, b) => parseInt(b.id) - parseInt(a.id));
            
            console.log(`✅ Fetched ${posts.length} posts from Apps Script API`);
            
            return posts;
            
        } catch (error) {
            console.error('❌ Apps Script fetch failed:', error);
            console.log('🔄 Falling back to CSV method...');
            return this.fetchPostsFromCSV();
        }
    }

    /**
     * Fallback method: Fetch posts from Google Sheets CSV (original method)
     * @returns {Promise<Array>} Array of posts
     */
    async fetchPostsFromCSV() {
        try {
            console.log('🌐 Fetching posts from Google Sheets CSV...');
            
            // Simple timestamp for cache busting
            const timestamp = Date.now();
            const urlWithTimestamp = `${this.sheetUrl}&t=${timestamp}`;
            
            console.log('🔗 CSV URL:', urlWithTimestamp);
            
            // Fetch from Google Sheets
            const response = await fetch(urlWithTimestamp);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const csvText = await response.text();
            
            console.log('📄 CSV response length:', csvText.length);
            console.log('📄 CSV first 200 chars:', csvText.substring(0, 200));
            
            if (!csvText.trim()) {
                throw new Error('Empty response from Google Sheets');
            }
            
            // Parse CSV data
            const rawData = parseCSV(csvText);
            
            // Debug: Show raw CSV data structure
            console.log('🔍 Raw CSV data sample:', rawData.slice(0, 2));
            console.log('🔍 CSV columns:', rawData.length > 0 ? Object.keys(rawData[0]) : 'No data');
            
            // Process and validate posts
            const posts = this.processPosts(rawData);
            
            console.log(`✅ Fetched ${posts.length} posts from CSV fallback`);
            return posts;
            
        } catch (error) {
            console.error('❌ Error fetching posts from CSV:', error);
            return [];
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
            .filter(post => post !== null) // null이 아닌 모든 포스트 표시
            .sort((a, b) => parseInt(b.id) - parseInt(a.id)); // ID 순서로 정렬 (내림차순 - 최신 포스트 먼저)
    }

    /**
     * Process individual post
     * @param {Object} row - Raw post data
     * @returns {Object|null} Processed post or null
     */
    processPost(row) {
        try {
            // Only skip completely empty rows or rows without ID
            if (!row.id || (!row.title && !row.content)) {
                console.warn('⚠️ Skipping empty post row:', row);
                return null;
            }

            // Debug: Show raw row data for problematic posts
            if (row.title === 'adfdasdf' || row.title === '모노') {
                console.log('🐛 Debug row data for:', row.title);
                console.log('🐛 Raw row:', row);
                console.log('🐛 Tags field:', row.tags);
                console.log('🐛 Content field:', row.content);
            }

            const post = {
                id: parseInt(row.id) || Date.now(),
                title: (row.title || '').trim() || 'Untitled',
                date: this.parseDate(row.date),
                author: (row.author || '').trim() || CONFIG.BLOG_AUTHOR,
                content: this.cleanContent(row.content || ''),
                excerpt: createExcerpt(row.content || '', 150),
                thumbnail: this.processImageUrl(row.thumbnail || ''),
                tags: this.processTags(row.tags || ''),
                images: this.processImages(row.images || ''),
                videos: this.processVideos(row.videos || ''),
                status: (row.status || '').toLowerCase() || 'draft',
                slug: this.generateSlug(row.title || 'untitled'),
                readTime: this.calculateReadTime(row.content || '')
            };

            // Debug: Show processed tags
            if (row.title === 'adfdasdf' || row.title === '모노') {
                console.log('🐛 Processed tags:', post.tags);
            }

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
     * Clean HTML content by removing excessive whitespace
     * @param {string} content - Raw HTML content
     * @returns {string} Cleaned HTML content
     */
    cleanContent(content) {
        if (!content) return '';
        
        let cleaned = content.trim();
        
        // Remove excessive whitespace between and within tags
        cleaned = cleaned.replace(/\s+/g, ' '); // Multiple spaces to single space
        cleaned = cleaned.replace(/>\s+</g, '><'); // Remove spaces between tags
        cleaned = cleaned.replace(/\s+>/g, '>'); // Remove trailing spaces before closing tags
        cleaned = cleaned.replace(/<\s+/g, '<'); // Remove leading spaces after opening tags
        
        // Clean up empty elements
        cleaned = cleaned.replace(/<(p|div|span)>\s*<\/(p|div|span)>/gi, '');
        cleaned = cleaned.replace(/<(p|div|span)>\s*<br\s*\/?>\s*<\/(p|div|span)>/gi, '');
        
        return cleaned;
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
        return await this.fetchPosts();
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