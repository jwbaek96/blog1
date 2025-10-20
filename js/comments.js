// Comments System for Blog Posts
// Handles comment display, creation, and deletion with 2-level structure

class CommentsSystem {
    constructor() {
        this.postId = null;
        this.comments = [];
        this.isAdmin = false;
        this.currentDeleteCommentId = null;
        
        // 성능 향상: 캐싱 설정
        this.commentsCache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5분 캐시
        
        // 보안 설정
        this.lastCommentTime = 0;
        this.commentCooldown = 10000; // 10초 쿨다운
        this.maxCommentsPerSession = 10; // 세션당 최대 댓글 수
        this.sessionCommentCount = 0;
        
        // 금지 단어 목록 (간단한 예시)
        this.bannedWords = [
            '바보', '멍청이', '욕설', 'spam', 'advertisement',
            '광고', '홍보', '도박', '대출', '성인', '불법'
        ];
        
        this.init();
    }
    
    init() {
        console.log('💬 Initializing Comments System...');
        
        // Get post ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        this.postId = urlParams.get('id');
        
        if (!this.postId) {
            console.error('❌ No post ID found');
            return;
        }
        
        // Check admin status
        this.isAdmin = Auth && Auth.isLoggedIn();
        
        // Bind events
        this.bindEvents();
        
        // Setup realtime validation
        this.setupRealtimeValidation();
        
        // Initialize comments system and load comments
        this.initializeAndLoadComments();
    }
    
    bindEvents() {
        // 댓글 작성
        const submitBtn = document.getElementById('submitComment');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.submitComment());
        }
        
        // 엔터키로 댓글 작성
        const contentTextarea = document.getElementById('commentContent');
        if (contentTextarea) {
            contentTextarea.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.key === 'Enter') {
                    this.submitComment();
                }
            });
            
            // 글자 수 카운터
            contentTextarea.addEventListener('input', () => {
                this.updateCharCount();
            });
        }
        
        // 삭제 모달 이벤트
        const confirmDeleteBtn = document.getElementById('confirmDelete');
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', () => this.confirmDelete());
        }
        
        // 삭제 모달 엔터키
        const deletePasswordInput = document.getElementById('deletePassword');
        if (deletePasswordInput) {
            deletePasswordInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.confirmDelete();
                }
            });
        }
    }
    
    async initializeAndLoadComments() {
        try {
            console.log('� Initializing comments system...');
            
            // Show loading
            this.showLoading();
            
            // 초기화 호출 제거 - 댓글 로드만으로 충분함 (성능 향상)
            // const initUrl = `${CONFIG.APPS_SCRIPT_URL}?action=init&timestamp=${Date.now()}`;
            // const initResponse = await fetch(initUrl);
            
            // if (initResponse.ok) {
            //     const initResult = await initResponse.json();
            //     if (initResult.success) {
            //         console.log('✅ Comments system initialized');
            //     } else {
            //         console.warn('⚠️ Comments system init warning:', initResult.error);
            //     }
            // }
            
            // Load comments
            await this.loadComments();
            
        } catch (error) {
            console.error('❌ Error loading comments system:', error);
            this.showError('댓글을 불러오는데 실패했습니다.');
        }
    }

    async loadComments(forceRefresh = false) {
        try {
            console.log('📥 Loading comments for post:', this.postId);
            
            // CONFIG.APPS_SCRIPT_URL 확인
            if (!CONFIG || !CONFIG.APPS_SCRIPT_URL) {
                console.warn('⚠️ APPS_SCRIPT_URL not available, waiting for config...');
                
                // CONFIG 로딩 완료를 기다림
                await new Promise((resolve) => {
                    if (CONFIG && CONFIG.APPS_SCRIPT_URL) {
                        resolve();
                        return;
                    }
                    
                    const checkConfig = () => {
                        if (CONFIG && CONFIG.APPS_SCRIPT_URL) {
                            window.removeEventListener('configLoaded', checkConfig);
                            resolve();
                        }
                    };
                    
                    window.addEventListener('configLoaded', checkConfig);
                    
                    // 5초 타임아웃
                    setTimeout(() => {
                        window.removeEventListener('configLoaded', checkConfig);
                        resolve();
                    }, 5000);
                });
                
                if (!CONFIG || !CONFIG.APPS_SCRIPT_URL) {
                    throw new Error('APPS_SCRIPT_URL이 설정되지 않았습니다. Supabase에서 GOOGLE_APPS_SCRIPT_URL을 확인해주세요.');
                }
            }
            
            console.log('🔗 Using APPS_SCRIPT_URL:', CONFIG.APPS_SCRIPT_URL);
            
            // 캐시 확인 (성능 향상)
            if (!forceRefresh && this.commentsCache.has(this.postId)) {
                const cached = this.commentsCache.get(this.postId);
                const now = Date.now();
                
                if (now - cached.timestamp < this.cacheTimeout) {
                    console.log('⚡ Using cached comments');
                    this.comments = cached.data;
                    this.renderComments();
                    this.showCommentsSection();
                    return;
                }
            }
            
            const response = await fetch(`${CONFIG.APPS_SCRIPT_URL}?action=getComments&postId=${this.postId}&t=${Date.now()}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                this.comments = result.data || [];
                
                // 캐시에 저장
                this.commentsCache.set(this.postId, {
                    data: this.comments,
                    timestamp: Date.now()
                });
                
                this.renderComments();
                this.showCommentsSection();
            } else {
                throw new Error(result.error || 'Failed to load comments');
            }
            
        } catch (error) {
            console.error('❌ Error loading comments:', error);
            this.showError('댓글을 불러오는데 실패했습니다.');
        }
    }
    
    renderComments() {
        const commentsList = document.getElementById('commentsList');
        const commentCount = document.getElementById('commentCount');
        
        if (!commentsList || !commentCount) return;
        
        // 삭제되지 않은 댓글 수 계산
        const activeComments = this.comments.filter(c => !c.isDeleted);
        commentCount.textContent = `(${activeComments.length})`;
        
        if (this.comments.length === 0) {
            commentsList.innerHTML = `
                <div class="empty-comments">
                    <i class="fas fa-comments"></i>
                    <p>첫 번째 댓글을 작성해보세요!</p>
                </div>
            `;
            return;
        }
        
        // 댓글을 ID 순으로 정렬 (자연 정렬)
        const sortedComments = this.comments.sort((a, b) => {
            return this.naturalSort(a.id, b.id);
        });
        
        let html = '';
        
        sortedComments.forEach(comment => {
            if (comment.depth === 0 && !comment.isDeleted) {
                // 원댓글 컨테이너 시작
                html += '<div class="comment-container">';
                
                // 원댓글 렌더링
                html += this.renderComment(comment);
                
                // 답글 작성 폼 추가 (원댓글에만)
                html += this.renderReplyForm(comment.id);
                
                // 해당 댓글의 답글들 렌더링 (삭제되지 않은 것만)
                const replies = sortedComments.filter(c => c.parentId === comment.id && !c.isDeleted);
                if (replies.length > 0) {
                    html += '<div class="replies">';
                    replies.forEach(reply => {
                        html += this.renderComment(reply);
                    });
                    html += '</div>';
                }
                
                // 원댓글 컨테이너 종료
                html += '</div>';
            }
        });
        
        commentsList.innerHTML = html;
        
        // 이벤트 바인딩
        this.bindCommentEvents();
    }
    
    renderComment(comment) {
        const isAdmin = comment.type === 'admin';
        const isReply = comment.depth > 0;
        
        const adminBadge = isAdmin ? '<span class="admin-badge">관리자</span>' : '';
        const replyClass = isReply ? 'reply' : '';
        const adminClass = isAdmin ? 'admin' : '';
        
        // 작업 버튼들
        let actionButtons = '';
        if (!isReply && !isAdmin) {
            // 원댓글에만 답글 버튼
            actionButtons += `<button class="reply-btn" data-parent-id="${comment.id}">답글</button>`;
        }
        if (!isAdmin || this.isAdmin) {
            // 모든 댓글에 삭제 버튼 (관리자 댓글은 관리자만)
            actionButtons += `<button class="delete-btn" data-comment-id="${comment.id}">삭제</button>`;
        }
        
        return `
            <div class="comment-item ${replyClass} ${adminClass}" data-comment-id="${comment.id}">
                <div class="comment-header">
                    <div class="comment-meta">
                        ${adminBadge}<span class="comment-author">${this.escapeHtml(comment.author)}</span>
                        <span class="comment-date">${this.formatDate(comment.createdAt)}</span>
                    </div>
                    <div class="comment-actions">
                        ${actionButtons}
                    </div>
                </div>
                <div class="comment-content">${this.escapeHtml(comment.content)}</div>
            </div>
        `;
    }
    
    renderReplyForm(parentId) {
        return `
            <div class="reply-form hidden" data-parent-id="${parentId}">
                <div class="form-row">
                    <input type="text" class="reply-author" placeholder="닉네임 (2-20자)" maxlength="20" required>
                    <input type="password" class="reply-password" placeholder="비밀번호 (숫자 4자리)" maxlength="4" minlength="4" pattern="[0-9]{4}" required>
                </div>
                <textarea class="reply-content" placeholder="답글을 입력하세요..." maxlength="500" required></textarea>
                <div class="form-actions">
                    <button class="btn btn-primary submit-reply">답글 작성</button>
                    <button class="btn btn-secondary cancel-reply">취소</button>
                </div>
            </div>
        `;
    }
    
    bindCommentEvents() {
        // 답글 버튼
        const replyBtns = document.querySelectorAll('.reply-btn');
        console.log('🔗 Found reply buttons:', replyBtns.length);
        
        replyBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const parentId = e.target.getAttribute('data-parent-id');
                console.log('🖱️ Reply button clicked, parentId:', parentId);
                
                this.toggleReplyForm(parentId);
            });
        });
        
        // 삭제 버튼
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const commentId = e.target.getAttribute('data-comment-id');
                this.showDeleteModal(commentId);
            });
        });
        
        // 답글 작성 버튼
        document.querySelectorAll('.submit-reply').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const form = e.target.closest('.reply-form');
                const parentId = form.getAttribute('data-parent-id');
                this.submitReply(parentId, form);
            });
        });
        
        // 답글 취소 버튼
        document.querySelectorAll('.cancel-reply').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const form = e.target.closest('.reply-form');
                this.hideReplyForm(form);
            });
        });
    }
    
    async submitComment() {
        const authorInput = document.getElementById('commentAuthor');
        const passwordInput = document.getElementById('commentPassword');
        const contentInput = document.getElementById('commentContent');
        const submitBtn = document.getElementById('submitComment');
        
        const author = authorInput.value.trim();
        const password = passwordInput.value.trim();
        const content = contentInput.value.trim();
        
        // 보안 검증
        const securityCheck = this.validateCommentSecurity(author, password, content);
        if (!securityCheck.isValid) {
            alert(securityCheck.message);
            if (securityCheck.focusField) {
                securityCheck.focusField.focus();
            }
            return;
        }
        
        // 스팸 방지 - 쿨다운 체크
        const now = Date.now();
        if (now - this.lastCommentTime < this.commentCooldown) {
            const remainingTime = Math.ceil((this.commentCooldown - (now - this.lastCommentTime)) / 1000);
            alert(`너무 빠르게 댓글을 작성하고 있습니다. ${remainingTime}초 후에 다시 시도하세요.`);
            return;
        }
        
        // 세션당 댓글 수 제한
        if (this.sessionCommentCount >= this.maxCommentsPerSession) {
            alert('한 세션에서 너무 많은 댓글을 작성했습니다. 페이지를 새로고침한 후 다시 시도하세요.');
            return;
        }
        
        try {
            submitBtn.disabled = true;
            submitBtn.classList.add('loading');
            
            // CONFIG.APPS_SCRIPT_URL 확인
            if (!CONFIG || !CONFIG.APPS_SCRIPT_URL) {
                console.warn('⚠️ APPS_SCRIPT_URL not available for comment submission, waiting for config...');
                
                // CONFIG 로딩 완료를 기다림
                await new Promise((resolve) => {
                    if (CONFIG && CONFIG.APPS_SCRIPT_URL) {
                        resolve();
                        return;
                    }
                    
                    const checkConfig = () => {
                        if (CONFIG && CONFIG.APPS_SCRIPT_URL) {
                            window.removeEventListener('configLoaded', checkConfig);
                            resolve();
                        }
                    };
                    
                    window.addEventListener('configLoaded', checkConfig);
                    
                    // 5초 타임아웃
                    setTimeout(() => {
                        window.removeEventListener('configLoaded', checkConfig);
                        resolve();
                    }, 5000);
                });
                
                if (!CONFIG || !CONFIG.APPS_SCRIPT_URL) {
                    throw new Error('APPS_SCRIPT_URL이 설정되지 않았습니다. Supabase에서 GOOGLE_APPS_SCRIPT_URL을 확인해주세요.');
                }
            }
            
            const commentData = {
                postId: this.postId,
                author: author,
                password: password,
                content: content,
                parentId: null
            };
            
            // GET 방식으로 변경 (URL 인코딩 사용)
            const params = new URLSearchParams({
                action: 'addComment',
                postId: commentData.postId,
                author: commentData.author,
                password: commentData.password,
                content: commentData.content,
                parentId: commentData.parentId || '',
                timestamp: Date.now()
            });
            
            console.log('🔗 Submitting comment to:', CONFIG.APPS_SCRIPT_URL);
            const response = await fetch(`${CONFIG.APPS_SCRIPT_URL}?${params.toString()}`);
            
            const result = await response.json();
            
            if (result.success) {
                // 폼 초기화
                authorInput.value = '';
                passwordInput.value = '';
                contentInput.value = '';
                this.updateCharCount();
                
                // 댓글 목록 새로고침 (캐시 무효화)
                await this.loadComments(true);
                
                // 성공 시 쿨다운 업데이트
                this.lastCommentTime = Date.now();
                this.sessionCommentCount++;
                
                alert('댓글이 작성되었습니다.');
            } else {
                throw new Error(result.error || 'Failed to add comment');
            }
            
        } catch (error) {
            console.error('❌ Error adding comment:', error);
            alert('댓글 작성에 실패했습니다.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
        }
    }
    
    async submitReply(parentId, form) {
        const authorInput = form.querySelector('.reply-author');
        const passwordInput = form.querySelector('.reply-password');
        const contentInput = form.querySelector('.reply-content');
        const submitBtn = form.querySelector('.submit-reply');
        
        const author = authorInput.value.trim();
        const password = passwordInput.value.trim();
        const content = contentInput.value.trim();
        
        // 유효성 검사
        if (!author || !password || !content) {
            alert('모든 필드를 입력하세요.');
            return;
        }
        
        try {
            submitBtn.disabled = true;
            submitBtn.classList.add('loading');
            
            // CONFIG.APPS_SCRIPT_URL 확인
            if (!CONFIG || !CONFIG.APPS_SCRIPT_URL) {
                console.warn('⚠️ APPS_SCRIPT_URL not available for reply submission, waiting for config...');
                
                // CONFIG 로딩 완료를 기다림
                await new Promise((resolve) => {
                    if (CONFIG && CONFIG.APPS_SCRIPT_URL) {
                        resolve();
                        return;
                    }
                    
                    const checkConfig = () => {
                        if (CONFIG && CONFIG.APPS_SCRIPT_URL) {
                            window.removeEventListener('configLoaded', checkConfig);
                            resolve();
                        }
                    };
                    
                    window.addEventListener('configLoaded', checkConfig);
                    
                    // 5초 타임아웃
                    setTimeout(() => {
                        window.removeEventListener('configLoaded', checkConfig);
                        resolve();
                    }, 5000);
                });
                
                if (!CONFIG || !CONFIG.APPS_SCRIPT_URL) {
                    throw new Error('APPS_SCRIPT_URL이 설정되지 않았습니다. Supabase에서 GOOGLE_APPS_SCRIPT_URL을 확인해주세요.');
                }
            }
            
            const commentData = {
                postId: this.postId,
                author: author,
                password: password,
                content: content,
                parentId: parentId
            };
            
            // GET 방식으로 변경 (URL 인코딩 사용)
            const params = new URLSearchParams({
                action: 'addComment',
                postId: commentData.postId,
                author: commentData.author,
                password: commentData.password,
                content: commentData.content,
                parentId: commentData.parentId || '',
                timestamp: Date.now()
            });
            
            console.log('🔗 Submitting reply to:', CONFIG.APPS_SCRIPT_URL);
            const response = await fetch(`${CONFIG.APPS_SCRIPT_URL}?${params.toString()}`);
            
            const result = await response.json();
            
            if (result.success) {
                // 폼 숨기기 및 초기화
                this.hideReplyForm(form);
                
                // 댓글 목록 새로고침 (캐시 무효화)
                await this.loadComments(true);
                
                alert('답글이 작성되었습니다.');
            } else {
                throw new Error(result.error || 'Failed to add reply');
            }
            
        } catch (error) {
            console.error('❌ Error adding reply:', error);
            alert('답글 작성에 실패했습니다.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
        }
    }
    
    toggleReplyForm(parentId) {
        console.log('🔄 Toggle reply form for parentId:', parentId);
        
        // 모든 답글 폼 확인
        const allForms = document.querySelectorAll('.reply-form');
        console.log('📋 All reply forms found:', allForms.length);
        
        const form = document.querySelector(`.reply-form[data-parent-id="${parentId}"]`);
        if (!form) {
            console.error('❌ Reply form not found for parentId:', parentId);
            console.log('Available forms:', Array.from(allForms).map(f => f.getAttribute('data-parent-id')));
            return;
        }
        
        console.log('📋 Found form:', form);
        console.log('📋 Form classes:', form.className);
        console.log('📋 Form parent ID attribute:', form.getAttribute('data-parent-id'));
        
        // 현재 숨김 상태 확인 (CSS 클래스 기준)
        const isHidden = form.classList.contains('hidden');
        
        console.log('👀 Form visibility states:', {
            'hasHiddenClass': isHidden,
            'classList': form.className
        });
        
        if (isHidden) {
            console.log('📖 Showing reply form');
            
            // 다른 답글 폼들 모두 숨기기
            document.querySelectorAll('.reply-form').forEach(f => {
                if (f !== form) {
                    f.classList.add('hidden');
                }
            });
            
            // 현재 폼 표시
            form.classList.remove('hidden');
            
            console.log('📖 After showing - classes:', form.className);
            
            // 첫 번째 입력 필드에 포커스
            setTimeout(() => {
                const authorInput = form.querySelector('.reply-author');
                if (authorInput) {
                    authorInput.focus();
                    console.log('🎯 Focus set to author input');
                }
            }, 100);
        } else {
            console.log('📕 Hiding reply form');
            form.classList.add('hidden');
        }
    }
    
    hideReplyForm(form) {
        form.classList.add('hidden');
        form.querySelector('.reply-author').value = '';
        form.querySelector('.reply-password').value = '';
        form.querySelector('.reply-content').value = '';
    }
    
    showDeleteModal(commentId) {
        this.currentDeleteCommentId = commentId;
        const modal = document.getElementById('deleteModal');
        const passwordInput = document.getElementById('deletePassword');
        const errorDiv = document.getElementById('deleteError');
        
        passwordInput.value = '';
        errorDiv.style.display = 'none';
        modal.style.display = 'flex';
        passwordInput.focus();
    }
    
    closeDeleteModal() {
        const modal = document.getElementById('deleteModal');
        modal.style.display = 'none';
        this.currentDeleteCommentId = null;
    }
    
    async confirmDelete() {
        const passwordInput = document.getElementById('deletePassword');
        const errorDiv = document.getElementById('deleteError');
        const confirmBtn = document.getElementById('confirmDelete');
        
        const password = passwordInput.value.trim();
        
        if (!password) {
            this.showDeleteError('비밀번호를 입력하세요.');
            return;
        }
        
        try {
            confirmBtn.disabled = true;
            confirmBtn.classList.add('loading');
            
            // CONFIG.APPS_SCRIPT_URL 확인
            if (!CONFIG || !CONFIG.APPS_SCRIPT_URL) {
                console.warn('⚠️ APPS_SCRIPT_URL not available for comment deletion, waiting for config...');
                
                // CONFIG 로딩 완료를 기다림
                await new Promise((resolve) => {
                    if (CONFIG && CONFIG.APPS_SCRIPT_URL) {
                        resolve();
                        return;
                    }
                    
                    const checkConfig = () => {
                        if (CONFIG && CONFIG.APPS_SCRIPT_URL) {
                            window.removeEventListener('configLoaded', checkConfig);
                            resolve();
                        }
                    };
                    
                    window.addEventListener('configLoaded', checkConfig);
                    
                    // 5초 타임아웃
                    setTimeout(() => {
                        window.removeEventListener('configLoaded', checkConfig);
                        resolve();
                    }, 5000);
                });
                
                if (!CONFIG || !CONFIG.APPS_SCRIPT_URL) {
                    throw new Error('APPS_SCRIPT_URL이 설정되지 않았습니다. Supabase에서 GOOGLE_APPS_SCRIPT_URL을 확인해주세요.');
                }
            }
            
            // GET 방식으로 변경 (URL 인코딩 사용)
            const params = new URLSearchParams({
                action: 'deleteComment',
                postId: this.postId,
                commentId: this.currentDeleteCommentId,
                password: password,
                isAdmin: this.isAdmin || false,
                timestamp: Date.now()
            });
            
            console.log('🔗 Deleting comment via:', CONFIG.APPS_SCRIPT_URL);
            const response = await fetch(`${CONFIG.APPS_SCRIPT_URL}?${params.toString()}`);
            
            const result = await response.json();
            
            if (result.success) {
                this.closeDeleteModal();
                await this.loadComments(true);
                alert('댓글이 삭제되었습니다.');
            } else {
                this.showDeleteError(result.error || '삭제에 실패했습니다.');
            }
            
        } catch (error) {
            console.error('❌ Error deleting comment:', error);
            this.showDeleteError('삭제 중 오류가 발생했습니다.');
        } finally {
            confirmBtn.disabled = false;
            confirmBtn.classList.remove('loading');
        }
    }
    
    showDeleteError(message) {
        const errorDiv = document.getElementById('deleteError');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
    
    updateCharCount() {
        const contentInput = document.getElementById('commentContent');
        const charCountSpan = document.querySelector('.char-count');
        
        if (!contentInput || !charCountSpan) return;
        
        const length = contentInput.value.length;
        charCountSpan.textContent = `${length}/500`;
        
        // 색상 변경
        charCountSpan.classList.remove('warning', 'danger');
        if (length > 400) {
            charCountSpan.classList.add('danger');
        } else if (length > 300) {
            charCountSpan.classList.add('warning');
        }
    }
    
    showCommentsSection() {
        const section = document.getElementById('commentsSection');
        if (section) {
            section.style.display = 'block';
        }
    }
    
    showLoading() {
        const commentsList = document.getElementById('commentsList');
        if (commentsList) {
            commentsList.innerHTML = `
                <div class="comment-loading">
                    <div class="comment-spinner"></div>
                </div>
            `;
        }
    }
    
    showError(message) {
        const commentsList = document.getElementById('commentsList');
        if (commentsList) {
            commentsList.innerHTML = `
                <div class="empty-comments">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${message}</p>
                </div>
            `;
        }
    }
    
    // 유틸리티 함수들
    naturalSort(a, b) {
        return a.localeCompare(b, undefined, {
            numeric: true,
            sensitivity: 'base'
        });
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        
        // 1분 미만
        if (diff < 60000) {
            return '방금 전';
        }
        
        // 1시간 미만
        if (diff < 3600000) {
            const minutes = Math.floor(diff / 60000);
            return `${minutes}분 전`;
        }
        
        // 1일 미만
        if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return `${hours}시간 전`;
        }
        
        // 1일 이상
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    
    // 보안 검증 메서드들
    validateCommentSecurity(author, password, content) {
        const authorInput = document.getElementById('commentAuthor');
        const passwordInput = document.getElementById('commentPassword');
        const contentInput = document.getElementById('commentContent');
        
        // 기본 유효성 검사
        if (!author) {
            return { 
                isValid: false, 
                message: '닉네임을 입력하세요.', 
                focusField: authorInput 
            };
        }
        
        if (!password) {
            return { 
                isValid: false, 
                message: '비밀번호를 입력하세요.', 
                focusField: passwordInput 
            };
        }
        
        if (!content) {
            return { 
                isValid: false, 
                message: '댓글 내용을 입력하세요.', 
                focusField: contentInput 
            };
        }
        
        // 길이 제한 검사
        if (author.length > 20) {
            return { 
                isValid: false, 
                message: '닉네임은 20자 이내로 입력하세요.', 
                focusField: authorInput 
            };
        }
        
        if (password.length !== 4) {
            return { 
                isValid: false, 
                message: '비밀번호는 숫자 4자리로 입력하세요.', 
                focusField: passwordInput 
            };
        }
        
        // 숫자만 허용 검사
        if (!/^\d{4}$/.test(password)) {
            return { 
                isValid: false, 
                message: '비밀번호는 숫자 4자리만 입력 가능합니다.', 
                focusField: passwordInput 
            };
        }
        
        if (content.length > 500) {
            return { 
                isValid: false, 
                message: '댓글은 500자 이내로 입력하세요.', 
                focusField: contentInput 
            };
        }
        
        // 특수 문자 및 패턴 검사
        if (!this.validateAuthor(author)) {
            return { 
                isValid: false, 
                message: '닉네임에 부적절한 문자가 포함되어 있습니다.', 
                focusField: authorInput 
            };
        }
        
        if (!this.validatePassword(password)) {
            return { 
                isValid: false, 
                message: '비밀번호에 부적절한 문자가 포함되어 있습니다.', 
                focusField: passwordInput 
            };
        }
        
        // 금지 단어 검사
        const bannedWordCheck = this.checkBannedWords(content);
        if (!bannedWordCheck.isValid) {
            return { 
                isValid: false, 
                message: `부적절한 단어가 포함되어 있습니다: ${bannedWordCheck.word}`, 
                focusField: contentInput 
            };
        }
        
        // HTML 태그 검사
        if (this.containsHtml(content)) {
            return { 
                isValid: false, 
                message: 'HTML 태그는 사용할 수 없습니다.', 
                focusField: contentInput 
            };
        }
        
        // 스팸 패턴 검사
        if (this.isSpamContent(content)) {
            return { 
                isValid: false, 
                message: '스팸으로 의심되는 내용입니다.', 
                focusField: contentInput 
            };
        }
        
        return { isValid: true };
    }
    
    validateAuthor(author) {
        // 닉네임 유효성 검사
        // 한글, 영문, 숫자, 일부 특수문자만 허용
        const authorPattern = /^[가-힣a-zA-Z0-9\s._-]+$/;
        return authorPattern.test(author) && !author.includes('관리자');
    }
    
    validatePassword(password) {
        // 비밀번호 유효성 검사
        // 기본적인 문자들만 허용 (보안상 너무 복잡하게 하지 않음)
        const passwordPattern = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/;
        return passwordPattern.test(password);
    }
    
    checkBannedWords(content) {
        const lowerContent = content.toLowerCase();
        
        for (const word of this.bannedWords) {
            if (lowerContent.includes(word.toLowerCase())) {
                return { isValid: false, word: word };
            }
        }
        
        return { isValid: true };
    }
    
    containsHtml(content) {
        // HTML 태그 검사
        const htmlPattern = /<[^>]*>/g;
        return htmlPattern.test(content);
    }
    
    isSpamContent(content) {
        // 스팸 패턴 검사
        const spamPatterns = [
            /(.)\1{4,}/g, // 같은 문자 5번 이상 반복
            /[^\w\s가-힣]{5,}/g, // 특수문자 5개 이상 연속
            /(http|www|\.com|\.kr|\.net)/i, // URL 패턴
            /(\d{2,3}-?\d{3,4}-?\d{4})/g, // 전화번호 패턴
            /(광고|홍보|대출|카지노|바카라)/i // 스팸 키워드
        ];
        
        return spamPatterns.some(pattern => pattern.test(content));
    }
    
    // XSS 방지를 위한 HTML 이스케이프 강화
    escapeHtml(text) {
        if (!text) return '';
        
        const div = document.createElement('div');
        div.textContent = text;
        
        // 추가 이스케이프 처리
        return div.innerHTML
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/`/g, '&#96;')
            .replace(/\(/g, '&#40;')
            .replace(/\)/g, '&#41;');
    }
    
    // 입력 필드 실시간 검증
    setupRealtimeValidation() {
        const authorInput = document.getElementById('commentAuthor');
        const passwordInput = document.getElementById('commentPassword');
        const contentInput = document.getElementById('commentContent');
        
        if (authorInput) {
            authorInput.addEventListener('input', (e) => {
                this.validateFieldRealtime(e.target, 'author');
            });
        }
        
        if (passwordInput) {
            passwordInput.addEventListener('input', (e) => {
                this.validateFieldRealtime(e.target, 'password');
            });
        }
        
        if (contentInput) {
            contentInput.addEventListener('input', (e) => {
                this.validateFieldRealtime(e.target, 'content');
            });
        }
    }
    
    validateFieldRealtime(field, type) {
        const value = field.value;
        let isValid = true;
        let message = '';
        
        // 필드별 실시간 검증
        switch (type) {
            case 'author':
                if (value.length > 20) {
                    isValid = false;
                    message = '닉네임은 20자 이내로 입력하세요.';
                } else if (value && !this.validateAuthor(value)) {
                    isValid = false;
                    message = '닉네임에 부적절한 문자가 있습니다.';
                }
                break;
                
            case 'password':
                if (value.length > 20) {
                    isValid = false;
                    message = '비밀번호는 20자 이내로 입력하세요.';
                } else if (value && value.length < 4) {
                    message = '비밀번호는 4자 이상 입력하세요.';
                } else if (value && !this.validatePassword(value)) {
                    isValid = false;
                    message = '비밀번호에 부적절한 문자가 있습니다.';
                }
                break;
                
            case 'content':
                if (value.length > 500) {
                    isValid = false;
                    message = '댓글은 500자 이내로 입력하세요.';
                } else if (value && this.containsHtml(value)) {
                    isValid = false;
                    message = 'HTML 태그는 사용할 수 없습니다.';
                }
                break;
        }
        
        // UI 피드백
        this.showFieldValidation(field, isValid, message);
    }
    
    showFieldValidation(field, isValid, message) {
        // 기존 메시지 제거
        const existingMsg = field.parentElement.querySelector('.validation-message');
        if (existingMsg) {
            existingMsg.remove();
        }
        
        // 필드 스타일 업데이트
        field.classList.remove('invalid', 'valid');
        
        if (message) {
            field.classList.add(isValid ? 'valid' : 'invalid');
            
            // 메시지 표시
            if (!isValid) {
                const msgElement = document.createElement('div');
                msgElement.className = 'validation-message error';
                msgElement.textContent = message;
                field.parentElement.appendChild(msgElement);
            }
        }
    }
}

// 전역 함수들 (HTML에서 호출)
function closeDeleteModal() {
    if (window.commentsSystem) {
        window.commentsSystem.closeDeleteModal();
    }
}

// 페이지 로드 시 댓글 시스템 초기화
// 초기화 - 설정 로딩을 기다림
function initializeCommentsSystem() {
    // 포스트 페이지에서만 초기화
    if (document.getElementById('commentsSection')) {
        console.log('💬 Config loaded, initializing Comments System...');
        window.commentsSystem = new CommentsSystem();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // CONFIG가 이미 로드된 경우 바로 초기화
    if (CONFIG && CONFIG.APPS_SCRIPT_URL) {
        initializeCommentsSystem();
    } else {
        // 설정 로딩 완료를 기다림
        window.addEventListener('configLoaded', initializeCommentsSystem);
    }
});

// Export for global access
if (typeof window !== 'undefined') {
    window.CommentsSystem = CommentsSystem;
}