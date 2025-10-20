/**
 * Development Notice Popup Handler
 * 개발 중 알림 팝업 관리
 */

class DevNoticePopup {
    constructor() {
        this.popup = null;
        this.okBtn = null;
        this.todayBtn = null;
        this.closeBtn = null;
        
        this.init();
    }

    init() {
        // DOM 요소들 가져오기
        this.popup = document.getElementById('dev-notice-popup');
        this.okBtn = document.getElementById('dev-notice-ok-btn');
        this.todayBtn = document.getElementById('dev-notice-today-btn');
        this.closeBtn = document.querySelector('.dev-notice-close-btn');

        // 이벤트 리스너 설정
        this.setupEventListeners();

        // 페이지 로드 시 팝업 표시 여부 확인
        this.checkAndShowPopup();
    }

    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        // OK 버튼 클릭
        if (this.okBtn) {
            this.okBtn.addEventListener('click', () => this.hide());
        }

        // 오늘 하루 보지 않기 버튼 클릭
        if (this.todayBtn) {
            this.todayBtn.addEventListener('click', () => this.dismissForToday());
        }

        // 닫기 버튼 클릭
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.hide());
        }

        // 배경 클릭으로 닫기
        if (this.popup) {
            this.popup.addEventListener('click', (e) => {
                if (e.target === this.popup) {
                    this.hide();
                }
            });
        }

        // ESC 키로 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.popup && this.popup.style.display === 'flex') {
                this.hide();
            }
        });
    }

    /**
     * 오늘 하루 팝업을 보지 않기로 설정했는지 확인
     * @returns {boolean}
     */
    isDismissedToday() {
        const dismissedDate = localStorage.getItem('dev-notice-dismissed-date');
        const today = new Date().toDateString();
        return dismissedDate === today;
    }

    /**
     * 팝업 표시
     */
    show() {
        if (this.popup) {
            this.popup.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    /**
     * 팝업 숨기기
     */
    hide() {
        if (this.popup) {
            this.popup.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    /**
     * 오늘 하루 보지 않기 설정
     */
    dismissForToday() {
        const today = new Date().toDateString();
        localStorage.setItem('dev-notice-dismissed-date', today);
        this.hide();
    }

    /**
     * 팝업 표시 여부 확인 및 표시
     */
    checkAndShowPopup() {
        // 오늘 하루 보지 않기로 설정했다면 표시하지 않음
        if (!this.isDismissedToday()) {
            // 페이지 로드 후 2초 뒤에 팝업 표시
            setTimeout(() => {
                this.show();
            }, 2000);
        }
    }
}

// DOM이 로드되면 팝업 초기화
document.addEventListener('DOMContentLoaded', function() {
    new DevNoticePopup();
});