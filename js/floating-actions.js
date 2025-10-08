// Floating Action System JavaScript - Component Version

/**
 * Floating Action Component
 * 페이지에 방명록 기능이 포함된 플로팅 액션을 추가합니다.
 * 
 * 사용법:
 * HTML에 <script src="js/floating-actions.js"></script>만 추가하면 자동으로 생성됩니다.
 * 
 * 옵션으로 수동 초기화:
 * FloatingActions.init({ showEditor: true, showGuestbook: true });
 */

const FloatingActions = {
    // 기본 설정
    config: {
        showEditor: true,
        showGuestbook: true,
        autoInit: true
    },

    // HTML 템플릿 생성
    createHTML: function(options = {}) {
        const config = { ...this.config, ...options };
        
        let actionsHTML = '';
        let guestbookHTML = '';
        
        // 플로팅 액션 버튼들
        if (config.showGuestbook || config.showEditor) {
            actionsHTML = '<div class="floating-action-stack" id="floatingActionStack">';
            
            if (config.showGuestbook) {
                actionsHTML += `
                    <!-- Guestbook Button -->
                    <button class="floating-btn floating-guestbook-btn" onclick="FloatingActions.toggleGuestbook()" title="방명록">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                `;
            }
            
            if (config.showEditor) {
                actionsHTML += `
                    <!-- Write Button -->
                    <a href="editor.html" class="floating-btn floating-editor-btn" title="새 포스트 작성">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M12 5v14m-7-7h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </a>
                `;
            }
            
            actionsHTML += '</div>';
        }
        
        // 방명록 UI
        if (config.showGuestbook) {
            guestbookHTML = `
                <!-- Floating Guestbook -->
                <div class="floating-guestbook" id="floatingGuestbook">
                    <div class="guestbook-header">
                        <h3>방명록</h3>
                        <button class="guestbook-close" onclick="FloatingActions.toggleGuestbook()">✕</button>
                    </div>
                    
                    <div class="guestbook-content">
                        <div class="guestbook-entries" id="guestbookEntries">
                            <!-- 방명록 항목들이 여기에 표시됩니다 -->
                            <div class="guestbook-loading">
                                <div class="loading-spinner"></div>
                                <p>방명록을 불러오는 중...</p>
                            </div>
                        </div>
                        
                        <div class="guestbook-form">
                            <textarea placeholder="comment (기능 구현중...)" id="guestMessage" rows="2" required></textarea>
                            <div class="name-input-container">
                                <input type="text" placeholder="name" id="guestName" required />
                                <button class="guestbook-submit" onclick="FloatingActions.submitGuestbookEntry()">Send</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        return actionsHTML + guestbookHTML;
    },

    // 컴포넌트 초기화
    init: function(options = {}) {
        const config = { ...this.config, ...options };
        
        // HTML 생성 및 페이지에 추가
        const htmlContent = this.createHTML(config);
        document.body.insertAdjacentHTML('beforeend', htmlContent);
        
        // 이벤트 리스너 설정
        this.setupEventListeners();
        
        console.log('Floating Actions 컴포넌트가 초기화되었습니다.');
    },

    // 이벤트 리스너 설정
    setupEventListeners: function() {
        // 방명록 텍스트영역에 키보드 이벤트 추가
        const messageTextarea = document.getElementById('guestMessage');
        if (messageTextarea) {
            messageTextarea.addEventListener('keypress', this.handleGuestbookKeyPress.bind(this));
        }

        // ESC 키로 방명록 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const guestbook = document.getElementById('floatingGuestbook');
                if (guestbook && guestbook.classList.contains('active')) {
                    guestbook.classList.remove('active');
                }
            }
        });
    },

    // 방명록 토글
    toggleGuestbook: function() {
        const guestbook = document.getElementById('floatingGuestbook');
        const isVisible = guestbook.classList.contains('active');
        
        if (isVisible) {
            guestbook.classList.remove('active');
        } else {
            guestbook.classList.add('active');
            this.loadGuestbookEntries();
        }
    },

    // 방명록 항목 제출
    submitGuestbookEntry: function() {
        const name = document.getElementById('guestName').value.trim();
        const message = document.getElementById('guestMessage').value.trim();
        
        if (!name || !message) {
            alert('이름과 메시지를 모두 입력해주세요.');
            return;
        }
        
        // TODO: 구글 시트 연동 로직 추가 예정
        console.log('방명록 제출:', { name, message });
        
        // 임시로 폼 초기화
        document.getElementById('guestName').value = '';
        document.getElementById('guestMessage').value = '';
        
        alert('방명록이 등록되었습니다!');
        this.loadGuestbookEntries();
    },

    // 방명록 항목들 로드
    loadGuestbookEntries: function() {
        const entriesContainer = document.getElementById('guestbookEntries');
        
        // TODO: 구글 시트에서 데이터 로드 예정
        // 임시 데이터로 UI 테스트
        entriesContainer.innerHTML = `
            <div class="guestbook-entry">
                <div class="entry-header">
                    <span class="entry-name">김철수</span>
                    <span class="entry-date">2025-10-08</span>
                </div>
                <div class="entry-message">멋진 블로그네요! 앞으로도 좋은 글 부탁드립니다.</div>
            </div>
            <div class="guestbook-entry">
                <div class="entry-header">
                    <span class="entry-name">박영희</span>
                    <span class="entry-date">2025-10-07</span>
                </div>
                <div class="entry-message">작품이 정말 인상적이에요. 계속해서 응원하겠습니다!</div>
            </div>
        `;
    },

    // Enter 키로 방명록 제출
    handleGuestbookKeyPress: function(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.submitGuestbookEntry();
        }
    }
};

// 자동 초기화 (페이지 로드 후)
document.addEventListener('DOMContentLoaded', function() {
    if (FloatingActions.config.autoInit) {
        FloatingActions.init();
    }
});

// 호환성을 위한 전역 함수들 (기존 HTML에서 사용 중인 함수명)
function toggleGuestbook() {
    FloatingActions.toggleGuestbook();
}

function submitGuestbookEntry() {
    FloatingActions.submitGuestbookEntry();
}

function loadGuestbookEntries() {
    FloatingActions.loadGuestbookEntries();
}