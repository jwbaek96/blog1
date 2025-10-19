// Configuration file for Google Sheets Blog

// 환경 감지
const isLocal = window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               window.location.hostname === '';

const CONFIG = {
    // API URLs - 환경에 따라 다르게 설정 (config.local.json에서 로드됨)
    APPS_SCRIPT_URL: isLocal ? null : '/api/sheets', // 로컬에서는 config.local.json에서 로드
    UPLOAD_API_URL: isLocal ? null : '/api/sheets',  // 배포환경에서는 Vercel API Routes 사용
    
    // Google Sheets (공개된 시트는 노출되어도 상관없음)
    GOOGLE_SHEET_ID: '1X9uL2ZmuaHTc4kl8Z6C63fJ8lb99_LDP4CVqSoP2FqY', // 공개된 Google 스프레드시트 ID
    GOOGLE_SHEET_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRXRuG3cRUqGABTludaX-ddVgqUCsfJ0EV37n3IifaAbREUxSqa4rJYp64evCH15v9hC8O-YSNMtPMc/pub?output=csv', // 공개된 시트 CSV URL
    
    // Google Drive Settings (config.local.json에서 로드됨)
    GOOGLE_DRIVE_FOLDER_ID: null, // config.local.json에서 로드
    GOOGLE_DRIVE_API_KEY: null, // config.local.json에서 로드  
    GOOGLE_API_KEY: null, // config.local.json에서 로드
    GOOGLE_CLIENT_ID: null, // config.local.json에서 로드
    
    // Blog Settings
    BLOG_TITLE: 'JW.BAEK - Blog',
    BLOG_DESCRIPTION: 'JW.BAEK의 블로그 - 창작 과정과 예술적 탐구를 공유합니다.',
    BLOG_AUTHOR: 'Your Name',
    BLOG_URL: 'https://jwbaek.kr/',
    
    // Development Settings
    DEV_MODE: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
    DEV_PORT: 5500, // 로컬 개발 서버 포트
    
    // Local Admin Settings (config.local.json에서 로드됨)
    LOCAL_ADMIN_KEY: null, // config.local.json에서 로드
    
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

// URL 마스킹 함수 (민감한 정보 보호)
function maskSensitiveUrl(url) {
    if (!url) return 'Not set';
    if (url.startsWith('/api/')) return url; // Vercel API는 안전
    if (url.includes('script.google.com')) {
        // Google Apps Script URL은 마스킹
        const parts = url.split('/');
        if (parts.length >= 6) {
            parts[5] = parts[5].substring(0, 8) + '...' + parts[5].substring(parts[5].length - 4);
        }
        return parts.join('/');
    }
    return url;
}

// 환경변수 초기화 함수
async function initializeConfig() {
    if (isLocal) {
        // 로컬 환경: config.local.json에서 설정 로드
        try {
            const response = await fetch('/config.local.json');
            if (response.ok) {
                const localConfig = await response.json();
                
                // 로컬 설정으로 CONFIG 업데이트
                if (localConfig.APPS_SCRIPT_URL) {
                    CONFIG.APPS_SCRIPT_URL = localConfig.APPS_SCRIPT_URL;
                }
                if (localConfig.UPLOAD_API_URL) {
                    CONFIG.UPLOAD_API_URL = localConfig.UPLOAD_API_URL;
                }
                if (localConfig.LOCAL_ADMIN_KEY) {
                    CONFIG.LOCAL_ADMIN_KEY = localConfig.LOCAL_ADMIN_KEY;
                }
                if (localConfig.GOOGLE_DRIVE_FOLDER_ID) {
                    CONFIG.GOOGLE_DRIVE_FOLDER_ID = localConfig.GOOGLE_DRIVE_FOLDER_ID;
                }
                if (localConfig.GOOGLE_DRIVE_API_KEY) {
                    CONFIG.GOOGLE_DRIVE_API_KEY = localConfig.GOOGLE_DRIVE_API_KEY;
                    CONFIG.GOOGLE_API_KEY = localConfig.GOOGLE_DRIVE_API_KEY;
                }
                if (localConfig.GOOGLE_CLIENT_ID) {
                    CONFIG.GOOGLE_CLIENT_ID = localConfig.GOOGLE_CLIENT_ID;
                }
                
                // 설정 로딩 완료 이벤트 발생
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('configLoaded', { detail: CONFIG }));
                }
            } else {
                // config.local.json 파일이 없으면 오류 표시
                console.error('❌ config.local.json 파일을 찾을 수 없습니다!');
                console.info('💡 config.local.json.example을 복사하여 config.local.json을 생성하세요.');
                
                // 오류 상태로도 이벤트 발생 (기본값 사용)
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('configLoaded', { detail: CONFIG }));
                }
            }
        } catch (error) {
            console.error('❌ 로컬 설정 파일 로드 실패:', error);
            console.info('💡 config.local.json.example을 복사하여 config.local.json을 생성하세요.');
            
            // 오류 상태로도 이벤트 발생 (기본값 사용)
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('configLoaded', { detail: CONFIG }));
            }
        }
    } else {
        // Vercel 환경: API 엔드포인트를 통해 환경변수 로드
        try {
            const response = await fetch('/api/config');
            if (response.ok) {
                const envConfig = await response.json();
                
                // Vercel 환경변수에서 설정 업데이트
                // 배포 환경에서는 항상 Vercel API Routes 사용 (직접 Google Apps Script 호출 금지)
                // CONFIG.APPS_SCRIPT_URL과 CONFIG.UPLOAD_API_URL은 '/api/sheets'로 고정
                // 실제 V_GOOGLE_APPSCRIPT_URL은 서버사이드에서만 사용
                if (envConfig.V_GOOGLE_DRIVE_FOLDER_ID) {
                    CONFIG.GOOGLE_DRIVE_FOLDER_ID = envConfig.V_GOOGLE_DRIVE_FOLDER_ID;
                }
                if (envConfig.V_GOOGLE_DRIVE_API_KEY) {
                    CONFIG.GOOGLE_DRIVE_API_KEY = envConfig.V_GOOGLE_DRIVE_API_KEY;
                }
                if (envConfig.V_GOOGLE_API_KEY) {
                    CONFIG.GOOGLE_API_KEY = envConfig.V_GOOGLE_API_KEY;
                }
                if (envConfig.V_GOOGLE_CLIENT_ID) {
                    CONFIG.GOOGLE_CLIENT_ID = envConfig.V_GOOGLE_CLIENT_ID;
                }

            }
        } catch (error) {
            console.warn('Vercel 환경변수 로드 실패, 기본값 사용:', error);
        }
        
        // Vercel 환경에서도 설정 로딩 완료 이벤트 발생
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('configLoaded', { detail: CONFIG }));
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