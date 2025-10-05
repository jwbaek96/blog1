// Rich Text Editor Implementation

class RichTextEditor {
    constructor(editorId) {
        this.editor = document.getElementById(editorId);
        this.toolbar = document.querySelector('.editor-toolbar');
        this.isInitialized = false;
        
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
        if (!this.editor.innerHTML.trim() || this.editor.innerHTML === '<p>여기에 내용을 작성하세요...</p>') {
            this.editor.innerHTML = '<p><br></p>';
        }

        // Focus event
        this.editor.addEventListener('focus', () => {
            if (this.editor.innerHTML === '<p>여기에 내용을 작성하세요...</p>') {
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
                tags: document.getElementById('postTags')?.value || '',
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
                    
                    if (metadata.tags) {
                        const tagsInput = document.getElementById('postTags');
                        if (tagsInput) tagsInput.value = metadata.tags;
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
    }
});

/**
 * Setup additional editor buttons
 */
function setupEditorButtons() {
    // Preview button
    const previewBtn = document.getElementById('previewBtn');
    if (previewBtn) {
        previewBtn.addEventListener('click', showPreview);
    }

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

    // Save to Google Sheets button (placeholder)
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            showToast('Google Sheets 저장 기능은 수동으로 진행해주세요', 'info', 5000);
            if (editor) {
                editor.exportHTML();
            }
        });
    }

    // Close preview modal
    const closePreview = document.getElementById('closePreview');
    if (closePreview) {
        closePreview.addEventListener('click', hidePreview);
    }
}

/**
 * Show preview modal
 */
function showPreview() {
    if (!editor) return;

    const previewModal = document.getElementById('previewModal');
    const previewContent = document.getElementById('previewContent');
    
    if (previewModal && previewContent) {
        const html = editor.getHTML();
        previewContent.innerHTML = html;
        previewModal.style.display = 'flex';
    }
}

/**
 * Hide preview modal
 */
function hidePreview() {
    const previewModal = document.getElementById('previewModal');
    if (previewModal) {
        previewModal.style.display = 'none';
    }
}

// Export for global use
if (typeof window !== 'undefined') {
    window.RichTextEditor = RichTextEditor;
    window.editor = editor;
}