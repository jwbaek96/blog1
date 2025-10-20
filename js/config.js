// Configuration file for Google Sheets Blog - Supabase Version

// Supabase 환경변수 로더
class SupabaseConfig {
    constructor() {
        // Supabase 퍼블릭 설정 (민감하지 않은 정보)
        this.supabaseUrl = 'https://mcdpmkipopgishxjpbvi.supabase.co';
        this.supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jZHBta2lwb3BnaXNoeGpwYnZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NDM1NDIsImV4cCI6MjA3NjUxOTU0Mn0.UyASY-e556o1qCs4INZOxpLjz1n1DC9erxOowImVkQ8';
        
        this.config = null;
        this.loading = false;
        this.supabaseClient = null;
    }

    // Supabase 클라이언트 초기화
    async initSupabase() {
        if (this.supabaseClient) {
            return this.supabaseClient;
        }

    if (typeof supabase === 'undefined') {
        await this.loadSupabaseSDK();
    }        this.supabaseClient = supabase.createClient(this.supabaseUrl, this.supabaseAnonKey);
        return this.supabaseClient;
    }

    // Supabase SDK 동적 로드
    async loadSupabaseSDK() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/@supabase/supabase-js@2';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // 환경변수 로드
    async loadConfig() {
        if (this.config) {
            return this.config;
        }

        if (this.loading) {
            // 이미 로딩 중이면 기다림
            while (this.loading) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            return this.config;
        }

        this.loading = true;

        try {
            const client = await this.initSupabase();
            
            const { data, error } = await client
                .from('env_variables')
                .select('name, value');

            if (error) {
                console.error('❌ Supabase 데이터 조회 실패:', error);
                throw error;
            }

            // 배열을 객체로 변환
            this.config = {};
            if (data && data.length > 0) {
                data.forEach(item => {
                    this.config[item.name] = item.value;
                });
            }

            return this.config;

        } catch (error) {
            console.error('Error loading config:', error);
            
            // 폴백: 기본 설정 사용
            this.config = {
                GOOGLE_APPS_SCRIPT_URL: '',
                SUPABASE_URL: this.supabaseUrl,
                SUPABASE_ANON_KEY: this.supabaseAnonKey
            };
            
            return this.config;
        } finally {
            this.loading = false;
        }
    }

    // 특정 환경변수 가져오기
    async get(key) {
        const config = await this.loadConfig();
        return config[key];
    }

    // 모든 환경변수 가져오기
    async getAll() {
        return await this.loadConfig();
    }

    // 설정 새로고침
    async refresh() {
        this.config = null;
        return await this.loadConfig();
    }
}

// 전역 Supabase 설정 인스턴스 (지연 초기화)
let supabaseConfigInstance = null;

function getSupabaseConfigInstance() {
    if (!supabaseConfigInstance) {
        supabaseConfigInstance = new SupabaseConfig();
        window.SupabaseConfigInstance = supabaseConfigInstance;
    }
    return supabaseConfigInstance;
}

// 환경 감지
const isLocal = window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               window.location.hostname === '';

const CONFIG = {
    // API URLs - 이제 정적 파일 또는 Supabase에서 로드
    APPS_SCRIPT_URL: null, // Supabase에서 로드됨
    UPLOAD_API_URL: null,  // Supabase에서 로드됨
    
    // Google Sheets (공개된 시트는 노출되어도 상관없음)
    GOOGLE_SHEET_ID: '1X9uL2ZmuaHTc4kl8Z6C63fJ8lb99_LDP4CVqSoP2FqY', // 공개된 Google 스프레드시트 ID
    GOOGLE_SHEET_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRXRuG3cRUqGABTludaX-ddVgqUCsfJ0EV37n3IifaAbREUxSqa4rJYp64evCH15v9hC8O-YSNMtPMc/pub?output=csv', // 공개된 시트 CSV URL
    
    // Google Drive Settings (Supabase에서 로드됨)
    GOOGLE_DRIVE_FOLDER_ID: null, // Supabase에서 로드
    GOOGLE_DRIVE_API_KEY: null, // Supabase에서 로드  
    GOOGLE_API_KEY: null, // Supabase에서 로드
    GOOGLE_CLIENT_ID: null, // Supabase에서 로드
    
    // Blog Settings
    BLOG_TITLE: 'JW.BAEK - Blog',
    BLOG_DESCRIPTION: 'JW.BAEK의 블로그 - 창작 과정과 예술적 탐구를 공유합니다.',
    BLOG_AUTHOR: 'Your Name',
    BLOG_URL: 'https://jwbaek.kr/',
    
    // Development Settings
    DEV_MODE: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
    DEV_PORT: 5500, // 로컬 개발 서버 포트
    
    // Local Admin Settings (Supabase에서 로드됨)
    LOCAL_ADMIN_KEY: null, // Supabase에서 로드
    
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
        console.warn('⚠️ Configuration incomplete:', missingFields);
        return false;
    }
    
    return true;
}

// 환경변수 초기화 함수 - Supabase 버전
async function initializeConfig() {
    try {
        // Supabase에서 환경변수 로드
        const supabaseConfigInstance = getSupabaseConfigInstance();
        const supabaseConfig = await supabaseConfigInstance.getAll();
        
        // Supabase 설정으로 CONFIG 업데이트
        if (supabaseConfig.GOOGLE_APPS_SCRIPT_URL) {
            CONFIG.APPS_SCRIPT_URL = supabaseConfig.GOOGLE_APPS_SCRIPT_URL;
        }
        
        if (supabaseConfig.ADMIN_KEY) {
            CONFIG.LOCAL_ADMIN_KEY = supabaseConfig.ADMIN_KEY;
        }
        
        if (supabaseConfig.GOOGLE_DRIVE_FOLDER_ID) {
            CONFIG.GOOGLE_DRIVE_FOLDER_ID = supabaseConfig.GOOGLE_DRIVE_FOLDER_ID;
        }
        
        if (supabaseConfig.GOOGLE_DRIVE_API_KEY) {
            CONFIG.GOOGLE_DRIVE_API_KEY = supabaseConfig.GOOGLE_DRIVE_API_KEY;
            CONFIG.GOOGLE_API_KEY = supabaseConfig.GOOGLE_DRIVE_API_KEY;
        }
        
        if (supabaseConfig.GOOGLE_CLIENT_ID) {
            CONFIG.GOOGLE_CLIENT_ID = supabaseConfig.GOOGLE_CLIENT_ID;
        }
        
        // 설정 로딩 완료 이벤트 발생
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('configLoaded', { detail: CONFIG }));
        }
        
    } catch (error) {
        console.error('❌ Supabase 설정 로드 실패:', error);
        
        // 오류 상태로도 이벤트 발생 (기본값 사용)
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
            display: none;
        `;
        banner.innerHTML = '⚠️ 블로그 설정이 완료되지 않았습니다.';
        document.body.prepend(banner);
        
        setTimeout(() => banner.remove(), 1000);
    }
}

// 편의 함수들
window.getConfig = async (key) => {
    const instance = getSupabaseConfigInstance();
    return await instance.get(key);
};

window.getAllConfig = async () => {
    const instance = getSupabaseConfigInstance();
    return await instance.getAll();
};

window.refreshConfig = async () => {
    const instance = getSupabaseConfigInstance();
    return await instance.refresh();
};

// Auto-initialize on load
if (typeof window !== 'undefined') {
    // 즉시 인스턴스 생성 (지연 초기화)
    window.SupabaseConfigInstance = getSupabaseConfigInstance();
    
    // DOM 로드 완료 후 설정 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeConfig);
    } else {
        // 이미 로드된 경우 즉시 실행
        setTimeout(initializeConfig, 100);
    }
}

// Make CONFIG available globally
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, SupabaseConfig };
}