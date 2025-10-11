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
        // Check if app is already installed
        // if (this.isAppInstalled()) {
        //     return;
        // }
        
        // Check if user dismissed popup today
        // if (this.isDismissedToday()) {
        //     return;
        // }
        
        // Listen for beforeinstallprompt event
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showPopup();
        });
        
        // Listen for app installed event
        window.addEventListener('appinstalled', () => {
            this.hidePopup();
            this.setInstalled(true);
        });
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Show popup after delay if prompt is available
        setTimeout(() => {
            // if (this.deferredPrompt) {
                this.showPopup();
            // }
        }, 1000);
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
                this.setInstalled(true);
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
            this.popup.style.display = 'flex';
            document.body.style.overflow = 'hidden';
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
    
    isAppInstalled() {
        // Check if running in standalone mode (app is installed)
        if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
            return true;
        }
        
        // Check localStorage flag
        return localStorage.getItem('pwa-installed') === 'true';
    }
    
    setInstalled(installed) {
        localStorage.setItem('pwa-installed', installed.toString());
    }
}

// Initialize PWA installer when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PWAInstaller();
});

