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
            this.editor.innerHTML = '<p><br></p>';
        }

        // Focus event
        this.editor.addEventListener('focus', () => {
            if (this.editor.innerHTML === '<p>여기에 내용을 작성하세요...</p>' || this.editor.innerHTML === '<p>여기에 텍스트를 입력하세요...</p>') {
                this.editor.innerHTML = '<p><br></p>';
            }
        });

        // Blur event - handle empty editor
        this.editor.addEventListener('blur', () => {
            if (this.editor.innerHTML.trim() === '') {
                this.editor.innerHTML = '<p><br></p>';
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
                    this.executeCommand('formatBlock', '<p>');
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

            // Enter key - ensure proper paragraph structure
            if (e.key === 'Enter' && !e.shiftKey) {
                const selection = window.getSelection();
                const range = selection.getRangeAt(0);
                const currentElement = range.commonAncestorContainer;
                
                // If we're not in a paragraph, create one
                if (currentElement.nodeType === Node.TEXT_NODE) {
                    const parent = currentElement.parentElement;
                    if (parent && parent.tagName !== 'P') {
                        e.preventDefault();
                        this.executeCommand('formatBlock', '<p>');
                    }
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
        // Load saved content
        this.loadFromLocalStorage();
        
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
        this.executeCommand(cmd, value);
        this.editor.focus();
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
    }

    /**
     * Change background color
     * @param {string} color - Color value
     */
    changeBgColor(color) {
        this.format('hiliteColor', color);
        // bgColorBar는 제거되었으므로 더 이상 업데이트하지 않음
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
            this.editor.innerHTML = `<pre style="margin: 0; padding: 20px; background: #f8f9fa; border-radius: 8px; overflow-x: auto; white-space: pre-wrap; font-family: 'Courier New', monospace; font-size: 14px; line-height: 1.5;">${this.escapeHtml(htmlCode)}</pre>`;
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
        const img = `<img src="${imageUrl}" alt="업로드된 이미지" style="max-width: 100%; height: auto; border-radius: 8px; margin: 16px 0;">`;
        this.executeCommand('insertHTML', img);
        showToast('이미지가 삽입되었습니다', 'success');
    }

    /**
     * Insert video into editor
     * @param {string} videoUrl - Video URL
     */
    insertVideo(videoUrl) {
        // Extract Google Drive file ID
        const fileIdMatch = videoUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        const fileId = fileIdMatch ? fileIdMatch[1] : null;

        let videoEmbed;
        if (fileId) {
            // Google Drive video embed
            videoEmbed = `
                <div style="margin: 16px 0;">
                    <iframe src="https://drive.google.com/file/d/${fileId}/preview" 
                            width="100%" height="400" 
                            style="border-radius: 8px; border: none;"
                            allow="autoplay">
                    </iframe>
                </div>
            `;
        } else {
            // Fallback video tag
            videoEmbed = `
                <div style="margin: 16px 0;">
                    <video controls style="width: 100%; max-width: 100%; border-radius: 8px;">
                        <source src="${videoUrl}" type="video/mp4">
                        브라우저가 동영상을 지원하지 않습니다.
                    </video>
                </div>
            `;
        }

        this.executeCommand('insertHTML', videoEmbed);
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
     * @returns {string} HTML content
     */
    getHTML() {
        return this.editor.innerHTML;
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
        this.editor.innerHTML = '<p><br></p>';
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
     * Load content from localStorage
     */
    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('editor_draft');
            if (!saved) return;

            const metadata = JSON.parse(saved);
            
            // Only load if content exists and is relatively recent (< 7 days)
            const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
            if (metadata.timestamp > sevenDaysAgo && metadata.content.trim()) {
                
                // Ask user if they want to restore
                if (confirm('저장된 초안이 있습니다. 복원하시겠습니까?')) {
                    this.setHTML(metadata.content);
                    
                    // Restore metadata
                    if (metadata.title) {
                        const titleInput = document.getElementById('postTitle');
                        if (titleInput) titleInput.value = metadata.title;
                    }
                    
                    if (metadata.author) {
                        const authorInput = document.getElementById('postAuthor');
                        if (authorInput) authorInput.value = metadata.author;
                    }
                    
                    if (metadata.tags && window.tagsInput) {
                        window.tagsInput.setTags(metadata.tags);
                    }
                    
                    showToast('초안이 복원되었습니다', 'success');
                }
            }
        } catch (error) {
            console.error('Draft restore error:', error);
        }
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
        const content = editor.getHTML();
        
        // Validate required fields
        if (!title) {
            showToast('제목을 입력해주세요', 'error');
            document.getElementById('postTitle')?.focus();
            return;
        }
        
        if (!content || content === '<p></p>') {
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
            // Prepare post data
            const postData = {
                action: 'savePost',
                postData: {
                    title: title,
                    author: CONFIG.BLOG_AUTHOR || 'Admin',
                    excerpt: createExcerpt(content),
                    content: content, // Store full HTML
                    tags: tags,
                    readTime: Math.max(1, Math.ceil(htmlToText(content).split(' ').length / 200)), // Estimate reading time
                    thumbnail: '' // Could be enhanced to extract first image
                }
            };
            
            console.log('💾 Saving post to Google Sheets...', postData);
            console.log('🔗 Using API URL:', CONFIG.UPLOAD_API_URL);
            
            // Check if API URL is configured
            if (!CONFIG.UPLOAD_API_URL || CONFIG.UPLOAD_API_URL.includes('YOUR_')) {
                throw new Error('Google Apps Script URL이 설정되지 않았습니다. config.js를 확인해주세요.');
            }
            
            // Send to Google Apps Script
            const response = await fetch(CONFIG.UPLOAD_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(postData)
            });
            
            console.log('📡 Response status:', response.status);
            console.log('📡 Response headers:', response.headers);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Response error:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                showToast(`포스트가 성공적으로 저장되었습니다! (ID: ${result.postId})`, 'success', 5000);
                
                // Clear form after successful save
                if (confirm('저장이 완료되었습니다. 에디터를 초기화하시겠습니까?')) {
                    document.getElementById('postTitle').value = '';
                    if (window.tagsInput) {
                        window.tagsInput.setTags([]);
                    }
                    editor.clear();
                    
                    // Clear saved draft
                    editor.clearDraft();
                }
                
            } else {
                throw new Error(result.error || '저장에 실패했습니다');
            }
            
        } catch (error) {
            console.error('❌ Save error:', error);
            showToast(`저장 실패: ${error.message}`, 'error', 5000);
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



// Export for global use
if (typeof window !== 'undefined') {
    window.RichTextEditor = RichTextEditor;
    window.editor = editor;
}