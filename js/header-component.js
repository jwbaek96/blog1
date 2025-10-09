// header-component.js - 헤더와 모바일 사이드바 컴포넌트

class HeaderComponent {
    constructor(pageType = 'main') {
        // 현재 페이지 감지
        const currentPath = window.location.pathname;
        const currentPage = currentPath.split('/').pop() || 'index.html';
        console.log('Current page detected:', currentPage); // 디버그용
        
        // 기본 네비게이션 아이템 설정
        this.navigationItems = [
            { href: '#home', text: 'HOME', type: 'anchor' },
            { href: '#about', text: 'ABOUT', type: 'anchor' },
            { href: '#skills', text: 'SKILLS', type: 'anchor' },
            { href: 'article.html', text: 'ARTICLE', type: 'link' },
            { href: 'blog.html', text: 'BLOG', type: 'link' },
            { href: '/index.html#contact', text: 'CONTACT', type: 'anchor' }
        ];
        
        // 현재 페이지에 따라 active 상태 설정 (Home 제외, Article과 Blog만)
        this.navigationItems.forEach(item => {
            if (item.text === 'ARTICLE' && (currentPage === 'article.html' || currentPage.includes('article'))) {
                item.active = true;
            } else if (item.text === 'BLOG' && (currentPage === 'blog.html' || currentPage.includes('blog'))) {
                item.active = true;
            }
        });
        
        this.pageType = pageType;
    }

    // 헤더 HTML 생성
    generateHeaderHTML() {
        const navLinks = this.navigationItems.map(item => {
            const activeClass = item.active ? ' active' : '';
            return `<a href="${item.href}" class="nav-link${activeClass}">${item.text}</a>`;
        }).join('');

        return `
            <header class="header">
                <div class="container">
                    <div class="header-content">
                        <div class="logo">
                            <a href="index.html">JW.BAEK</a>
                        </div>
                        <button class="mobile-menu-toggle" onclick="HeaderComponent.toggleMobileSidebar()">☰</button>
                        <nav class="nav" id="mainNav">
                            ${navLinks}
                        </nav>
                    </div>
                </div>
            </header>
        `;
    }

    // 모바일 사이드바 HTML 생성
    generateMobileSidebarHTML() {
        const sidebarLinks = this.navigationItems.map(item => {
            const activeClass = item.active ? ' active' : '';
            const classAttr = activeClass ? ` class="${activeClass.trim()}"` : '';
            return `<a href="${item.href}"${classAttr} onclick="HeaderComponent.closeMobileSidebar()">${item.text}</a>`;
        }).join('');

        return `
            <div class="mobile-sidebar" id="mobileSidebar">
                <button class="mobile-sidebar-close" onclick="HeaderComponent.closeMobileSidebar()">✕</button>
                <nav class="mobile-sidebar-nav">
                    ${sidebarLinks}
                </nav>
            </div>
        `;
    }

    // DOM에 헤더와 사이드바 삽입
    render() {
        // 헤더 삽입
        const headerHTML = this.generateHeaderHTML();
        const headerPlaceholder = document.getElementById('header-placeholder');
        if (headerPlaceholder) {
            headerPlaceholder.outerHTML = headerHTML;
        } else {
            // placeholder가 없으면 body 첫 번째 자식으로 삽입
            document.body.insertAdjacentHTML('afterbegin', headerHTML);
        }

        // 모바일 사이드바 삽입
        const sidebarHTML = this.generateMobileSidebarHTML();
        const sidebarPlaceholder = document.getElementById('sidebar-placeholder');
        if (sidebarPlaceholder) {
            sidebarPlaceholder.outerHTML = sidebarHTML;
        } else {
            // placeholder가 없으면 헤더 다음에 삽입
            const header = document.querySelector('header');
            if (header) {
                header.insertAdjacentHTML('afterend', sidebarHTML);
            }
        }

        // 이벤트 리스너 초기화
        this.initializeEventListeners();
    }

    // 이벤트 리스너 초기화
    initializeEventListeners() {
        // 스무스 스크롤
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
                HeaderComponent.closeMobileSidebar();
            });
        });

        // ESC 키로 사이드바 닫기
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                HeaderComponent.closeMobileSidebar();
            }
        });

        // 스크롤 이벤트 리스너
        this.initializeScrollListener();
    }

    // 스크롤 이벤트 리스너 초기화
    initializeScrollListener() {
        if (this.pageType === 'blog') {
            // 블로그 페이지용 간단한 스크롤 리스너
            window.addEventListener('scroll', () => {
                const header = document.querySelector('header');
                const sidebar = document.getElementById('mobileSidebar');
                
                if (window.scrollY > 50) {
                    // 스크롤이 조금 내려가면 다크 모드
                    header.classList.add('header-dark');
                    sidebar.classList.add('dark');
                } else {
                    // 페이지 상단일 때 - 화이트 모드  
                    header.classList.remove('header-dark');
                    sidebar.classList.remove('dark');
                }
            });
        } else {
            // 메인 페이지용 스크롤 리스너 (헤더 색상 변경만)
            window.addEventListener('scroll', () => {
                const header = document.querySelector('header');
                const heroSection = document.getElementById('home');
                const sidebar = document.getElementById('mobileSidebar');
                
                // 헤더 색상 변경 - 섹션별로 다른 모드 적용
                if (heroSection) {
                    const heroRect = heroSection.getBoundingClientRect();
                    
                    // 갤러리 섹션에서는 화이트 모드 적용
                    const exhibitionSection = document.getElementById('exhibition');
                    if (exhibitionSection) {
                        const exhibitionRect = exhibitionSection.getBoundingClientRect();
                        if (exhibitionRect.top <= 100 && exhibitionRect.bottom >= 100) {
                            // 갤러리 섹션이 현재 뷰포트에 있을 때 - 화이트 모드
                            header.classList.remove('header-dark');
                            sidebar.classList.remove('dark');
                            return;
                        }
                    }
                    
                    if (heroRect.bottom <= 0) {
                        // 히어로 섹션이 완전히 지나갔을 때 - 다크 모드
                        header.classList.add('header-dark');
                        sidebar.classList.add('dark');
                    } else {
                        // 히어로 섹션이 아직 보일 때 - 화이트 모드
                        header.classList.remove('header-dark');
                        sidebar.classList.remove('dark');
                    }
                }
            });
        }
    }

    // 정적 메서드들 (전역에서 사용 가능)
    static toggleMobileSidebar() {
        const sidebar = document.getElementById('mobileSidebar');
        sidebar.classList.add('active');
        document.body.style.overflow = 'hidden'; // 스크롤 방지
    }

    static closeMobileSidebar() {
        const sidebar = document.getElementById('mobileSidebar');
        sidebar.classList.remove('active');
        document.body.style.overflow = ''; // 스크롤 복원
    }

    // 네비게이션 항목 업데이트 (필요시 사용)
    updateNavigation(newItems) {
        this.navigationItems = newItems;
        this.render();
    }
}

// DOM이 로드되면 헤더 컴포넌트 초기화
document.addEventListener('DOMContentLoaded', function() {
    // 페이지 타입 자동 감지
    const pageType = document.body.classList.contains('blog-page') ? 'blog' : 'main';
    const headerComponent = new HeaderComponent(pageType);
    headerComponent.render();
});

// 전역에서 사용할 수 있도록 window 객체에 할당
window.HeaderComponent = HeaderComponent;