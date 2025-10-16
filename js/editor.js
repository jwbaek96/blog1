// Rich Text Editor Implementation

class RichTextEditor {
    constructor(editorId) {
        this.editor = document.getElementById(editorId);
        this.toolbar = document.querySelector('.editor-toolbar');
        this.isInitialized = false;
        this.isCodeView = false;
        this.originalContent = '';
        
        if (this.editor) {
            this.init();
        }
    }

    /**
     * Initialize the editor
     */
    init() {
        if (this.isInitialized) return;
        
        this.setupEditor();
        this.setupToolbar();
        this.setupKeyboardShortcuts();
        this.setupDragAndDrop();
        this.setupAutoSave();
        this.initializeHighlightButton();
        
        this.isInitialized = true;
        console.log('✅ Rich Text Editor initialized');
    }

    /**
     * Setup editor element
     */
    setupEditor() {
        // Enable contenteditable
        this.editor.contentEditable = true;
        
        // Set initial content if empty
        if (!this.editor.innerHTML.trim() || this.editor.innerHTML === '<p>여기에 내용을 작성하세요...</p>' || this.editor.innerHTML === '<p>여기에 텍스트를 입력하세요...</p>') {
            this.editor.innerHTML = '<div><br></div>';
        }

        // Focus event
        this.editor.addEventListener('focus', () => {
            if (this.editor.innerHTML === '<p>여기에 내용을 작성하세요...</p>' || this.editor.innerHTML === '<p>여기에 텍스트를 입력하세요...</p>') {
                this.editor.innerHTML = '<div><br></div>';
            }
        });

        // Blur event - handle empty editor
        this.editor.addEventListener('blur', () => {
            if (this.editor.innerHTML.trim() === '') {
                this.editor.innerHTML = '<div><br></div>';
            }
        });

        // Paste event - clean pasted content
        this.editor.addEventListener('paste', (e) => {
            e.preventDefault();
            const text = e.clipboardData.getData('text/plain');
            document.execCommand('insertText', false, text);
        });

        // Input event - update toolbar state
        this.editor.addEventListener('input', () => {
            this.updateToolbarState();
            this.saveToLocalStorage();
        });

        // Selection change event
        document.addEventListener('selectionchange', () => {
            this.updateToolbarState();
        });

        // Initial focus with delay
        setTimeout(() => {
            if (this.editor) {
                this.editor.focus();
            }
        }, 100);

        // Initialize color inputs
        this.initializeColorInputs();
    }

    /**
     * Initialize color input elements
     */
    initializeColorInputs() {
        const textColorInput = document.getElementById('textColor');
        const bgColorInput = document.getElementById('bgColor');
        const textColorBar = document.getElementById('textColorBar');

        if (textColorInput) {
            textColorInput.value = '#000000';
        }
        
        if (bgColorInput) {
            bgColorInput.value = '#ffff00';
        }
        
        if (textColorBar) {
            textColorBar.style.backgroundColor = '#000000';
        }
    }

    /**
     * Setup toolbar buttons
     */
    setupToolbar() {
        if (!this.toolbar) return;

        // Text formatting buttons
        this.toolbar.addEventListener('click', (e) => {
            const button = e.target.closest('.toolbar-btn');
            if (!button) return;

            e.preventDefault();
            this.editor.focus();

            const command = button.dataset.command;
            if (command) {
                this.executeCommand(command);
            }
        });

        // Heading select
        const headingSelect = document.getElementById('headingSelect');
        if (headingSelect) {
            headingSelect.addEventListener('change', (e) => {
                this.editor.focus();
                const value = e.target.value;
                
                if (value) {
                    this.executeCommand('formatBlock', `<${value}>`);
                } else {
                    this.executeCommand('formatBlock', '<div>');
                }
            });
        }

        // Color inputs
        const textColor = document.getElementById('textColor');
        const backgroundColor = document.getElementById('backgroundColor');

        if (textColor) {
            textColor.addEventListener('change', (e) => {
                this.editor.focus();
                this.executeCommand('foreColor', e.target.value);
            });
        }

        if (backgroundColor) {
            backgroundColor.addEventListener('change', (e) => {
                this.editor.focus();
                this.executeCommand('backColor', e.target.value);
            });
        }

        // Media upload buttons
        this.setupMediaUpload();

        // Other toolbar buttons
        this.setupToolbarActions();
    }

    /**
     * Setup media upload functionality
     */
    setupMediaUpload() {
        const imageUpload = document.getElementById('imageUpload');
        const videoUpload = document.getElementById('videoUpload');
        const imageUploadBtn = document.getElementById('imageUploadBtn');
        const videoUploadBtn = document.getElementById('videoUploadBtn');
        const linkBtn = document.getElementById('linkBtn');

        // Image upload
        if (imageUploadBtn && imageUpload) {
            imageUploadBtn.addEventListener('click', () => {
                imageUpload.click();
            });

            imageUpload.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.handleImageUpload(file);
                }
                e.target.value = ''; // Reset input
            });
        }

        // Video upload
        if (videoUploadBtn && videoUpload) {
            videoUploadBtn.addEventListener('click', () => {
                videoUpload.click();
            });

            videoUpload.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.handleVideoUpload(file);
                }
                e.target.value = ''; // Reset input
            });
        }

        // Link button
        if (linkBtn) {
            linkBtn.addEventListener('click', () => {
                this.insertLink();
            });
        }
    }

    /**
     * Setup other toolbar actions
     */
    setupToolbarActions() {
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');
        const clearBtn = document.getElementById('clearBtn');

        if (undoBtn) {
            undoBtn.addEventListener('click', () => {
                this.executeCommand('undo');
            });
        }

        if (redoBtn) {
            redoBtn.addEventListener('click', () => {
                this.executeCommand('redo');
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (confirm('모든 내용을 삭제하시겠습니까?')) {
                    this.editor.innerHTML = '<p><br></p>';
                    this.editor.focus();
                }
            });
        }
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        this.editor.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + shortcuts
            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 'b':
                        e.preventDefault();
                        this.executeCommand('bold');
                        break;
                    case 'i':
                        e.preventDefault();
                        this.executeCommand('italic');
                        break;
                    case 'u':
                        e.preventDefault();
                        this.executeCommand('underline');
                        break;
                    case 'z':
                        e.preventDefault();
                        this.executeCommand('undo');
                        break;
                    case 'y':
                        e.preventDefault();
                        this.executeCommand('redo');
                        break;
                    case 's':
                        e.preventDefault();
                        this.exportHTML();
                        break;
                }
            }

            // Enter key - create new div instead of paragraph
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    
                    // 새로운 div 요소 생성
                    const newDiv = document.createElement('div');
                    newDiv.innerHTML = '<br>'; // 빈 줄을 위한 br 태그
                    
                    // 현재 위치에 새 div 삽입
                    range.deleteContents();
                    range.insertNode(newDiv);
                    
                    // 커서를 새 div 안의 br 뒤로 이동
                    const newRange = document.createRange();
                    newRange.setStartAfter(newDiv.querySelector('br'));
                    newRange.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(newRange);
                    
                    // 스크롤을 새로 생성된 위치로 이동
                    setTimeout(() => {
                        newDiv.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'nearest' 
                        });
                    }, 10);
                }
            }
        });
    }

    /**
     * Setup drag and drop
     */
    setupDragAndDrop() {
        if (window.UploadManager) {
            window.UploadManager.setupDragAndDrop(
                this.editor,
                (file) => this.handleImageUpload(file),
                (file) => this.handleVideoUpload(file)
            );
        }
    }

    /**
     * Setup auto-save to localStorage
     */
    setupAutoSave() {
        // 자동 저장만 설정 (초안 복원 기능 제거)
        
        // Save every 30 seconds
        setInterval(() => {
            this.saveToLocalStorage();
        }, 30000);
        
        // Save on page unload
        window.addEventListener('beforeunload', () => {
            this.saveToLocalStorage();
        });
    }

    /**
     * Execute editor command
     * @param {string} command - Command name
     * @param {string} value - Command value
     */
    executeCommand(command, value = null) {
        try {
            document.execCommand(command, false, value);
            this.updateToolbarState();
        } catch (error) {
            console.error('Command execution error:', error);
        }
    }

    /**
     * Format command wrapper (for backward compatibility)
     * @param {string} cmd - Command name
     * @param {string} value - Command value
     */
    format(cmd, value = null) {
        // 에디터에 포커스 보장
        this.editor.focus();
        
        // 서식 명령 실행 - execCommand는 기본적으로 현재 커서 위치의 서식을 변경함
        this.executeCommand(cmd, value);
        
        // 포커스 유지 (툴바 클릭으로 인한 포커스 손실 방지)
        setTimeout(() => {
            this.editor.focus();
        }, 10);
    }

    /**
     * Change text color
     * @param {string} color - Color value
     */
    changeTextColor(color) {
        this.format('foreColor', color);
        const textColorBar = document.getElementById('textColorBar');
        if (textColorBar) {
            textColorBar.style.backgroundColor = color;
        }
        // 에디터에 포커스를 다시 맞춤
        setTimeout(() => {
            this.editor.focus();
            this.moveCaretToEnd();
        }, 10);
    }

    /**
     * Change background color
     * @param {string} color - Color value
     */
    changeBgColor(color) {
        this.format('hiliteColor', color);
        // bgColorBar는 제거되었으므로 더 이상 업데이트하지 않음
        
        // 에디터에 포커스를 다시 맞춤
        setTimeout(() => {
            this.editor.focus();
            this.moveCaretToEnd();
        }, 10);
    }

    /**
     * Toggle highlight color picker
     */
    toggleHighlight() {
        // 현재 하이라이트 색상 가져오기 (기본값: 노란색)
        const currentColor = this.getCurrentHighlightColor() || '#ffff6b';
        
        // 현재 색상으로 하이라이트 적용
        this.format('hiliteColor', currentColor);
        
        // 색상 선택 팝업 토글
        const colorPicker = document.getElementById('highlightColors');
        const highlightBtn = document.querySelector('.highlight-btn');
        
        if (colorPicker && highlightBtn) {
            const isVisible = colorPicker.style.display !== 'none';
            
            if (isVisible) {
                colorPicker.style.display = 'none';
            } else {
                // 버튼의 위치를 계산하여 팝업 위치 설정
                const btnRect = highlightBtn.getBoundingClientRect();
                
                colorPicker.style.left = btnRect.left + 'px';
                colorPicker.style.top = (btnRect.bottom + 5) + 'px';
                colorPicker.style.display = 'flex';
                
                // 다른 곳 클릭시 닫기
                setTimeout(() => {
                    const closeHandler = (e) => {
                        if (!e.target.closest('.highlight-wrapper')) {
                            colorPicker.style.display = 'none';
                            document.removeEventListener('click', closeHandler);
                        }
                    };
                    document.addEventListener('click', closeHandler);
                }, 100);
            }
        }
        
        // 에디터에 포커스를 다시 맞춤
        setTimeout(() => {
            this.editor.focus();
        }, 10);
    }

    /**
     * Apply specific highlight color
     * @param {string} color - Color value
     */
    applyHighlight(color) {
        this.format('hiliteColor', color);
        
        // 하이라이트 버튼 색상 업데이트
        this.updateHighlightButtonColor(color);
        
        // 색상 선택 팝업 닫기
        const colorPicker = document.getElementById('highlightColors');
        if (colorPicker) {
            colorPicker.style.display = 'none';
        }
        
        // 에디터에 포커스를 다시 맞춤
        setTimeout(() => {
            this.editor.focus();
        }, 10);
    }

    /**
     * Update highlight button color
     * @param {string} color - Color value
     */
    updateHighlightButtonColor(color) {
        const colorDisplay = document.getElementById('highlightColorDisplay');
        if (colorDisplay) {
            colorDisplay.style.backgroundColor = color;
        }
        // 로컬 스토리지에 마지막 선택한 색상 저장
        localStorage.setItem('lastHighlightColor', color);
    }

    /**
     * Get current highlight color from localStorage
     * @returns {string} Current highlight color
     */
    getCurrentHighlightColor() {
        return localStorage.getItem('lastHighlightColor') || '#ffff6b';
    }

    /**
     * Initialize highlight button with saved color
     */
    initializeHighlightButton() {
        const savedColor = this.getCurrentHighlightColor();
        this.updateHighlightButtonColor(savedColor);
    }

    /**
     * Toggle HTML code view
     */
    toggleCodeView() {
        const codeButton = document.getElementById('codeViewToggle');
        const toolbar = document.querySelector('.simple-toolbar');
        
        if (!this.isCodeView) {
            // 텍스트 모드에서 HTML 코드 모드로 전환
            this.originalContent = this.editor.innerHTML;
            const htmlCode = this.formatHTML(this.originalContent);
            this.editor.innerHTML = `<pre class="code-block">${this.escapeHtml(htmlCode)}</pre>`;
            this.editor.contentEditable = false;
            
            // 버튼 상태 변경
            if (codeButton) {
                codeButton.style.backgroundColor = '#007bff';
                codeButton.style.color = 'white';
                codeButton.title = '텍스트 모드로 돌아가기';
            }
            
            // 다른 버튼들 비활성화
            if (toolbar) {
                const buttons = toolbar.querySelectorAll('button:not(#codeViewToggle), select');
                buttons.forEach(btn => btn.disabled = true);
            }
            
            this.isCodeView = true;
        } else {
            // HTML 코드 모드에서 텍스트 모드로 전환
            this.editor.innerHTML = this.originalContent;
            this.editor.contentEditable = true;
            this.editor.focus();
            
            // 버튼 상태 원래대로
            if (codeButton) {
                codeButton.style.backgroundColor = '';
                codeButton.style.color = '';
                codeButton.title = 'HTML 코드 보기';
            }
            
            // 다른 버튼들 활성화
            if (toolbar) {
                const buttons = toolbar.querySelectorAll('button:not(#codeViewToggle), select');
                buttons.forEach(btn => btn.disabled = false);
            }
            
            this.isCodeView = false;
        }
    }

    /**
     * Format HTML with proper indentation
     * @param {string} html - HTML content
     * @returns {string} Formatted HTML
     */
    formatHTML(html) {
        let formatted = html
            .replace(/></g, '>\n<')
            .replace(/\n\s*\n/g, '\n');
        
        let indent = 0;
        const lines = formatted.split('\n');
        const indentedLines = lines.map(line => {
            const trimmed = line.trim();
            if (!trimmed) return '';
            
            if (trimmed.startsWith('</')) {
                indent--;
            }
            
            const indentedLine = '  '.repeat(Math.max(0, indent)) + trimmed;
            
            if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.endsWith('/>')) {
                indent++;
            }
            
            return indentedLine;
        });
        
        return indentedLines.join('\n');
    }

    /**
     * Escape HTML entities
     * @param {string} text - Text to escape
     * @returns {string} Escaped HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Move caret to the end of the editor content
     */
    moveCaretToEnd() {
        try {
            this.editor.focus();
            
            const range = document.createRange();
            const sel = window.getSelection();
            
            // 에디터의 모든 내용을 순회하여 마지막 위치 찾기
            const walker = document.createTreeWalker(
                this.editor,
                NodeFilter.SHOW_ALL,
                null,
                false
            );
            
            let lastNode = null;
            let node;
            while (node = walker.nextNode()) {
                lastNode = node;
            }
            
            if (lastNode) {
                if (lastNode.nodeType === Node.TEXT_NODE) {
                    // 마지막이 텍스트 노드인 경우
                    range.setStart(lastNode, lastNode.textContent.length);
                    range.collapse(true);
                } else if (lastNode.nodeType === Node.ELEMENT_NODE) {
                    // 마지막이 요소 노드인 경우 (예: <br>, <div> 등)
                    range.setStartAfter(lastNode);
                    range.collapse(true);
                }
                
                sel.removeAllRanges();
                sel.addRange(range);
                
                // 스크롤을 마지막 위치로 이동
                this.editor.scrollTop = this.editor.scrollHeight;
                
            } else {
                // 빈 에디터인 경우
                range.selectNodeContents(this.editor);
                range.collapse(false);
                sel.removeAllRanges();
                sel.addRange(range);
            }
            
        } catch (error) {
            console.error('Caret positioning error:', error);
            // 폴백: 에디터 끝으로 이동
            try {
                const range = document.createRange();
                const sel = window.getSelection();
                range.selectNodeContents(this.editor);
                range.collapse(false);
                sel.removeAllRanges();
                sel.addRange(range);
                this.editor.scrollTop = this.editor.scrollHeight;
            } catch (fallbackError) {
                console.error('Fallback caret positioning failed:', fallbackError);
                this.editor.focus();
            }
        }
    }

    /**
     * Update toolbar button states
     */
    updateToolbarState() {
        if (!this.toolbar) return;

        const commands = ['bold', 'italic', 'underline', 'strikeThrough'];
        
        commands.forEach(command => {
            const button = this.toolbar.querySelector(`[data-command="${command}"]`);
            if (button) {
                const isActive = document.queryCommandState(command);
                button.classList.toggle('active', isActive);
            }
        });

        // Update heading select
        const headingSelect = document.getElementById('headingSelect');
        if (headingSelect) {
            try {
                const formatBlock = document.queryCommandValue('formatBlock').toLowerCase();
                const value = formatBlock.replace('<', '').replace('>', '');
                headingSelect.value = ['h1', 'h2', 'h3'].includes(value) ? value : '';
            } catch (e) {
                headingSelect.value = '';
            }
        }
    }

    /**
     * Handle image upload
     * @param {File} file - Image file
     */
    handleImageUpload(file) {
        if (!window.UploadManager) {
            showToast('업로드 기능을 사용할 수 없습니다', 'error');
            return;
        }

        window.UploadManager.handleImageUpload(
            file,
            (imageUrl) => {
                this.insertImage(imageUrl);
            },
            (error) => {
                console.error('Image upload error:', error);
            }
        );
    }

    /**
     * Handle video upload
     * @param {File} file - Video file
     */
    handleVideoUpload(file) {
        if (!window.UploadManager) {
            showToast('업로드 기능을 사용할 수 없습니다', 'error');
            return;
        }

        window.UploadManager.handleVideoUpload(
            file,
            (videoUrl) => {
                this.insertVideo(videoUrl);
            },
            (error) => {
                console.error('Video upload error:', error);
            }
        );
    }

    /**
     * Insert image into editor
     * @param {string} imageUrl - Image URL
     */
    insertImage(imageUrl) {
        // Create DOM elements safely with CSS classes
        const wrapper = document.createElement('div');
        wrapper.className = 'media-wrapper';
        
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = '업로드된 이미지';
        img.loading = 'lazy';
        img.className = 'media-image';
        
        wrapper.appendChild(img);
        
        // Insert the wrapper element directly to avoid innerHTML issues
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(wrapper);
            
            // Move cursor after the inserted element
            range.setStartAfter(wrapper);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
        } else {
            // Fallback: append to editor
            this.editor.appendChild(wrapper);
        }
        
        showToast('이미지가 삽입되었습니다', 'success');
    }

    /**
     * Insert video into editor
     * @param {string} videoUrl - Video URL
     */
    insertVideo(videoUrl) {
        // Extract Google Drive file ID from various URL formats
        let fileId = null;
        
        // Format 1: https://drive.google.com/uc?id=FILE_ID
        let fileIdMatch = videoUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (fileIdMatch) {
            fileId = fileIdMatch[1];
        }
        
        // Format 2: https://drive.google.com/file/d/FILE_ID/view
        if (!fileId) {
            fileIdMatch = videoUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
            if (fileIdMatch) {
                fileId = fileIdMatch[1];
            }
        }

        // Create HTML string with CSS classes - iframe for Google Drive, video for others
        let videoHTML;
        if (fileId) {
            // Google Drive video - use iframe preview mode (구글 드라이브는 iframe으로만 재생 가능)
            videoHTML = `<div class="media-wrapper"><iframe src="https://drive.google.com/file/d/${fileId}/preview" width="100%" height="auto" class="media-video" frameborder="0" allowfullscreen></iframe></div>`;
        } else {
            // Non-Google Drive video URLs - use video tag
            videoHTML = `<div class="media-wrapper"><video controls class="media-video"><source src="${videoUrl}" type="video/mp4">브라우저에서 비디오를 지원하지 않습니다.</video></div>`;
        }

        // Insert using execCommand to ensure proper HTML
        this.executeCommand('insertHTML', videoHTML);

        showToast('동영상이 삽입되었습니다', 'success');
    }

    /**
     * Insert link
     */
    insertLink() {
        const selection = window.getSelection();
        const selectedText = selection.toString();
        
        const url = prompt('링크 URL을 입력하세요:', 'https://');
        if (!url) return;

        const linkText = selectedText || prompt('링크 텍스트를 입력하세요:', url);
        if (!linkText) return;

        const link = `<a href="${url}" target="_blank" rel="noopener noreferrer">${linkText}</a>`;
        this.executeCommand('insertHTML', link);
    }

    /**
     * Get editor content as HTML
     * @param {boolean} minify - Whether to minify the HTML
     * @returns {string} HTML content
     */
    getHTML(minify = false) {
        // Get HTML without aggressive cleaning that removes quotes
        let html = this.editor.innerHTML;
        
        // Only do minimal cleaning to avoid breaking HTML attributes
        html = html.trim();
        
        // Only clean up obvious empty elements
        html = html.replace(/<(p|div)>\s*<\/(p|div)>/gi, '');
        html = html.replace(/<(p|div)>\s*<br\s*\/?>\s*<\/(p|div)>/gi, '');
        
        // Apply minification if requested
        if (minify) {
            html = this.minifyHTML(html);
        }
        
        return html;
    }

    /**
     * Minify HTML content
     * @param {string} html - HTML content to minify
     * @returns {string} Minified HTML content
     */
    minifyHTML(html) {
        if (!html) return '';
        
        let minified = html;
        
        // Remove HTML comments (but preserve conditional comments)
        minified = minified.replace(/<!--(?!\[if)[\s\S]*?-->/g, '');
        
        // Remove excessive whitespace between tags (but preserve content whitespace)
        minified = minified.replace(/>\s+</g, '><');
        
        // Remove leading/trailing whitespace in text nodes (but preserve single spaces)
        minified = minified.replace(/>\s+([^<\s])/g, '>$1');
        minified = minified.replace(/([^>\s])\s+</g, '$1<');
        
        // Remove multiple consecutive whitespace characters
        minified = minified.replace(/\s{2,}/g, ' ');
        
        // Only do basic attribute cleanup (safer approach)
        // Remove excessive whitespace but preserve attribute structure
        minified = minified.replace(/\s*=\s*/g, '=');
        
        // Only remove truly empty attributes (more careful regex)
        minified = minified.replace(/\s+(\w+)=""\s+/g, ' ');
        
        // Final cleanup
        minified = minified.trim();
        
        console.log('📦 HTML minified:', {
            originalSize: html.length,
            minifiedSize: minified.length,
            compression: `${((1 - minified.length / html.length) * 100).toFixed(1)}%`
        });
        
        return minified;
    }

    /**
     * Set editor content
     * @param {string} html - HTML content
     */
    setHTML(html) {
        this.editor.innerHTML = html;
    }

    /**
     * Get editor content as plain text
     * @returns {string} Plain text content
     */
    getText() {
        return this.editor.textContent || this.editor.innerText || '';
    }

    /**
     * Clear editor content
     */
    clear() {
        this.editor.innerHTML = '<div><br></div>';
        this.editor.focus();
    }

    /**
     * Export HTML
     */
    exportHTML() {
        const html = this.getHTML();
        const htmlOutput = document.getElementById('htmlOutput');
        const htmlCode = document.getElementById('htmlCode');

        if (htmlOutput && htmlCode) {
            htmlCode.value = html;
            htmlOutput.style.display = 'block';
            htmlCode.focus();
            htmlCode.select();
        }

        return html;
    }

    /**
     * Save content to localStorage
     */
    saveToLocalStorage() {
        try {
            const content = this.getHTML();
            const metadata = {
                title: document.getElementById('postTitle')?.value || '',
                author: document.getElementById('postAuthor')?.value || '',
                tags: window.tagsInput ? window.tagsInput.getTags() : [],
                content: content,
                timestamp: Date.now()
            };
            
            localStorage.setItem('editor_draft', JSON.stringify(metadata));
        } catch (error) {
            console.error('Auto-save error:', error);
        }
    }

    /**
     * Load content from localStorage (disabled - no auto restore)
     */
    loadFromLocalStorage() {
        // 초안 복원 기능 비활성화
        // 자동 저장은 계속 작동하지만 자동 복원은 하지 않음
        return;
    }

    /**
     * Clear saved draft
     */
    clearDraft() {
        localStorage.removeItem('editor_draft');
    }
}

// Initialize editor when DOM is ready
let editor = null;

document.addEventListener('DOMContentLoaded', () => {
    const editorElement = document.getElementById('editor');
    if (editorElement) {
        editor = new RichTextEditor('editor');
        
        // Setup additional buttons
        setupEditorButtons();
        
        // Setup global functions for HTML compatibility
        setupGlobalFunctions();
    }
});

/**
 * Setup global functions for HTML inline script compatibility
 */
function setupGlobalFunctions() {
    // Make editor methods globally accessible for inline HTML scripts
    window.format = (cmd, value = null) => {
        if (editor) {
            editor.format(cmd, value);
        }
    };
    
    window.insertLink = () => {
        if (editor) {
            editor.insertLink();
        }
    };
    
    window.changeTextColor = (color) => {
        if (editor) {
            editor.changeTextColor(color);
        }
    };
    
    window.changeBgColor = (color) => {
        if (editor) {
            editor.changeBgColor(color);
        }
    };
    
    window.toggleHighlight = () => {
        if (editor) {
            editor.toggleHighlight();
        }
    };
    
    window.applyHighlight = (color) => {
        if (editor) {
            editor.applyHighlight(color);
        }
    };
    
    window.toggleCodeView = () => {
        if (editor) {
            editor.toggleCodeView();
        }
    };
}

/**
 * Setup additional editor buttons
 */
function setupEditorButtons() {
    // Export HTML button
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            if (editor) {
                editor.exportHTML();
            }
        });
    }

    // Copy HTML button
    const copyHtmlBtn = document.getElementById('copyHtmlBtn');
    if (copyHtmlBtn) {
        copyHtmlBtn.addEventListener('click', async () => {
            const htmlCode = document.getElementById('htmlCode');
            if (htmlCode) {
                const success = await copyToClipboard(htmlCode.value);
                if (success) {
                    showToast('HTML 코드가 클립보드에 복사되었습니다', 'success');
                } else {
                    showToast('클립보드 복사에 실패했습니다', 'error');
                }
            }
        });
    }

    /**
     * Convert HTML content to plain text for storage
     */
    function htmlToText(html) {
        // Create a temporary div to parse HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // Get text content and clean up
        let text = tempDiv.textContent || tempDiv.innerText || '';
        
        // Remove extra whitespace and line breaks
        text = text.replace(/\s+/g, ' ').trim();
        
        return text;
    }
    
    /**
     * Create excerpt from HTML content
     */
    function createExcerpt(html, maxLength = 150) {
        const text = htmlToText(html);
        if (text.length <= maxLength) {
            return text;
        }
        
        // Find the last complete word within the limit
        const truncated = text.substring(0, maxLength);
        const lastSpace = truncated.lastIndexOf(' ');
        
        return lastSpace > 0 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
    }
    
    /**
     * Save post to Google Sheets
     */
    async function savePostToSheets() {
        if (!editor) {
            showToast('에디터가 초기화되지 않았습니다', 'error');
            return;
        }
        
        // Get form data
        const title = document.getElementById('postTitle')?.value?.trim();
        const tags = window.tagsInput ? window.tagsInput.getTagsString() : '';
        // Get minified HTML content for storage
        const content = editor.getHTML(true); // Always minify
        const status = document.getElementById('statusSelect')?.value || 'published';
        // 로컬 시간 사용 (한국 사용자 기준)
        const getKSTTime = () => {
            // 사용자의 로컬 시간을 그대로 사용
            // 한국에 있는 사용자라면 로컬 시간이 곧 한국 시간
            return new Date();
        };
        
        // 로컬 시간을 YYYY-MM-DD HH:MM:SS 형식으로 변환 (UTC 아님)
        const kstTime = getKSTTime();
        const year = kstTime.getFullYear();
        const month = String(kstTime.getMonth() + 1).padStart(2, '0');
        const day = String(kstTime.getDate()).padStart(2, '0');
        const hours = String(kstTime.getHours()).padStart(2, '0');
        const minutes = String(kstTime.getMinutes()).padStart(2, '0');
        const seconds = String(kstTime.getSeconds()).padStart(2, '0');
        const currentDateTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        
        console.log('🕐 ===== 포스트 저장 시간 정보 =====');
        console.log('📅 로컬 시간 (getKSTTime()):', kstTime);
        console.log('📝 전송할 날짜 문자열:', currentDateTime);
        console.log('🌍 로컬 시간 toString():', kstTime.toString());
        console.log('🌐 UTC 비교 (toISOString()):', kstTime.toISOString());
        console.log('==========================================');
        
        // Validate required fields
        if (!title) {
            showToast('제목을 입력해주세요', 'error');
            document.getElementById('postTitle')?.focus();
            return;
        }
        
        if (!content || content === '<p></p>' || content === '<div><br></div>') {
            showToast('내용을 입력해주세요', 'error');
            return;
        }
        
        // Show loading state
        const saveBtn = document.getElementById('saveBtn');
        const originalText = saveBtn?.textContent;
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = '저장 중...';
        }
        
        try {
            // 저장할 데이터 구조 (Google Sheets 컬럼 순서에 맞춤)
            // [id, title, date, thumbnail, content, tags, images, videos, status]
            const postData = {
                // id는 Apps Script에서 생성
                title: title,
                author: CONFIG.BLOG_AUTHOR || 'Admin',  // 작성자 (사용 안함)
                date: currentDateTime,
                excerpt: createExcerpt(content),  // 요약 (사용 안함)
                content: content, 
                tags: tags,
                readTime: Math.max(1, Math.ceil(htmlToText(content).split(' ').length / 200)), // 읽는 시간 (사용 안함)
                thumbnail: '', // 썸네일 (아직 미구현)
                images: getUploadedFilesByType('image'), // 업로드된 이미지 목록
                videos: getUploadedFilesByType('video'), // 업로드된 비디오 목록
                status: status
            };
            
            // 저장할 전체 요청 데이터
            const requestData = {
                action: 'savePost',
                postData: postData
            };
            
            console.log('💾 ===== 저장 데이터 분석 =====');
            console.log('📝 제목:', title);
            console.log('📅 날짜:', currentDateTime);
            console.log('🏷️ 태그:', tags);
            console.log('📄 상태:', status);
            console.log('📊 내용 길이:', content.length, '문자');
            console.log('📖 예상 읽는 시간:', Math.max(1, Math.ceil(htmlToText(content).split(' ').length / 200)), '분');
            console.log('🖼️ 썸네일:', postData.thumbnail || '(없음)');
            console.log('� 이미지:', postData.images || '(없음)');
            console.log('🎥 비디오:', postData.videos || '(없음)');
            console.log('� 요약:', createExcerpt(content).substring(0, 100) + (createExcerpt(content).length > 100 ? '...' : ''));
            console.log('📦 전체 요청 데이터:', requestData);
            console.log('🔗 API URL:', CONFIG.UPLOAD_API_URL);
            console.log('===========================');
            
            // Check if API URL is configured
            if (!CONFIG.UPLOAD_API_URL || CONFIG.UPLOAD_API_URL.includes('YOUR_')) {
                throw new Error('Google Apps Script URL이 설정되지 않았습니다. config.js를 확인해주세요.');
            }
            
            // Send to Google Apps Script
            console.log('🚀 Sending request to Google Apps Script...');
            
            // POST 방식으로 데이터 전송 (URL 길이 제한 해결)
            const formData = new FormData();
            formData.append('data', JSON.stringify(requestData)); // 전체 requestData 객체 전송
            
            const response = await fetch(CONFIG.UPLOAD_API_URL, {
                method: 'POST',
                body: formData
            });
            
            console.log('📡 Response received!');
            console.log('📡 Response status:', response.status);
            console.log('📡 Response statusText:', response.statusText);
            console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Response not OK - Status:', response.status);
                console.error('❌ Response error text:', errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText}\n응답: ${errorText}`);
            }
            
            console.log('✅ Response OK, parsing JSON...');
            const result = await response.json();
            console.log('📋 Parsed result:', result);
            
            if (result.success) {
                showToast(`포스트가 성공적으로 저장되었습니다! (ID: ${result.postId})`, 'success', 5000);
                
                // No cache to clear - posts will always be fresh on next page load
                console.log('✅ Post saved! Next page load will show fresh data.');
                
                // Clear saved draft
                editor.clearDraft();
                
                // 저장 완료 후 2초 뒤에 뒤로가기
                setTimeout(() => {
                    // 이전 페이지가 있으면 뒤로가기, 없으면 블로그 메인으로
                    if (window.history.length > 1) {
                        window.history.back();
                    } else {
                        window.location.href = 'blog.html';
                    }
                }, 2000);
                
            } else {
                throw new Error(result.error || '저장에 실패했습니다');
            }
            
        } catch (error) {
            console.error('❌ Save error details:');
            console.error('- Error type:', error.constructor.name);
            console.error('- Error message:', error.message);
            console.error('- Error stack:', error.stack);
            
            let errorMessage = '저장에 실패했습니다';
            
            if (error.message.includes('Failed to fetch')) {
                errorMessage = '네트워크 연결을 확인해주세요. Google Apps Script에 접근할 수 없습니다.';
            } else if (error.message.includes('HTTP')) {
                errorMessage = `서버 오류: ${error.message}`;
            } else if (error.message.includes('Google Apps Script URL')) {
                errorMessage = 'Google Apps Script URL이 설정되지 않았습니다.';
            } else {
                errorMessage = `저장 실패: ${error.message}`;
            }
            
            showToast(errorMessage, 'error', 8000);
        } finally {
            // Reset button state
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = originalText;
            }
        }
    }

    // Save to Google Sheets button
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            savePostToSheets();
        });
    }


}



/**
 * Get uploaded files by type
 */
function getUploadedFilesByType(fileType) {
    if (!window.uploadedFiles || window.uploadedFiles.length === 0) {
        return '';
    }
    
    const filesOfType = window.uploadedFiles.filter(file => file.type === fileType);
    return JSON.stringify(filesOfType);
}

/**
 * Reset uploaded files list (call when creating new post)
 */
function resetUploadedFiles() {
    window.uploadedFiles = [];
}

/**
 * Load uploaded files from post data
 */
function loadUploadedFiles(postData) {
    try {
        window.uploadedFiles = [];
        
        if (postData.images) {
            const images = JSON.parse(postData.images);
            window.uploadedFiles.push(...images);
        }
        
        if (postData.videos) {
            const videos = JSON.parse(postData.videos);
            window.uploadedFiles.push(...videos);
        }
    } catch (error) {
        console.warn('Failed to load uploaded files:', error);
        window.uploadedFiles = [];
    }
}

// Export for global use
if (typeof window !== 'undefined') {
    window.RichTextEditor = RichTextEditor;
    window.editor = editor;
    window.getUploadedFilesByType = getUploadedFilesByType;
    window.resetUploadedFiles = resetUploadedFiles;
    window.loadUploadedFiles = loadUploadedFiles;
}