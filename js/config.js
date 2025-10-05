// Configuration file for Google Sheets Blog

const CONFIG = {
    // Google Apps Script
    APPS_SCRIPT_URL: 'YOUR_APPS_SCRIPT_DEPLOYMENT_URL_HERE',
    
    // Google Sheets
    GOOGLE_SHEET_ID: 'YOUR_GOOGLE_SHEET_ID_HERE',
    GOOGLE_SHEET_URL: 'https://docs.google.com/spreadsheets/d/YOUR_GOOGLE_SHEET_ID_HERE/export?format=csv',
    
    // Blog Settings
    BLOG_TITLE: 'My Google Sheets Blog',
    BLOG_DESCRIPTION: '구글 스프레드시트를 데이터베이스로 활용하는 블로그',
    BLOG_AUTHOR: 'Your Name',
    BLOG_URL: 'https://jwbaek96.github.io/blog1/',
    
    // Pagination
    POSTS_PER_PAGE: 6,
    
    // Cache Settings
    CACHE_DURATION: 5 * 60 * 1000, // 5분 (milliseconds)
    CACHE_KEY: 'blog_posts_cache',
    
    // Upload Settings
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm', 'video/ogg'],
    IMAGE_MAX_WIDTH: 1920, // 리사이즈 최대 너비
    IMAGE_QUALITY: 0.85, // JPEG 압축 품질
    
    // UI Settings
    TOAST_DURATION: 3000, // 3초
    LOADING_DELAY: 500, // 로딩 스피너 표시 지연
    
    // Feature Flags
    FEATURES: {
        DARK_MODE: true,
        COMMENTS: true,
        SEARCH: true,
        ANALYTICS: false
    },
    
    // Comments (Utterances)
    UTTERANCES: {
        REPO: 'jwbaek96/blog1', // GitHub repository for comments
        ISSUE_TERM: 'pathname',
        THEME: 'github-light',
        LABEL: '💬 comment'
    },
    
    // Google Analytics (선택사항)
    GA_TRACKING_ID: '', // 'G-XXXXXXXXXX'
    
    // Social Links (선택사항)
    SOCIAL_LINKS: {
        github: '',
        twitter: '',
        linkedin: '',
        email: ''
    }
};

// Validation function
function validateConfig() {
    const requiredFields = ['GOOGLE_SHEET_ID', 'APPS_SCRIPT_URL'];
    const missingFields = requiredFields.filter(field => !CONFIG[field] || CONFIG[field].includes('YOUR_'));
    
    if (missingFields.length > 0) {
        console.warn('⚠️ Configuration incomplete. Missing or not configured:', missingFields);
        console.info('📖 Please update js/config.js with your Google Sheets ID and Apps Script URL');
        return false;
    }
    
    return true;
}

// Auto-validate on load
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!validateConfig()) {
            // Show user-friendly message
            const banner = document.createElement('div');
            banner.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: #ff6b6b;
                color: white;
                padding: 10px;
                text-align: center;
                z-index: 9999;
                font-weight: 500;
            `;
            banner.innerHTML = '⚠️ 블로그 설정이 완료되지 않았습니다. js/config.js 파일을 확인해주세요.';
            document.body.prepend(banner);
            
            setTimeout(() => banner.remove(), 10000);
        }
    });
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}