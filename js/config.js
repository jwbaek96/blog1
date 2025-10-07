// Configuration file for Google Sheets Blog

const CONFIG = {
    // Google Apps Script
    APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbymxh5fEG3A1M9Ty0vaCoEUEgIUq0AXYE-WtPVwXQcwnR65AvrvATIiSuh2h0GLGCvC/exec', // Apps Script Web App URL (GET/POST 요청용)
    UPLOAD_API_URL: 'https://script.google.com/macros/s/AKfycbymxh5fEG3A1M9Ty0vaCoEUEgIUq0AXYE-WtPVwXQcwnR65AvrvATIiSuh2h0GLGCvC/exec', // 실제 Apps Script 배포 URL
    
    // Google Sheets
    GOOGLE_SHEET_ID: '1X9uL2ZmuaHTc4kl8Z6C63fJ8lb99_LDP4CVqSoP2FqY', // 실제 Google 스프레드시트 ID
    GOOGLE_SHEET_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRXRuG3cRUqGABTludaX-ddVgqUCsfJ0EV37n3IifaAbREUxSqa4rJYp64evCH15v9hC8O-YSNMtPMc/pub?output=csv', // 실제 공개된 시트 CSV URL
    
    // Blog Settings
    BLOG_TITLE: 'My Google Sheets Blog',
    BLOG_DESCRIPTION: '구글 스프레드시트를 데이터베이스로 활용하는 블로그',
    BLOG_AUTHOR: 'Your Name',
    BLOG_URL: 'https://jwbaek96.github.io/blog1/',
    
    // Development Settings
    DEV_MODE: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
    DEV_PORT: 5500, // 로컬 개발 서버 포트
    
    // Pagination
    POSTS_PER_PAGE: 10,
    
    // Cache Settings
    CACHE_DURATION: 1 * 60 * 1000, // 1분 (milliseconds)
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
    const requiredFields = ['GOOGLE_SHEET_ID', 'UPLOAD_API_URL'];
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
            
            setTimeout(() => banner.remove(), 1000);
        }
    });
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}