// Configuration file for Google Sheets Blog

// 환경 감지
const isLocal = window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               window.location.hostname === '';

const CONFIG = {
    // API URLs - 환경에 따라 다르게 설정
    APPS_SCRIPT_URL: isLocal ? null : '/api/sheets', // 로컬에서는 나중에 .env에서 로드
    UPLOAD_API_URL: isLocal ? null : '/api/sheets',  // 배포환경에서는 Vercel API Routes 사용
    
    // Google Sheets
    GOOGLE_SHEET_ID: '1X9uL2ZmuaHTc4kl8Z6C63fJ8lb99_LDP4CVqSoP2FqY', // 실제 Google 스프레드시트 ID
    GOOGLE_SHEET_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRXRuG3cRUqGABTludaX-ddVgqUCsfJ0EV37n3IifaAbREUxSqa4rJYp64evCH15v9hC8O-YSNMtPMc/pub?output=csv', // 실제 공개된 시트 CSV URL
    
    // Google Drive Settings
    GOOGLE_DRIVE_FOLDER_ID: '1gei84cTcsgRheWIyhGuqPLX4DZcXTJkb', // "Blog Data" 폴더 ID - 위에서 복사한 폴더 ID로 교체
    GOOGLE_DRIVE_API_KEY: 'AIzaSyAY4DHjJkDmVklkxXT3TXtorayCd3XPccI', // Google Drive API 키 - 위에서 생성한 API 키로 교체
    GOOGLE_API_KEY: 'AIzaSyAY4DHjJkDmVklkxXT3TXtorayCd3XPccI', // 테스트 파일 호환용 (GOOGLE_DRIVE_API_KEY와 동일)
    GOOGLE_CLIENT_ID: '201175895307-8au0ct74b8d78mlae58mdm7noddabjvm.apps.googleusercontent.com', // Google OAuth Client ID - 위에서 생성한 클라이언트 ID로 교체
    
    // Blog Settings
    BLOG_TITLE: 'JW.BAEK - Blog',
    BLOG_DESCRIPTION: 'JW.BAEK의 블로그 - 창작 과정과 예술적 탐구를 공유합니다.',
    BLOG_AUTHOR: 'Your Name',
    BLOG_URL: 'https://blog1-mu-two.vercel.app/',
    
    // Development Settings
    DEV_MODE: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
    DEV_PORT: 5500, // 로컬 개발 서버 포트
    
    // Local Admin Settings (로컬 개발용 - 실제 비밀번호로 변경하세요)
    LOCAL_ADMIN_KEY: '9632', // 로컬 개발용 관리자 비밀번호
    
    // Pagination
    POSTS_PER_PAGE: 10,
    
    // Cache Settings
    CACHE_DURATION: 1 * 60 * 1000, // 1분 (milliseconds)
    CACHE_KEY: 'blog_posts_cache',
    
    // Upload Settings
    MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB (Google Drive 용)
    MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB (이미지)
    MAX_VIDEO_SIZE: 100 * 1024 * 1024, // 100MB (비디오)
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov'],
    IMAGE_MAX_WIDTH: 1920, // 리사이즈 최대 너비
    IMAGE_QUALITY: 0.85, // JPEG 압축 품질
    
    // Google Drive Upload Settings
    DRIVE_FOLDER_STRUCTURE: {
        ROOT_FOLDER: 'Blog Data',
        USE_DATE_FOLDERS: true, // 연도/월별 폴더 생성 여부
        THUMBNAIL_FOLDER: 'thumbnails',
        TEMP_FOLDER: 'temp'
    },
    
    // OAuth Scopes for Google Drive
    GOOGLE_DRIVE_API_SCOPE: 'https://www.googleapis.com/auth/drive.file', // 파일 업로드 및 관리 권한
    GOOGLE_SCOPES: ['https://www.googleapis.com/auth/drive.file'], // 배열 형태 (드라이브 업로더용)
    
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

// 환경변수 초기화 함수
async function initializeConfig() {
    if (isLocal) {
        // 로컬 환경: .env 파일에서 환경변수 로드
        try {
            const response = await fetch('/.env');
            if (response.ok) {
                const envText = await response.text();
                const envLines = envText.split('\n');
                
                envLines.forEach(line => {
                    line = line.trim();
                    if (line && !line.startsWith('#') && line.includes('=')) {
                        const [key, ...valueParts] = line.split('=');
                        const value = valueParts.join('=').trim();
                        
                        // GOOGLE_API를 우선으로 확인 (Vercel 환경변수명과 일치)
                        if (key.trim() === 'GOOGLE_API') {
                            CONFIG.APPS_SCRIPT_URL = value;
                            CONFIG.UPLOAD_API_URL = value;
                        }
                        if (key.trim() === 'APPS_SCRIPT_URL') {
                            CONFIG.APPS_SCRIPT_URL = value;
                        }
                        if (key.trim() === 'UPLOAD_API_URL') {
                            CONFIG.UPLOAD_API_URL = value;
                        }
                    }
                });
            } else {
                // .env 파일이 없으면 기본값 사용
                CONFIG.APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwFtHyW15uKbJWygQFFuKLA6rTs8Ph9bfYazcKgfz8gz8tWpGAKXHhpiuHNaDafKj8O/exec';
                CONFIG.UPLOAD_API_URL = 'https://script.google.com/macros/s/AKfycbwFtHyW15uKbJWygQFFuKLA6rTs8Ph9bfYazcKgfz8gz8tWpGAKXHhpiuHNaDafKj8O/exec';
            }
        } catch (error) {
            console.warn('환경변수 로드 실패, 기본값 사용:', error);
            CONFIG.APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwFtHyW15uKbJWygQFFuKLA6rTs8Ph9bfYazcKgfz8gz8tWpGAKXHhpiuHNaDafKj8O/exec';
            CONFIG.UPLOAD_API_URL = 'https://script.google.com/macros/s/AKfycbwFtHyW15uKbJWygQFFuKLA6rTs8Ph9bfYazcKgfz8gz8tWpGAKXHhpiuHNaDafKj8O/exec';
        }
    }
    
    // 설정 검증
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
}

// Auto-initialize on load
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', initializeConfig);
}

// Make CONFIG available globally
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}