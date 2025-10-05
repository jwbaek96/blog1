// Utility functions for the blog

/**
 * Debounce function to limit function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Execute immediately
 * @returns {Function}
 */
function debounce(func, wait, immediate) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func(...args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func(...args);
    };
}

/**
 * Throttle function to limit function calls
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function}
 */
function throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Format date to Korean format
 * @param {string|Date} dateInput - Date string or Date object
 * @returns {string} Formatted date string
 */
function formatDate(dateInput) {
    try {
        const date = new Date(dateInput);
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
            return dateInput; // Return original if invalid
        }
        
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        // If less than 7 days, show relative time
        if (diffDays === 0) {
            const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
            if (diffHours === 0) {
                const diffMinutes = Math.floor(diffTime / (1000 * 60));
                return diffMinutes <= 1 ? '방금 전' : `${diffMinutes}분 전`;
            }
            return `${diffHours}시간 전`;
        } else if (diffDays === 1) {
            return '어제';
        } else if (diffDays < 7) {
            return `${diffDays}일 전`;
        }
        
        // Otherwise show formatted date
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (error) {
        console.error('Date formatting error:', error);
        return dateInput;
    }
}

/**
 * Sanitize HTML to prevent XSS
 * @param {string} html - HTML string to sanitize
 * @returns {string} Sanitized HTML
 */
function sanitizeHTML(html) {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
}

/**
 * Create excerpt from HTML content
 * @param {string} html - HTML content
 * @param {number} maxLength - Maximum length of excerpt
 * @returns {string} Text excerpt
 */
function createExcerpt(html, maxLength = 150) {
    try {
        // Remove HTML tags
        const div = document.createElement('div');
        div.innerHTML = html;
        const text = div.textContent || div.innerText || '';
        
        // Trim and truncate
        const trimmed = text.trim();
        if (trimmed.length <= maxLength) {
            return trimmed;
        }
        
        // Find last complete word within limit
        const truncated = trimmed.substring(0, maxLength);
        const lastSpace = truncated.lastIndexOf(' ');
        
        if (lastSpace > 0) {
            return truncated.substring(0, lastSpace) + '...';
        }
        
        return truncated + '...';
    } catch (error) {
        console.error('Excerpt creation error:', error);
        return '';
    }
}

/**
 * Parse CSV data into array of objects
 * @param {string} csvText - CSV text data
 * @returns {Array} Array of objects
 */
function parseCSV(csvText) {
    try {
        const lines = csvText.split('\n').filter(line => line.trim());
        if (lines.length < 2) return [];
        
        const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''));
        const data = [];
        
        for (let i = 1; i < lines.length; i++) {
            const values = [];
            let current = '';
            let inQuotes = false;
            
            for (let j = 0; j < lines[i].length; j++) {
                const char = lines[i][j];
                
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    values.push(current.trim().replace(/"/g, ''));
                    current = '';
                } else {
                    current += char;
                }
            }
            
            // Push the last value
            values.push(current.trim().replace(/"/g, ''));
            
            // Create object from headers and values
            const obj = {};
            headers.forEach((header, index) => {
                obj[header] = values[index] || '';
            });
            
            data.push(obj);
        }
        
        return data;
    } catch (error) {
        console.error('CSV parsing error:', error);
        return [];
    }
}

/**
 * Show toast notification
 * @param {string} message - Message to show
 * @param {string} type - Type of toast (success, error, info, warning)
 * @param {number} duration - Duration in milliseconds
 */
function showToast(message, type = 'info', duration = CONFIG.TOAST_DURATION) {
    const container = document.getElementById('toastContainer') || createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = getToastIcon(type);
    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Auto remove
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }
    }, duration);
    
    // Click to dismiss
    toast.addEventListener('click', () => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    });
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

function getToastIcon(type) {
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    return icons[type] || icons.info;
}

/**
 * Get or set cache data
 * @param {string} key - Cache key
 * @param {*} data - Data to cache (optional)
 * @param {number} duration - Cache duration in milliseconds
 * @returns {*} Cached data or null
 */
function cache(key, data = null, duration = CONFIG.CACHE_DURATION) {
    try {
        if (data !== null) {
            // Set cache
            const cacheData = {
                data: data,
                timestamp: Date.now(),
                duration: duration
            };
            localStorage.setItem(key, JSON.stringify(cacheData));
            return data;
        } else {
            // Get cache
            const cached = localStorage.getItem(key);
            if (!cached) return null;
            
            const cacheData = JSON.parse(cached);
            const now = Date.now();
            
            if (now - cacheData.timestamp > cacheData.duration) {
                localStorage.removeItem(key);
                return null;
            }
            
            return cacheData.data;
        }
    } catch (error) {
        console.error('Cache error:', error);
        return null;
    }
}

/**
 * Clear all cache
 */
function clearCache() {
    try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.includes('blog_') || key.includes('cache')) {
                localStorage.removeItem(key);
            }
        });
        showToast('캐시가 삭제되었습니다', 'success');
    } catch (error) {
        console.error('Cache clear error:', error);
        showToast('캐시 삭제 중 오류가 발생했습니다', 'error');
    }
}

/**
 * Get URL parameters
 * @param {string} param - Parameter name
 * @returns {string|null} Parameter value
 */
function getUrlParameter(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

/**
 * Set URL parameter without page reload
 * @param {string} param - Parameter name
 * @param {string} value - Parameter value
 */
function setUrlParameter(param, value) {
    const url = new URL(window.location);
    if (value) {
        url.searchParams.set(param, value);
    } else {
        url.searchParams.delete(param);
    }
    window.history.replaceState({}, '', url);
}

/**
 * Scroll to element smoothly
 * @param {string|Element} element - Element selector or element
 * @param {number} offset - Offset from top
 */
function scrollToElement(element, offset = 80) {
    try {
        const target = typeof element === 'string' ? document.querySelector(element) : element;
        if (!target) return;
        
        const elementPosition = target.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;
        
        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    } catch (error) {
        console.error('Scroll error:', error);
    }
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
async function copyToClipboard(text) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            const success = document.execCommand('copy');
            document.body.removeChild(textArea);
            return success;
        }
    } catch (error) {
        console.error('Clipboard error:', error);
        return false;
    }
}

/**
 * Load external script dynamically
 * @param {string} src - Script source URL
 * @returns {Promise} Promise that resolves when script loads
 */
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

/**
 * Dark mode utilities
 */
const DarkMode = {
    init() {
        const saved = localStorage.getItem('darkMode');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isDark = saved ? saved === 'true' : systemPrefersDark;
        
        this.set(isDark);
        this.setupToggle();
        this.watchSystemChange();
    },
    
    set(isDark) {
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        localStorage.setItem('darkMode', isDark.toString());
        
        const toggle = document.getElementById('darkModeToggle');
        if (toggle) {
            toggle.textContent = isDark ? '☀️' : '🌙';
            toggle.title = isDark ? '라이트 모드로 전환' : '다크 모드로 전환';
        }
    },
    
    toggle() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        this.set(!isDark);
    },
    
    setupToggle() {
        const toggle = document.getElementById('darkModeToggle');
        if (toggle) {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggle();
            });
        }
    },
    
    watchSystemChange() {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            // Only auto-switch if user hasn't manually set preference
            if (!localStorage.getItem('darkMode')) {
                this.set(e.matches);
            }
        });
    }
};

/**
 * Initialize utilities
 */
function initUtils() {
    if (CONFIG.FEATURES.DARK_MODE) {
        DarkMode.init();
    }
}

// Auto-initialize on DOM ready
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initUtils);
    } else {
        initUtils();
    }
}

// Export for use in other files
if (typeof window !== 'undefined') {
    window.Utils = {
        debounce,
        throttle,
        formatDate,
        sanitizeHTML,
        createExcerpt,
        parseCSV,
        showToast,
        cache,
        clearCache,
        getUrlParameter,
        setUrlParameter,
        scrollToElement,
        copyToClipboard,
        loadScript,
        DarkMode
    };
}