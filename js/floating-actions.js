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
        showAuthorNote: true,
        autoInit: true
    },

    // 무한 스크롤 상태
    loadState: {
        offset: 0,
        limit: 10,
        hasMore: true,
        loading: false,
        allEntries: [],
        lastLoadTime: 0, // 마지막 로드 시간
        cooldownDuration: 1000 // 1초 쿨다운
    },

    // HTML 템플릿 생성
    createHTML: function(options = {}) {
        const config = { ...this.config, ...options };
        
        let actionsHTML = '';
        let guestbookHTML = '';
        
        // 플로팅 액션 버튼들
        if (config.showGuestbook || config.showEditor || config.showAuthorNote) {
            actionsHTML = '<div class="floating-action-stack" id="floatingActionStack">';
            
            // 작가노트 버튼 (첫 번째 위치) - config에 따라 조건부 표시
            if (config.showAuthorNote) {
                actionsHTML += `
                    <!-- Author Note Button -->
                    <button class="floating-btn floating-note-btn" onclick="FloatingActions.toggleAuthorNote()" title="작가노트">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="scale: 1.2;">
                            <path d="M12 16v-4M12 8h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <div class="note-notification-dot" id="noteNotificationDot" style="display: block;"></div>
                    </button>
                `;
            }
            
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
            
            // 에디터 버튼은 로그인된 경우에만 표시
            if (config.showEditor && this.isLoggedIn()) {
                actionsHTML += `
                    <!-- Write Button -->
                    <a href="editor.html" class="floating-btn floating-editor-btn" title="새 포스트 작성">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M12 5v14m-7-7h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </a>
                `;
            }
            
            // Scroll to Top 버튼은 항상 표시
            actionsHTML += `
                <!-- Scroll to Top Button -->
                <button class="floating-btn floating-scroll-top-btn" onclick="FloatingActions.scrollToTop()" title="맨 위로">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M18 15l-6-6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            `;
            
            actionsHTML += '</div>';
        }
        
        // 작가노트 UI - config에 따라 조건부 생성
        let authorNoteHTML = '';
        if (config.showAuthorNote) {
            authorNoteHTML = `
                <!-- Floating Author Note -->
                <div class="floating-guestbook floating-author-note" id="floatingAuthorNote">
                    <div class="guestbook-header">
                        <h3>Note.</h3>
                        <button class="guestbook-close" onclick="FloatingActions.toggleAuthorNote()">✕</button>
                    </div>
                    
                    <div class="guestbook-content">
                        <!-- 슬라이드 컨테이너 -->
                        <div class="author-note-slider" id="authorNoteSlider">
                            <div class="author-note-content" id="authorNoteContent">
                                <div class="guestbook-loading">
                                    <div class="loading-spinner"></div>
                                    <p>작가노트를 불러오는 중...</p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 슬라이드 네비게이션 (푸터 위치) -->
                        <div class="author-note-nav" id="authorNoteNav" style="display: none;">
                            <button class="note-nav-btn prev-btn" id="prevNoteBtn" onclick="FloatingActions.previousNote()">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="15,18 9,12 15,6"></polyline>
                                </svg>
                            </button>
                            <div class="note-indicators" id="noteIndicators"></div>
                            <button class="note-nav-btn next-btn" id="nextNoteBtn" onclick="FloatingActions.nextNote()">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="9,18 15,12 9,6"></polyline>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            `;
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
                        <!-- 상단 로딩 전용 영역 -->
                        <div class="top-loading-container" id="topLoadingContainer"></div>
                        
                        <div class="guestbook-entries" id="guestbookEntries">
                            <!-- 방명록 항목들이 여기에 표시됩니다 -->
                            <div class="guestbook-loading">
                                <div class="loading-spinner"></div>
                                <p>방명록을 불러오는 중...</p>
                            </div>
                        </div>
                        
                        <div class="guestbook-form">
                            <button class="guestbook-submit" onclick="FloatingActions.submitGuestbookEntry()"><i class="fa-solid fa-arrow-up"></i></button>
                        
                            <div class="textarea-container" style="position: relative;">
                            <textarea placeholder="Message" id="guestMessage" rows="2" maxlength="50" required></textarea>
                            <div class="char-counter" id="charCounter" style="position: absolute; bottom: 10px; right: 8px; font-size: 0.75em; color: #888;">0/50</div>
                            </div>
                            <div class="name-input-container">
                                <input type="text" placeholder="Name" id="guestName" required />
                                <input type="password" placeholder="****" id="guestPassword" pattern="[0-9]{4}" maxlength="4" inputmode="numeric" required />
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        return actionsHTML + authorNoteHTML + guestbookHTML;
    },

    // 컴포넌트 초기화
    init: function(options = {}) {
        const config = { ...this.config, ...options };
        
        // HTML 생성 및 페이지에 추가
        const htmlContent = this.createHTML(config);
        document.body.insertAdjacentHTML('beforeend', htmlContent);
        
        // 이벤트 리스너 설정
        this.setupEventListeners();
        
        // 알림 점 상태 초기화
        setTimeout(() => {
            this.initNotificationState();
        }, 100);
    },

    // 이벤트 리스너 설정
    setupEventListeners: function() {
        // 방명록 텍스트영역에 키보드 이벤트 추가
        const messageTextarea = document.getElementById('guestMessage');
        if (messageTextarea) {
            messageTextarea.addEventListener('keypress', this.handleGuestbookKeyPress.bind(this));
            messageTextarea.addEventListener('input', this.updateCharCounter.bind(this));
            messageTextarea.addEventListener('input', this.validateMessageInput.bind(this));
        }

        // 이름 입력란에 실시간 검증 추가
        const nameInput = document.getElementById('guestName');
        if (nameInput) {
            nameInput.addEventListener('input', this.validateNameInput.bind(this));
        }

        // ESC 키로 팝업 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const guestbook = document.getElementById('floatingGuestbook');
                const authorNote = document.getElementById('floatingAuthorNote');
                
                if (guestbook && guestbook.classList.contains('active')) {
                    guestbook.classList.remove('active');
                }
                if (authorNote && authorNote.classList.contains('active')) {
                    authorNote.classList.remove('active');
                }
            }
        });

        // 스크롤 위치에 따른 scroll to top 버튼 표시/숨김
        this.setupScrollToTopVisibility();
        
        // 방명록 스크롤 이벤트 (무한 스크롤)
        this.setupInfiniteScroll();
    },

    // 스크롤 위치에 따른 scroll to top 버튼 표시/숨김 설정
    // setupScrollToTopVisibility: function() {
    //     let scrollTimeout;
        
    //     const handleWindowScroll = () => {
    //         clearTimeout(scrollTimeout);
    //         scrollTimeout = setTimeout(() => {
    //             const scrollTopBtn = document.querySelector('.floating-scroll-top-btn');
    //             if (!scrollTopBtn) return;

    //             // 페이지 상단에서 300px 이상 스크롤했을 때 버튼 표시
    //             if (window.scrollY > 300) {
    //                 scrollTopBtn.classList.add('visible');
    //             } else {
    //                 scrollTopBtn.classList.remove('visible');
    //             }
    //         }, 100);
    //     };

    //     window.addEventListener('scroll', handleWindowScroll);
    //     // 초기 상태 설정
    //     handleWindowScroll();
    // },

    // 금지어 필터링
    validateInput: function(text, type = 'message') {
        // 메시지 금지어 목록
        const messageBannedWords = [
            '섹스', 'ㅅㅅ', 'ㅗ', '시발', 'ㅅㅂ', "ㅅ ㅂ", '병신', 'ㅄ', '좆', 'ㅈ', '개새끼', '개새', '미친', '또라이',
            '닥쳐', '닥쳐라', '꺼져', '꺼져라', '씨발놈', '씨발년', '병신년', '병신놈', '느금마', '느금애', '느금', 
            '지랄', 'ㅈㄹ', 'ㅈ ㄹ', '존나', '존내', '좆같네', '좆같아', '좆같은', '개같네', '개같아', '개같은',
            '씹새끼', '씹창', '씹할놈', '씹할년', '씨발',  '개새끼', '병신','좆', 'ㅈ', '미친', '또라이',
            '닥쳐', '꺼져', '느금마', '지랄', '존나', '좆같네', '개같네', '씹창',
            // 영어 욕설들
            'fuck', 'shit', 'bitch', 'asshole', 'motherfucker', 'cocksucker'
        ];
        
        // 이름 금지어 목록  
        const nameBannedWords = [
            '백종훈', '주인', 'jwbaek', 'jw.baek', 'jw baek',
            // 추가 관리자/소유자 관련 단어들
            'admin', 'administrator', '관리자', 'owner', 'master',
            'root', 'system', '시스템'
        ];
        
        const bannedList = type === 'name' ? nameBannedWords : messageBannedWords;
        const lowerText = text.toLowerCase().replace(/\s+/g, ''); // 소문자 변환 및 공백 제거
        
        for (const word of bannedList) {
            const lowerWord = word.toLowerCase().replace(/\s+/g, '');
            if (lowerText.includes(lowerWord)) {
                return {
                    valid: false,
                    word: word,
                    message: type === 'name' ? 
                        `이름에 "${word}"는 사용할 수 없습니다.` : 
                        `메시지에 "${word}"는 사용할 수 없습니다.`
                };
            }
        }
        
        return { valid: true };
    },

    // IP 주소 가져오기
    getClientIP: async function() {
        try {
            // 여러 IP 조회 서비스를 시도 (하나가 실패하면 다음으로)
            const ipServices = [
                'https://api.ipify.org?format=json',
                'https://ipapi.co/json/',
                'https://jsonip.com'
            ];
            
            for (const service of ipServices) {
                try {
                    const response = await fetch(service, { timeout: 3000 });
                    const data = await response.json();
                    
                    // 각 서비스의 응답 형식에 맞게 IP 추출
                    if (data.ip) return data.ip;
                    if (data.query) return data.query;
                    if (data.origin) return data.origin;
                } catch (error) {
                    console.warn(`IP 서비스 ${service} 실패:`, error);
                    continue;
                }
            }
            
            // 모든 서비스가 실패한 경우
            return 'unknown';
        } catch (error) {
            console.error('IP 주소 조회 실패:', error);
            return 'unknown';
        }
    },

    // 무한 스크롤 설정
    setupInfiniteScroll: function() {
        let scrollTimeout;
        let isLoadingMore = false;
        let isRestoringScroll = false; // 스크롤 복원 중 보호
        
        const handleScroll = (e) => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                const entriesContainer = e.target;
                if (!entriesContainer || isLoadingMore || isRestoringScroll) return;
                
                const scrollTop = entriesContainer.scrollTop;
                const scrollHeight = entriesContainer.scrollHeight;
                const clientHeight = entriesContainer.clientHeight;
                
                // 새로운 공식 계산
                const scrollFormula = scrollHeight + scrollTop - clientHeight;
                

                
                // 콘텐츠가 충분하지 않거나 스크롤 가능한 상태가 아니면 로딩하지 않음
                const hasScrollableContent = scrollHeight > clientHeight + 50;
                
                // 쿨다운 체크 (마지막 로드 후 1초가 지났는지)
                const currentTime = Date.now();
                const timeSinceLastLoad = currentTime - this.loadState.lastLoadTime;
                const canLoad = timeSinceLastLoad >= this.loadState.cooldownDuration;
                
                // 새 공식: scrollHeight + scrollTop - clientHeight <= 2 (border 등 오차 고려)
                const isAtTop = scrollFormula <= 2;
                
                if (isAtTop && this.loadState.hasMore && !this.loadState.loading && !isLoadingMore && canLoad && hasScrollableContent) {
                    isLoadingMore = true;
                    
                    // 로딩 시작 시간 즉시 기록 (중복 로딩 방지)
                    this.loadState.lastLoadTime = Date.now();
                    
                    // 상단에 로딩 표시
                    this.showTopLoading();
                    
                    // 로드 전 값들 기록 (사용자의 상대적 위치 계산)
                    const A = entriesContainer.scrollHeight;           // 로드 전 scrollHeight
                    const beforeScrollTop = entriesContainer.scrollTop;
                    const beforeClientHeight = entriesContainer.clientHeight;
                    const B = beforeScrollTop - beforeClientHeight;    // 로드 전 scrollTop - clientHeight (상대적 위치)
                    

                    
                    // 추가 데이터 로드
                    this.loadGuestbookEntries(false).then(() => {
                        // 로딩 표시 제거
                        this.hideTopLoading();
                        
                        // 로드 완료 후 스크롤 위치 복원
                        setTimeout(() => {
                            isRestoringScroll = true; // 스크롤 복원 시작
                            
                            const C = entriesContainer.scrollHeight;          // 로드 후 scrollHeight
                            
                            // 🎯 간단한 해결책: 로드 전 scrollTop 그대로 유지
                            const newScrollPosition = beforeScrollTop;
                            

                            
                            // 로드 전 scrollTop 그대로 적용
                            entriesContainer.scrollTop = newScrollPosition;
                            
                            // 복원된 위치 확인
                            setTimeout(() => {
                                isRestoringScroll = false;
                                isLoadingMore = false;
                            }, 50);
                        }, 100);
                    }).catch(() => {
                        this.hideTopLoading();
                        isRestoringScroll = false;
                        isLoadingMore = false;
                    });
                }
            }, 150); // 150ms 디바운스
        };
        
        // 방명록이 열릴 때마다 스크롤 이벤트 리스너 설정
        const originalToggle = this.toggleGuestbook;
        this.toggleGuestbook = function() {
            originalToggle.call(this);
            
            setTimeout(() => {
                const entriesContainer = document.getElementById('guestbookEntries');
                if (entriesContainer) {
                    // 기존 리스너 제거
                    entriesContainer.removeEventListener('scroll', handleScroll);
                    // 새 리스너 추가 (바인드된 컨텍스트와 함께)
                    entriesContainer.addEventListener('scroll', handleScroll.bind(this));
                }
            }, 100);
        }.bind(this);
    },

    // 실시간 이름 검증
    validateNameInput: function() {
        const nameInput = document.getElementById('guestName');
        const validation = this.validateInput(nameInput.value, 'name');
        
        if (!validation.valid && nameInput.value.trim()) {
            nameInput.style.borderColor = '#e74c3c';
            nameInput.title = validation.message;
        } else {
            nameInput.style.borderColor = '';
            nameInput.title = '';
        }
    },

    // 실시간 메시지 검증
    validateMessageInput: function() {
        const messageTextarea = document.getElementById('guestMessage');
        const validation = this.validateInput(messageTextarea.value, 'message');
        
        if (!validation.valid && messageTextarea.value.trim()) {
            messageTextarea.style.borderColor = '#e74c3c';
            messageTextarea.title = validation.message;
        } else {
            messageTextarea.style.borderColor = '';
            messageTextarea.title = '';
        }
    },

    // 작가노트 토글
    toggleAuthorNote: function() {
        const authorNote = document.getElementById('floatingAuthorNote');
        const isVisible = authorNote.classList.contains('active');
        
        if (isVisible) {
            authorNote.classList.remove('active');
        } else {
            authorNote.classList.add('active');
            this.loadAuthorNote();
            // 노트를 열면 알림 점 숨기기
            this.hideNotificationDot();
        }
    },

    // 알림 점 숨기기 함수
    hideNotificationDot: function() {
        const notificationDot = document.getElementById('noteNotificationDot');
        if (notificationDot) {
            notificationDot.style.display = 'none';
            // 로컬스토리지에 노트 확인 상태 저장
            localStorage.setItem('noteViewed', 'true');
        }
    },

    // 알림 점 상태 확인 및 초기화
    initNotificationState: function() {
        const notificationDot = document.getElementById('noteNotificationDot');
        const noteViewed = localStorage.getItem('noteViewed');
        
        if (notificationDot) {
            if (noteViewed === 'true') {
                notificationDot.style.display = 'none';
            } else {
                notificationDot.style.display = 'block';
            }
        }
    },

    // 노트 슬라이드 상태
    noteState: {
        currentSlide: 0,
        totalSlides: 2,
        notes: [],
        touchStartX: 0,
        touchEndX: 0
    },

    // 작가노트 로드 (슬라이드 시스템)
    loadAuthorNote: async function() {
        const contentContainer = document.getElementById('authorNoteContent');
        const navContainer = document.getElementById('authorNoteNav');
        const slider = document.getElementById('authorNoteSlider');
        
        try {
            // 모든 노트 파일들을 병렬로 로드
            const notePromises = [
                fetch('note1.txt').then(res => res.ok ? res.text() : null),
                fetch('note2.txt').then(res => res.ok ? res.text() : null)
            ];
            
            const noteContents = await Promise.all(notePromises);
            this.noteState.notes = noteContents.filter(content => content !== null);
            
            if (this.noteState.notes.length === 0) {
                throw new Error('노트 파일을 찾을 수 없습니다.');
            }
            
            // 슬라이드 컨테이너 생성
            this.setupSlideContainer();
            
            // 네비게이션 표시 (2개 이상일 때만)
            if (this.noteState.notes.length > 1) {
                navContainer.style.display = 'flex';
                this.updateNavigation();
            }
            
            // 첫 번째 슬라이드 표시
            this.showSlide(0);
            
            // 터치 이벤트 설정
            this.setupTouchEvents();
            
        } catch (error) {
            console.error('작가노트 로드 오류:', error);
            contentContainer.innerHTML = `
                <div class="guestbook-error">
                    <p>작가노트를 불러오는 중 오류가 발생했습니다.</p>
                    <button onclick="FloatingActions.loadAuthorNote()" class="retry-btn">다시 시도</button>
                </div>
            `;
        }
    },

    // 슬라이드 컨테이너 설정
    setupSlideContainer: function() {
        const slider = document.getElementById('authorNoteSlider');
        const slidesHTML = this.noteState.notes.map((content, index) => {
            const formattedContent = content
                .split('\n\n')
                .map(paragraph => paragraph.trim())
                .filter(paragraph => paragraph.length > 0)
                .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
                .join('');
            
            return `
                <div class="author-note-slide" data-slide="${index}">
                    <div class="author-note-text">
                        ${formattedContent}
                    </div>
                </div>
            `;
        }).join('');
        
        slider.innerHTML = `
            <div class="author-note-slides-container" id="slidesContainer">
                ${slidesHTML}
            </div>
            <style>
                .floating-author-note .guestbook-content {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                }
                
                .author-note-slider {
                    position: relative;
                    overflow-x: hidden;
                    overflow-y: auto;
                    min-height: 300px;
                    flex: 1;
                    /* 스크롤바 스타일링 */
                    scrollbar-width: thin;
                    scrollbar-color: var(--text-secondary) transparent;
                }
                
                /* 웹킷 기반 브라우저 스크롤바 */
                .author-note-slider::-webkit-scrollbar {
                    width: 6px;
                    background: transparent;
                }
                
                .author-note-slider::-webkit-scrollbar-track {
                    background: transparent;
                }
                
                .author-note-slider::-webkit-scrollbar-thumb {
                    background: var(--text-secondary);
                    border-radius: 3px;
                    opacity: 0.5;
                }
                
                .author-note-slider::-webkit-scrollbar-thumb:hover {
                    background: var(--text-primary);
                    opacity: 0.8;
                }
                
                /* 스크롤바를 오버레이로 만들기 */
                .author-note-slider {
                    scrollbar-gutter: stable;
                }
                
                /* Firefox에서 스크롤바 오버레이 효과 */
                @supports (scrollbar-width: thin) {
                    .author-note-slider {
                        scrollbar-width: thin;
                        scrollbar-color: rgba(var(--text-secondary-rgb, 128, 128, 128), 0.5) transparent;
                    }
                }
                
                /* 스크롤바가 컨텐츠 위에 오도록 설정 */
                .author-note-slider::-webkit-scrollbar {
                    width: 6px;
                    background: transparent;
                    position: absolute;
                    z-index: 999;
                }
                
                .author-note-slider::-webkit-scrollbar-corner {
                    background: transparent;
                }
                
                .author-note-slides-container {
                    display: flex;
                    transition: transform 0.3s ease;
                    width: ${this.noteState.notes.length * 100}%;
                }
                
                .author-note-slide {
                    width: ${100 / this.noteState.notes.length}%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 1rem;
                    flex-shrink: 0;
                }
                
                .author-note-text {
                    text-align: center;
                    font-size: 0.95rem;
                    line-height: 1.6;
                    max-width: 90%;
                }
                
                .author-note-text p {
                    margin-bottom: 1rem;
                }
                
                .author-note-text p:last-child {
                    margin-bottom: 0;
                }
                
                .author-note-nav {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0.75rem 1rem;
                    border-top: 1px solid var(--border-color);
                    background: var(--bg-secondary);
                    margin-top: auto;
                }
                
                .note-nav-btn {
                    background: none;
                    border: none;
                    color: var(--text-secondary);
                    cursor: pointer;
                    padding: 0.5rem;
                    border-radius: 4px;
                    transition: all 0.3s ease;
                }
                
                .note-nav-btn:hover {
                    background: var(--bg-secondary);
                    color: var(--text-primary);
                }
                
                .note-nav-btn:disabled {
                    opacity: 0.3;
                    cursor: default;
                }
                
                .note-indicators {
                    display: flex;
                    gap: 0.5rem;
                }
                
                .note-indicator {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: var(--text-secondary);
                    opacity: 0.3;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }
                
                .note-indicator.active {
                    opacity: 1;
                    background: var(--accent-color);
                }
            </style>
        `;
    },

    // 슬라이드 표시
    showSlide: function(slideIndex) {
        const slidesContainer = document.getElementById('slidesContainer');
        if (!slidesContainer) return;
        
        this.noteState.currentSlide = Math.max(0, Math.min(slideIndex, this.noteState.notes.length - 1));
        const translateX = -(this.noteState.currentSlide * (100 / this.noteState.notes.length));
        
        slidesContainer.style.transform = `translateX(${translateX}%)`;
        this.updateNavigation();
    },

    // 네비게이션 업데이트
    updateNavigation: function() {
        const prevBtn = document.getElementById('prevNoteBtn');
        const nextBtn = document.getElementById('nextNoteBtn');
        const indicators = document.getElementById('noteIndicators');
        
        // 버튼 상태 업데이트
        if (prevBtn) prevBtn.disabled = this.noteState.currentSlide === 0;
        if (nextBtn) nextBtn.disabled = this.noteState.currentSlide === this.noteState.notes.length - 1;
        
        // 인디케이터 업데이트
        if (indicators) {
            const indicatorsHTML = this.noteState.notes.map((_, index) => 
                `<div class="note-indicator ${index === this.noteState.currentSlide ? 'active' : ''}" 
                      onclick="FloatingActions.goToSlide(${index})"></div>`
            ).join('');
            indicators.innerHTML = indicatorsHTML;
        }
    },

    // 이전 슬라이드
    previousNote: function() {
        if (this.noteState.currentSlide > 0) {
            this.showSlide(this.noteState.currentSlide - 1);
        }
    },

    // 다음 슬라이드
    nextNote: function() {
        if (this.noteState.currentSlide < this.noteState.notes.length - 1) {
            this.showSlide(this.noteState.currentSlide + 1);
        }
    },

    // 특정 슬라이드로 이동
    goToSlide: function(slideIndex) {
        this.showSlide(slideIndex);
    },

    // 터치 이벤트 설정
    setupTouchEvents: function() {
        const slider = document.getElementById('authorNoteSlider');
        if (!slider) return;
        
        slider.addEventListener('touchstart', (e) => {
            this.noteState.touchStartX = e.changedTouches[0].screenX;
        });
        
        slider.addEventListener('touchend', (e) => {
            this.noteState.touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe();
        });
        
        // 마우스 드래그도 지원
        let isMouseDown = false;
        slider.addEventListener('mousedown', (e) => {
            isMouseDown = true;
            this.noteState.touchStartX = e.clientX;
        });
        
        slider.addEventListener('mousemove', (e) => {
            if (!isMouseDown) return;
            e.preventDefault();
        });
        
        slider.addEventListener('mouseup', (e) => {
            if (!isMouseDown) return;
            isMouseDown = false;
            this.noteState.touchEndX = e.clientX;
            this.handleSwipe();
        });
    },

    // 스와이프 처리
    handleSwipe: function() {
        const swipeThreshold = 50;
        const swipeDistance = this.noteState.touchStartX - this.noteState.touchEndX;
        
        if (Math.abs(swipeDistance) > swipeThreshold) {
            if (swipeDistance > 0) {
                // 왼쪽 스와이프 - 다음 슬라이드
                this.nextNote();
            } else {
                // 오른쪽 스와이프 - 이전 슬라이드
                this.previousNote();
            }
        }
    },

    // 방명록 토글
    toggleGuestbook: function() {
        const guestbook = document.getElementById('floatingGuestbook');
        const isVisible = guestbook.classList.contains('active');
        
        if (isVisible) {
            guestbook.classList.remove('active');
        } else {
            guestbook.classList.add('active');
            this.loadGuestbookEntries(true);
        }
    },

    // 방명록 항목 제출
    submitGuestbookEntry: async function() {
        const name = document.getElementById('guestName').value.trim();
        const message = document.getElementById('guestMessage').value.trim();
        const password = document.getElementById('guestPassword').value.trim();
        
        if (!name || !message || !password) {
            alert('이름, 메시지, 비밀번호를 모두 입력해주세요.');
            return;
        }
        
        if (!/^\d{4}$/.test(password)) {
            alert('비밀번호는 4자리 숫자여야 합니다.');
            return;
        }
        
        // 이름 금지어 검증
        const nameValidation = this.validateInput(name, 'name');
        if (!nameValidation.valid) {
            alert(nameValidation.message);
            return;
        }
        
        // 메시지 금지어 검증
        const messageValidation = this.validateInput(message, 'message');
        if (!messageValidation.valid) {
            alert(messageValidation.message);
            return;
        }
        
        // 로딩 상태 표시
        const submitBtn = document.querySelector('.guestbook-submit');
        const originalHTML = submitBtn.innerHTML;
        submitBtn.innerHTML = '<div class="loading-spinner" style="width:16px;height:16px;"></div>';
        submitBtn.disabled = true;
        
        try {
            // config.js에서 API URL 가져오기
            if (!window.CONFIG || !window.CONFIG.APPS_SCRIPT_URL) {
                throw new Error('Google Apps Script URL이 설정되지 않았습니다.');
            }
            
            // 클라이언트 IP 주소 가져오기
            const clientIP = await this.getClientIP();
            
            const response = await fetch(window.CONFIG.APPS_SCRIPT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    data: JSON.stringify({
                        action: 'addGuestbook',
                        guestData: {
                            name: name,
                            message: message,
                            password: password,
                            ip: clientIP
                        }
                    })
                })
            });
            
            // 응답 상태 확인
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            // 응답 내용 확인
            const responseText = await response.text();
            
            // HTML이 반환되었는지 확인
            if (responseText.startsWith('<!DOCTYPE') || responseText.startsWith('<html')) {
                throw new Error('API 엔드포인트가 올바르게 설정되지 않았습니다. HTML 페이지가 반환되었습니다.');
            }
            
            // JSON 파싱
            let result;
            try {
                result = JSON.parse(responseText);
            } catch (parseError) {
                throw new Error(`JSON 파싱 오류: ${parseError.message}. 응답: ${responseText.substring(0, 200)}...`);
            }
            
            if (result.success) {
                // 성공시 폼 초기화
                document.getElementById('guestName').value = '';
                document.getElementById('guestMessage').value = '';
                document.getElementById('guestPassword').value = '';
                this.updateCharCounter();
                
                alert('방명록이 등록되었습니다!');
                this.loadGuestbookEntries(true); // 처음부터 다시 로드
            } else {
                throw new Error(result.error || '방명록 등록에 실패했습니다.');
            }
        } catch (error) {
            console.error('방명록 등록 오류:', error);
            alert('방명록 등록 중 오류가 발생했습니다: ' + error.message);
        } finally {
            // 로딩 상태 복원
            submitBtn.innerHTML = originalHTML;
            submitBtn.disabled = false;
        }
    },

    // 방명록 항목들 로드 (무한 스크롤)
    loadGuestbookEntries: async function(reset = false) {
        if (this.loadState.loading) return;
        
        const entriesContainer = document.getElementById('guestbookEntries');
        
        // 초기화가 필요한 경우 (새 방명록 추가 등)
        if (reset) {
            this.loadState.offset = 0;
            this.loadState.hasMore = true;
            this.loadState.allEntries = [];
            entriesContainer.innerHTML = `
                <div class="guestbook-loading">
                    <div class="loading-spinner"></div>
                    <p>방명록을 불러오는 중...</p>
                </div>
            `;
        }
        
        // 더 로드할 데이터가 없으면 중단
        if (!this.loadState.hasMore) return;
        
        this.loadState.loading = true;
        
        try {
            if (!window.CONFIG || !window.CONFIG.APPS_SCRIPT_URL) {
                throw new Error('Google Apps Script URL이 설정되지 않았습니다.');
            }
            
            const response = await fetch(`${window.CONFIG.APPS_SCRIPT_URL}?action=getGuestbook&offset=${this.loadState.offset}&limit=${this.loadState.limit}`);
            
            // 응답 상태 확인
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            // 응답 내용 확인
            const responseText = await response.text();
            
            // HTML이 반환되었는지 확인
            if (responseText.startsWith('<!DOCTYPE') || responseText.startsWith('<html')) {
                throw new Error('API 엔드포인트가 올바르게 설정되지 않았습니다. HTML 페이지가 반환되었습니다.');
            }
            
            // JSON 파싱
            let result;
            try {
                result = JSON.parse(responseText);
            } catch (parseError) {
                throw new Error(`JSON 파싱 오류: ${parseError.message}. 응답: ${responseText.substring(0, 200)}...`);
            }
            
            if (result.success) {
                const newEntries = result.entries || [];
                
                // 새 항목들을 기존 배열 앞에 추가 (상단 표시를 위해)
                this.loadState.allEntries = [...newEntries, ...this.loadState.allEntries];
                this.loadState.offset += newEntries.length;
                this.loadState.hasMore = newEntries.length === this.loadState.limit;
                
                // UI 업데이트 - reset에 따라 렌더링 방식 결정
                if (reset) {
                    // 전체 렌더링 (초기 로드)
                    this.renderGuestbookEntries();
                } else {
                    // 새 항목만 추가 (무한 스크롤)
                    this.renderGuestbookEntries(true, newEntries);
                }
                
            } else {
                throw new Error(result.error || '방명록 로드에 실패했습니다.');
            }
        } catch (error) {
            console.error('방명록 로드 오류:', error);
            if (reset) {
                entriesContainer.innerHTML = `
                    <div class="guestbook-error">
                        <p>방명록을 불러오는 중 오류가 발생했습니다.</p>
                        <button onclick="FloatingActions.loadGuestbookEntries(true)" class="retry-btn">다시 시도</button>
                    </div>
                `;
            }
        } finally {
            this.loadState.loading = false;
        }
    },

    // 방명록 항목들 렌더링
    renderGuestbookEntries: function(newEntriesOnly = false, newEntries = []) {
        const entriesContainer = document.getElementById('guestbookEntries');
        
        if (newEntriesOnly && newEntries.length > 0) {
            // 새 항목들만 상단에 추가 (DOM 교체 없음)
            let newEntriesHTML = '';
            newEntries.forEach(entry => {
                const date = new Date(entry.date).toLocaleDateString('ko-KR');
                newEntriesHTML += `
                    <div class="guestbook-entry" data-entry-id="${entry.id}">
                        <div class="entry-header">
                            <span class="entry-name">${this.escapeHtml(entry.name)}</span>
                            <span class="entry-date">${date}</span>
                            <button class="entry-more-btn" onclick="FloatingActions.showDeleteConfirm(this, ${entry.id})" title="삭제">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <circle cx="5" cy="12" r="2" fill="currentColor"/>
                                    <circle cx="12" cy="12" r="2" fill="currentColor"/>
                                    <circle cx="19" cy="12" r="2" fill="currentColor"/>
                                </svg>
                            </button>
                        </div>
                        <div class="entry-message">${this.escapeHtml(entry.message)}</div>
                    </div>
                `;
            });
            
            // 기존 컨테이너의 첫 번째 자식 앞에 삽입 (prepend)
            entriesContainer.insertAdjacentHTML('afterbegin', newEntriesHTML);
            return;
        }
        
        // 전체 렌더링 (초기 로드 또는 reset=true일 때)
        if (this.loadState.allEntries.length === 0) {
            entriesContainer.innerHTML = `
                <div class="guestbook-empty">
                    <p>아직 방명록이 없습니다.<br>첫 번째 메시지를 남겨보세요!</p>
                </div>
            `;
            return;
        }
        
        let entriesHTML = '';
        this.loadState.allEntries.forEach(entry => {
            const date = new Date(entry.date).toLocaleDateString('ko-KR');
            entriesHTML += `
                <div class="guestbook-entry" data-entry-id="${entry.id}">
                    <div class="entry-header">
                        <span class="entry-name">${this.escapeHtml(entry.name)}</span>
                        <span class="entry-date">${date}</span>
                        <button class="entry-more-btn" onclick="FloatingActions.showDeleteConfirm(this, ${entry.id})" title="삭제">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <circle cx="5" cy="12" r="2" fill="currentColor"/>
                                <circle cx="12" cy="12" r="2" fill="currentColor"/>
                                <circle cx="19" cy="12" r="2" fill="currentColor"/>
                            </svg>
                        </button>
                    </div>
                    <div class="entry-message">${this.escapeHtml(entry.message)}</div>
                </div>
            `;
        });
        
        entriesContainer.innerHTML = entriesHTML;
    },

    // 상단 로딩 표시 (전용 컨테이너 사용)
    showTopLoading: function() {
        const topLoadingContainer = document.getElementById('topLoadingContainer');
        
        if (topLoadingContainer && topLoadingContainer.innerHTML.trim() === '') {
            topLoadingContainer.innerHTML = `
                <div class="top-loading" id="topLoader">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">이전 방명록 불러오는 중...</div>
                </div>
            `;
        }
    },

    // 상단 로딩 제거 (부드러운 애니메이션)
    hideTopLoading: function() {
        const topLoadingContainer = document.getElementById('topLoadingContainer');
        const topLoader = document.getElementById('topLoader');
        
        if (topLoadingContainer && topLoader) {
            // fade-out 클래스 추가로 애니메이션 시작
            topLoader.classList.add('fade-out');
            
            // 애니메이션 완료 후 제거
            setTimeout(() => {
                topLoadingContainer.innerHTML = '';
            }, 250); // 애니메이션 지속시간과 동일
        }
    },

    // Enter 키로 방명록 제출
    handleGuestbookKeyPress: function(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.submitGuestbookEntry();
        }
    },

    // 글자수 카운터 업데이트
    updateCharCounter: function() {
        const textarea = document.getElementById('guestMessage');
        const counter = document.getElementById('charCounter');
        if (textarea && counter) {
            const currentLength = textarea.value.length;
            counter.textContent = `${currentLength}/50`;
            
            // 글자수가 50에 가까워지면 색상 변경
            if (currentLength >= 45) {
                counter.style.color = '#e74c3c';
            } else if (currentLength >= 40) {
                counter.style.color = '#f39c12';
            } else {
                counter.style.color = '#888';
            }
        }
    },

    // 삭제 확인 알림
    showDeleteConfirm: async function(button, entryId) {
        if (confirm('삭제하시겠습니까?')) {
            const password = prompt('비밀번호를 입력하세요 (4자리 숫자):');
            
            if (password === null) {
                // 사용자가 취소를 누른 경우
                return;
            }
            
            if (!/^\d{4}$/.test(password)) {
                alert('비밀번호는 4자리 숫자여야 합니다.');
                return;
            }
            
            // 버튼 로딩 상태
            button.disabled = true;
            const originalHTML = button.innerHTML;
            button.innerHTML = '<div class="loading-spinner" style="width:12px;height:12px;"></div>';
            
            try {
                // config.js에서 API URL 가져오기
                if (!window.CONFIG || !window.CONFIG.APPS_SCRIPT_URL) {
                    throw new Error('Google Apps Script URL이 설정되지 않았습니다.');
                }
                
                const response = await fetch(window.CONFIG.APPS_SCRIPT_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        data: JSON.stringify({
                            action: 'deleteGuestbook',
                            entryId: entryId,
                            password: password
                        })
                    })
                });
                
                // 응답 상태 확인
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                // 응답 내용 확인
                const responseText = await response.text();
                
                // HTML이 반환되었는지 확인
                if (responseText.startsWith('<!DOCTYPE') || responseText.startsWith('<html')) {
                    throw new Error('API 엔드포인트가 올바르게 설정되지 않았습니다. HTML 페이지가 반환되었습니다.');
                }
                
                // JSON 파싱
                let result;
                try {
                    result = JSON.parse(responseText);
                } catch (parseError) {
                    throw new Error(`JSON 파싱 오류: ${parseError.message}. 응답: ${responseText.substring(0, 200)}...`);
                }
                
                if (result.success) {
                    alert('방명록이 삭제되었습니다.');
                    this.loadGuestbookEntries(true); // 처음부터 다시 로드
                } else {
                    throw new Error(result.error || '삭제에 실패했습니다.');
                }
            } catch (error) {
                console.error('방명록 삭제 오류:', error);
                alert('삭제 중 오류가 발생했습니다: ' + error.message);
                
                // 버튼 상태 복원
                button.innerHTML = originalHTML;
                button.disabled = false;
            }
        }
    },

    // 로그인 상태 확인
    isLoggedIn: function() {
        const token = localStorage.getItem('admin_token');
        const expires = localStorage.getItem('admin_expires');
        
        if (!token || !expires) return false;
        
        // 토큰 만료 확인
        if (Date.now() > parseInt(expires)) {
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_expires');
            return false;
        }
        
        return true;
    },

    // 플로팅 액션 다시 렌더링 (로그인 상태 변경시 사용)
    refresh: function() {
        const existingStack = document.getElementById('floatingActionStack');
        const existingGuestbook = document.getElementById('floatingGuestbook');
        const existingAuthorNote = document.getElementById('floatingAuthorNote');
        
        if (existingStack) existingStack.remove();
        if (existingGuestbook) existingGuestbook.remove();
        if (existingAuthorNote) existingAuthorNote.remove();
        
        this.init();
    },

    // 맨 위로 스크롤
    scrollToTop: function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    },

    // HTML 이스케이프 (XSS 방지)
    escapeHtml: function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// 페이지별 설정 결정
function getPageSpecificConfig() {
    const currentPage = window.location.pathname;
    const isIndexPage = currentPage === '/' || currentPage.endsWith('/index.html') || currentPage.endsWith('/');
    
    return {
        showEditor: true,
        showGuestbook: true,
        showAuthorNote: isIndexPage, // index 페이지에서만 작가노트 표시
        autoInit: true
    };
}

// 자동 초기화 (페이지 로드 후)
document.addEventListener('DOMContentLoaded', function() {
    if (FloatingActions.config.autoInit) {
        const pageConfig = getPageSpecificConfig();
        FloatingActions.init(pageConfig);
    }
});

// 호환성을 위한 전역 함수들 (기존 HTML에서 사용 중인 함수명)
function toggleAuthorNote() {
    FloatingActions.toggleAuthorNote();
}

function previousNote() {
    FloatingActions.previousNote();
}

function nextNote() {
    FloatingActions.nextNote();
}

function goToSlide(slideIndex) {
    FloatingActions.goToSlide(slideIndex);
}

function toggleGuestbook() {
    FloatingActions.toggleGuestbook();
}

function submitGuestbookEntry() {
    FloatingActions.submitGuestbookEntry();
}

function loadGuestbookEntries() {
    FloatingActions.loadGuestbookEntries();
}