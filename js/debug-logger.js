/**
 * 디버그 로그 관리 시스템
 * 프로덕션/개발 환경에 따라 로그 출력을 제어합니다.
 */

// 환경 감지 (로컬 개발 환경인지 확인)
const isDevelopment = () => {
    return location.hostname === 'localhost' || 
           location.hostname === '127.0.0.1' || 
           location.port || 
           location.protocol === 'file:';
};

// 글로벌 디버그 설정
window.DEBUG_CONFIG = {
    enabled: isDevelopment(),
    categories: {
        general: true,      // 일반적인 로그
        api: true,         // API 호출 관련
        editor: true,      // 에디터 관련
        tags: true,        // 태그 시스템
        comments: true,    // 댓글 시스템
        auth: true,        // 인증 관련
        upload: true,      // 파일 업로드
        pwa: false,        // PWA 관련 (보통 끔)
        performance: false  // 성능 관련 (상세 로그)
    }
};

// 디버그 로거 함수들
window.debugLog = {
    // 일반 로그
    log: (category, message, ...args) => {
        if (window.DEBUG_CONFIG.enabled && window.DEBUG_CONFIG.categories[category]) {
            console.log(`[${category.toUpperCase()}] ${message}`, ...args);
        }
    },
    
    // 에러 로그 (항상 출력)
    error: (category, message, ...args) => {
        console.error(`[${category.toUpperCase()}] ${message}`, ...args);
    },
    
    // 경고 로그 (항상 출력)
    warn: (category, message, ...args) => {
        console.warn(`[${category.toUpperCase()}] ${message}`, ...args);
    },
    
    // 성공 로그
    success: (category, message, ...args) => {
        if (window.DEBUG_CONFIG.enabled && window.DEBUG_CONFIG.categories[category]) {
            console.log(`[${category.toUpperCase()}] ✅ ${message}`, ...args);
        }
    },
    
    // API 관련 로그
    api: (message, ...args) => {
        if (window.DEBUG_CONFIG.enabled && window.DEBUG_CONFIG.categories.api) {
            console.log(`[API] ${message}`, ...args);
        }
    },
    
    // 에디터 관련 로그
    editor: (message, ...args) => {
        if (window.DEBUG_CONFIG.enabled && window.DEBUG_CONFIG.categories.editor) {
            console.log(`[EDITOR] ${message}`, ...args);
        }
    },
    
    // 태그 관련 로그
    tags: (message, ...args) => {
        if (window.DEBUG_CONFIG.enabled && window.DEBUG_CONFIG.categories.tags) {
            console.log(`[TAGS] ${message}`, ...args);
        }
    }
};

// 프로덕션 환경에서 디버그 모드 토글 함수
window.toggleDebug = (category = null) => {
    if (category) {
        window.DEBUG_CONFIG.categories[category] = !window.DEBUG_CONFIG.categories[category];
        console.log(`Debug ${category}: ${window.DEBUG_CONFIG.categories[category] ? 'enabled' : 'disabled'}`);
    } else {
        window.DEBUG_CONFIG.enabled = !window.DEBUG_CONFIG.enabled;
        console.log(`Debug mode: ${window.DEBUG_CONFIG.enabled ? 'enabled' : 'disabled'}`);
    }
};

// 현재 환경 정보 출력
if (window.DEBUG_CONFIG.enabled) {
    console.log('🔧 Development mode detected - Debug logs enabled');
    console.log('📋 Available debug categories:', Object.keys(window.DEBUG_CONFIG.categories));
    console.log('💡 Use window.toggleDebug("category") to toggle specific logs');
} else {
    console.log('🚀 Production mode - Debug logs disabled');
    console.log('💡 Use window.toggleDebug() to enable debug mode');
}