// PWA Installation Popup Management
class PWAInstaller {
    constructor() {
        this.deferredPrompt = null;
        this.popup = document.getElementById('pwa-install-popup');
        this.installBtn = document.getElementById('pwa-install-btn');
        this.laterBtn = document.getElementById('pwa-later-btn');
        this.closeBtn = document.querySelector('.pwa-close-btn');
        
        this.init();
    }
    
    init() {
        // Check if running as installed app (standalone mode)
        if (this.isRunningAsApp()) {
            return;
        }
        
        // Check if user dismissed popup today
        if (this.isDismissedToday()) {
            return;
        }
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Show popup after delay for web users
        setTimeout(() => {
            this.showPopup();
        }, 3000);
        
        // Listen for beforeinstallprompt event (Chrome/Edge용)
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
        });
        
        // Listen for app installed event
        window.addEventListener('appinstalled', () => {
            this.hidePopup();
            console.log('✅ PWA가 성공적으로 설치되었습니다.');
        });
    }
    
    setupEventListeners() {
        if (this.installBtn) {
            this.installBtn.addEventListener('click', () => {
                this.installApp();
            });
        }
        
        if (this.laterBtn) {
            this.laterBtn.addEventListener('click', () => {
                this.dismissForToday();
            });
        }
        
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => {
                this.hidePopup();
            });
        }
        
        // Close on backdrop click
        if (this.popup) {
            this.popup.addEventListener('click', (e) => {
                if (e.target === this.popup) {
                    this.hidePopup();
                }
            });
        }
    }
    
    async installApp() {
        if (!this.deferredPrompt) {
            console.log('설치 프롬프트를 사용할 수 없습니다.');
            return;
        }
        
        try {
            // Show the install prompt
            this.deferredPrompt.prompt();
            
            // Wait for the user to respond
            const { outcome } = await this.deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                console.log('사용자가 앱 설치를 승인했습니다.');
            } else {
                console.log('사용자가 앱 설치를 거부했습니다.');
            }
            
            // Clear the saved prompt
            this.deferredPrompt = null;
            this.hidePopup();
            
        } catch (error) {
            console.error('앱 설치 중 오류 발생:', error);
            this.hidePopup();
        }
    }
    
    showPopup() {
        if (this.popup) {
            // 브라우저별 메시지 설정
            const browserMessage = this.getBrowserSpecificMessage();
            this.updatePopupContent(browserMessage);
            
            this.popup.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }
    
    // 팝업 내용 업데이트
    updatePopupContent(messageData) {
        const titleElement = this.popup.querySelector('h3');
        const messageElement = this.popup.querySelector('p');
        const installButton = this.installBtn;
        
        if (titleElement) {
            titleElement.textContent = messageData.title;
        }
        
        if (messageElement) {
            messageElement.textContent = messageData.message;
        }
        
        if (installButton) {
            installButton.textContent = messageData.buttonText;
            
            // 기존 이벤트 리스너 제거
            installButton.replaceWith(installButton.cloneNode(true));
            this.installBtn = document.getElementById('pwa-install-btn');
            
            // 설치 불가능한 브라우저의 경우 버튼 동작 변경
            if (!messageData.isInstallable) {
                this.installBtn.addEventListener('click', () => {
                    // Chrome으로 리다이렉트
                    const currentUrl = encodeURIComponent(window.location.href);
                    window.open(`https://www.google.com/chrome/?url=${currentUrl}`, '_blank');
                    this.dismissForToday();
                });
            } else {
                this.installBtn.addEventListener('click', () => {
                    this.installApp();
                });
            }
        }
    }
    
    hidePopup() {
        if (this.popup) {
            this.popup.style.display = 'none';
            document.body.style.overflow = '';
        }
    }
    
    dismissForToday() {
        const today = new Date().toDateString();
        localStorage.setItem('pwa-dismissed-date', today);
        this.hidePopup();
    }
    
    isDismissedToday() {
        const dismissedDate = localStorage.getItem('pwa-dismissed-date');
        const today = new Date().toDateString();
        return dismissedDate === today;
    }
    
    isRunningAsApp() {
        // Check if running in standalone mode (app is installed and launched)
        if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
            return true;
        }
        
        // Check for iOS Safari standalone mode
        if (window.navigator.standalone === true) {
            return true;
        }
        
        return false;
    }
    
    // 브라우저 감지 함수
    detectBrowser() {
        const userAgent = navigator.userAgent;
        
        if (userAgent.includes('Firefox')) {
            return 'firefox';
        } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
            return 'safari';
        } else if (userAgent.includes('Chrome') || userAgent.includes('Chromium')) {
            return 'chrome';
        } else if (userAgent.includes('Edge')) {
            return 'edge';
        }
        
        return 'unknown';
    }
    
    // 브라우저별 메시지 생성
    getBrowserSpecificMessage() {
        const browser = this.detectBrowser();
        
        switch (browser) {
            case 'safari':
                return {
                    title: '앱 설치',
                    message: 'Chrome 브라우저를 이용하면 앱으로 다운로드가 가능합니다.',
                    buttonText: 'Chrome으로 열기',
                    isInstallable: false
                };
            case 'firefox':
                return {
                    title: '앱 설치',
                    message: 'Chrome 브라우저를 이용하면 앱으로 다운로드가 가능합니다.',
                    buttonText: 'Chrome으로 열기',
                    isInstallable: false
                };
            case 'chrome':
            case 'edge':
            default:
                return {
                    title: '앱으로 설치',
                    message: '홈 화면에 추가하여 앱처럼 사용해보세요!',
                    buttonText: '설치하기',
                    isInstallable: true
                };
        }
    }
}

// Initialize PWA installer when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PWAInstaller();
});