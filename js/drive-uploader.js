// Google Drive Uploader for Blog Media
// Handles file uploads to Google Drive with organized folder structure

class DriveUploader {
    constructor() {
        this.isInitialized = false;
        this.isAuthenticated = false;
        this.accessToken = null;
        this.rootFolderId = CONFIG.GOOGLE_DRIVE_FOLDER_ID;
        this.apiKey = CONFIG.GOOGLE_DRIVE_API_KEY;
        this.clientId = CONFIG.GOOGLE_CLIENT_ID;
        
        this.init();
    }

    /**
     * Initialize Google Drive API and Authentication
     */
    async init() {
        try {
            console.log('🚀 Initializing Google Drive API...');
            
            // Wait for gapi to load
            await this.waitForGapi();
            
            // Initialize gapi client with Promise wrapper
            await new Promise((resolve, reject) => {
                gapi.load('client:auth2', async () => {
                    try {
                        await gapi.client.init({
                            apiKey: this.apiKey,
                            clientId: this.clientId,
                            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
                            scope: CONFIG.GOOGLE_SCOPES.join(' ')
                        });
                        
                        this.isInitialized = true;
                        console.log('✅ Google Drive API initialized successfully');
                        
                        // Check if user is already signed in
                        const authInstance = gapi.auth2.getAuthInstance();
                        if (authInstance.isSignedIn.get()) {
                            this.isAuthenticated = true;
                            this.accessToken = authInstance.currentUser.get().getAuthResponse().access_token;
                            console.log('✅ User already authenticated');
                        }
                        
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                });
            });
            
        } catch (error) {
            console.error('❌ Failed to initialize Google Drive API:', error);
            throw error;
        }
    }

    /**
     * Wait for Google API to load
     */
    waitForGapi() {
        return new Promise((resolve) => {
            if (typeof gapi !== 'undefined') {
                resolve();
            } else {
                const checkGapi = setInterval(() => {
                    if (typeof gapi !== 'undefined') {
                        clearInterval(checkGapi);
                        resolve();
                    }
                }, 100);
            }
        });
    }

    /**
     * Authenticate user with Google Drive
     */
    async authenticate() {
        // Wait for initialization if not completed
        if (!this.isInitialized) {
            console.log('⏳ Waiting for API initialization...');
            await this.waitForInitialization();
        }

        try {
            console.log('🔐 Authenticating with Google Drive...');
            
            const authInstance = gapi.auth2.getAuthInstance();
            const user = await authInstance.signIn();
            
            this.isAuthenticated = true;
            this.accessToken = user.getAuthResponse().access_token;
            
            console.log('✅ Authentication successful');
            return { success: true };
            
        } catch (error) {
            console.error('❌ Authentication failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Wait for API initialization to complete
     */
    async waitForInitialization() {
        return new Promise((resolve) => {
            const checkInit = setInterval(() => {
                if (this.isInitialized) {
                    clearInterval(checkInit);
                    resolve();
                }
            }, 100);
        });
    }

    /**
     * Upload file to Google Drive
     * @param {File} file - File to upload
     * @param {string} postId - Post ID for organization
     * @param {string} type - File type (image/video/thumbnail)
     * @returns {Promise<string>} Public URL of uploaded file
     */
    async uploadFile(file, postId, type = 'image') {
        if (!this.isAuthenticated) {
            await this.authenticate();
        }

        try {
            console.log(`📤 Uploading ${type}:`, file.name);
            
            // Validate file
            this.validateFile(file, type);
            
            // Get or create target folder
            const folderId = await this.getTargetFolder(type);
            
            // Generate filename
            const filename = this.generateFilename(file, postId, type);
            
            // Upload file
            const fileId = await this.uploadToFolder(file, filename, folderId);
            
            // Make file public and get URL
            await this.makeFilePublic(fileId);
            const publicUrl = this.getPublicUrl(fileId);
            
            console.log(`✅ Upload successful: ${filename}`);
            console.log(`🔗 Public URL: ${publicUrl}`);
            
            return publicUrl;
            
        } catch (error) {
            console.error('❌ Upload failed:', error);
            throw error;
        }
    }

    /**
     * Validate file before upload
     */
    validateFile(file, type) {
        const maxSize = type === 'video' ? CONFIG.MAX_VIDEO_SIZE : CONFIG.MAX_IMAGE_SIZE;
        const allowedTypes = type === 'video' ? CONFIG.ALLOWED_VIDEO_TYPES : CONFIG.ALLOWED_IMAGE_TYPES;
        
        if (file.size > maxSize) {
            throw new Error(`File too large. Maximum size: ${Math.round(maxSize / 1024 / 1024)}MB`);
        }
        
        if (!allowedTypes.includes(file.type)) {
            throw new Error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
        }
    }

    /**
     * Get or create target folder for upload
     */
    async getTargetFolder(type) {
        try {
            if (type === 'thumbnail') {
                return await this.getOrCreateFolder(CONFIG.DRIVE_FOLDER_STRUCTURE.THUMBNAIL_FOLDER, this.rootFolderId);
            }
            
            if (CONFIG.DRIVE_FOLDER_STRUCTURE.USE_DATE_FOLDERS) {
                const now = new Date();
                const year = now.getFullYear().toString();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                
                const yearFolderId = await this.getOrCreateFolder(year, this.rootFolderId);
                const monthFolderId = await this.getOrCreateFolder(month, yearFolderId);
                
                return monthFolderId;
            }
            
            return this.rootFolderId;
            
        } catch (error) {
            console.error('❌ Failed to get target folder:', error);
            throw error;
        }
    }

    /**
     * Get existing folder or create new one
     */
    async getOrCreateFolder(folderName, parentId) {
        try {
            // Search for existing folder
            const response = await gapi.client.drive.files.list({
                q: `name='${folderName}' and parents in '${parentId}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
                fields: 'files(id, name)'
            });
            
            if (response.result.files.length > 0) {
                return response.result.files[0].id;
            }
            
            // Create new folder
            const createResponse = await gapi.client.drive.files.create({
                resource: {
                    name: folderName,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: [parentId]
                },
                fields: 'id'
            });
            
            console.log(`📁 Created folder: ${folderName}`);
            return createResponse.result.id;
            
        } catch (error) {
            console.error('❌ Failed to get/create folder:', error);
            throw error;
        }
    }

    /**
     * Generate filename for uploaded file
     */
    generateFilename(file, postId, type) {
        const timestamp = Date.now();
        const extension = file.name.split('.').pop().toLowerCase();
        
        if (type === 'thumbnail') {
            return `post_${postId}_thumb_${timestamp}.${extension}`;
        }
        
        const typePrefix = type === 'video' ? 'video' : 'image';
        return `post_${postId}_${typePrefix}_${timestamp}.${extension}`;
    }

    /**
     * Upload file to specific folder
     */
    async uploadToFolder(file, filename, folderId) {
        const metadata = {
            name: filename,
            parents: [folderId]
        };
        
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}));
        form.append('file', file);
        
        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`
            },
            body: form
        });
        
        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
        }
        
        const result = await response.json();
        return result.id;
    }

    /**
     * Make file publicly accessible
     */
    async makeFilePublic(fileId) {
        try {
            await gapi.client.drive.permissions.create({
                fileId: fileId,
                resource: {
                    role: 'reader',
                    type: 'anyone'
                }
            });
        } catch (error) {
            console.warn('⚠️ Failed to make file public:', error);
            // Continue anyway - file might still be accessible
        }
    }

    /**
     * Get public URL for file
     */
    getPublicUrl(fileId) {
        return `https://drive.google.com/uc?id=${fileId}`;
    }

    /**
     * Check if user is authenticated
     */
    isUserAuthenticated() {
        return this.isAuthenticated;
    }

    /**
     * Sign out user
     */
    async signOut() {
        if (this.isInitialized) {
            const authInstance = gapi.auth2.getAuthInstance();
            await authInstance.signOut();
            this.isAuthenticated = false;
            this.accessToken = null;
            console.log('🔓 Signed out from Google Drive');
        }
    }
}

// Create global instance
window.DriveUploader = DriveUploader;