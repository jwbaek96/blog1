/**
 * Google Apps Script for Blog File Upload
 * 
 * This script handles file uploads to Google Drive and returns public URLs
 * for use in the blog editor.
 * 
 * Deployment Instructions:
 * 1. Go to https://script.google.com
 * 2. Create a new project named "Blog Upload API"
 * 3. Replace Code.gs content with this file
 * 4. Set your BLOG_FOLDER_ID below
 * 5. Deploy as Web App with execute permissions set to "Anyone"
 * 6. Copy the deployment URL to your config.js
 */

// Configuration
const BLOG_FOLDER_ID = 'YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE'; // Replace with your actual folder ID
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov'];

/**
 * Handle POST requests (file uploads)
 */
function doPost(e) {
  try {
    console.log('📁 Upload request received');
    
    // Parse request data
    const requestData = JSON.parse(e.postData.contents);
    const fileData = requestData.file;
    
    // Validate request
    if (!fileData || !fileData.data || !fileData.mimeType || !fileData.name) {
      throw new Error('Invalid file data provided');
    }
    
    // Validate file size
    const fileSize = Math.ceil(fileData.data.length * 0.75); // Approximate size from base64
    if (fileSize > MAX_FILE_SIZE) {
      throw new Error(`File size (${Math.round(fileSize / 1024 / 1024)}MB) exceeds maximum allowed size (${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB)`);
    }
    
    // Validate file type
    const isImage = ALLOWED_IMAGE_TYPES.includes(fileData.mimeType);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(fileData.mimeType);
    
    if (!isImage && !isVideo) {
      throw new Error(`File type ${fileData.mimeType} is not supported`);
    }
    
    console.log(`📄 Processing ${isImage ? 'image' : 'video'}: ${fileData.name} (${Math.round(fileSize / 1024)}KB)`);
    
    // Get or create blog folder
    const blogFolder = getBlogFolder();
    
    // Create file from base64 data
    const blob = Utilities.newBlob(
      Utilities.base64Decode(fileData.data),
      fileData.mimeType,
      generateUniqueFileName(fileData.name)
    );
    
    // Upload file to Drive
    const uploadedFile = blogFolder.createFile(blob);
    
    // Set file permissions to public
    uploadedFile.setSharing(
      DriveApp.Access.ANYONE_WITH_LINK,
      DriveApp.Permission.VIEW
    );
    
    // Generate direct access URL
    const fileId = uploadedFile.getId();
    const directUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
    
    // Create response
    const response = {
      success: true,
      url: directUrl,
      fileId: fileId,
      fileName: uploadedFile.getName(),
      fileSize: uploadedFile.getSize(),
      mimeType: uploadedFile.getBlob().getContentType(),
      uploadDate: new Date().toISOString(),
      message: 'File uploaded successfully'
    };
    
    console.log(`✅ Upload successful: ${response.fileName}`);
    
    return createJsonResponse(response);
    
  } catch (error) {
    console.error('❌ Upload error:', error.toString());
    
    const errorResponse = {
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    };
    
    return createJsonResponse(errorResponse);
  }
}

/**
 * Handle GET requests (health check)
 */
function doGet(e) {
  const response = {
    success: true,
    message: 'Blog Upload API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      upload: 'POST /',
      health: 'GET /'
    }
  };
  
  return createJsonResponse(response);
}

/**
 * Get or create blog folder
 */
function getBlogFolder() {
  try {
    if (!BLOG_FOLDER_ID || BLOG_FOLDER_ID === 'YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE') {
      throw new Error('BLOG_FOLDER_ID not configured. Please update the script with your Google Drive folder ID.');
    }
    
    const folder = DriveApp.getFolderById(BLOG_FOLDER_ID);
    console.log(`📁 Using blog folder: ${folder.getName()}`);
    return folder;
    
  } catch (error) {
    if (error.toString().includes('not found')) {
      throw new Error('Blog folder not found. Please check your BLOG_FOLDER_ID.');
    }
    throw error;
  }
}

/**
 * Generate unique file name to prevent conflicts
 */
function generateUniqueFileName(originalName) {
  const timestamp = new Date().getTime();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  
  // Extract file extension
  const lastDotIndex = originalName.lastIndexOf('.');
  const name = lastDotIndex > 0 ? originalName.substring(0, lastDotIndex) : originalName;
  const extension = lastDotIndex > 0 ? originalName.substring(lastDotIndex) : '';
  
  // Clean up file name (remove special characters)
  const cleanName = name.replace(/[^a-zA-Z0-9가-힣\-_\s]/g, '').trim().substring(0, 50);
  
  return `${cleanName}_${timestamp}_${randomSuffix}${extension}`;
}

/**
 * Create JSON response with proper headers
 */
function createJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data, null, 2))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type')
    .setHeader('Access-Control-Max-Age', '86400');
}

/**
 * Handle OPTIONS requests (CORS preflight)
 */
function doOptions(e) {
  return createJsonResponse({
    success: true,
    message: 'CORS preflight response'
  });
}

/**
 * Cleanup old files (optional - run manually or set up trigger)
 * Removes files older than 30 days that haven't been accessed
 */
function cleanupOldFiles() {
  try {
    const blogFolder = getBlogFolder();
    const files = blogFolder.getFiles();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    let deletedCount = 0;
    
    while (files.hasNext()) {
      const file = files.next();
      const lastUpdated = file.getLastUpdated();
      
      if (lastUpdated < thirtyDaysAgo) {
        console.log(`🗑️ Deleting old file: ${file.getName()}`);
        file.setTrashed(true);
        deletedCount++;
      }
    }
    
    console.log(`✅ Cleanup complete. Deleted ${deletedCount} old files.`);
    return deletedCount;
    
  } catch (error) {
    console.error('❌ Cleanup error:', error.toString());
    throw error;
  }
}

/**
 * Get folder statistics (for monitoring)
 */
function getFolderStats() {
  try {
    const blogFolder = getBlogFolder();
    const files = blogFolder.getFiles();
    
    let totalSize = 0;
    let totalFiles = 0;
    let imageCount = 0;
    let videoCount = 0;
    
    while (files.hasNext()) {
      const file = files.next();
      totalSize += file.getSize();
      totalFiles++;
      
      const mimeType = file.getBlob().getContentType();
      if (ALLOWED_IMAGE_TYPES.includes(mimeType)) {
        imageCount++;
      } else if (ALLOWED_VIDEO_TYPES.includes(mimeType)) {
        videoCount++;
      }
    }
    
    const stats = {
      folderName: blogFolder.getName(),
      folderId: blogFolder.getId(),
      totalFiles: totalFiles,
      totalSize: totalSize,
      totalSizeMB: Math.round(totalSize / 1024 / 1024 * 100) / 100,
      imageCount: imageCount,
      videoCount: videoCount,
      lastUpdated: new Date().toISOString()
    };
    
    console.log('📊 Folder Stats:', JSON.stringify(stats, null, 2));
    return stats;
    
  } catch (error) {
    console.error('❌ Stats error:', error.toString());
    throw error;
  }
}

/**
 * Test function to verify setup
 */
function testUpload() {
  try {
    // Create a test file
    const testBlob = Utilities.newBlob('Test file content', 'text/plain', 'test.txt');
    const base64Data = Utilities.base64Encode(testBlob.getBytes());
    
    const testRequest = {
      postData: {
        contents: JSON.stringify({
          file: {
            data: base64Data,
            mimeType: 'text/plain',
            name: 'test.txt'
          }
        })
      }
    };
    
    const response = doPost(testRequest);
    const result = JSON.parse(response.getContent());
    
    if (result.success) {
      console.log('✅ Test upload successful!');
      console.log('📄 Response:', JSON.stringify(result, null, 2));
      
      // Clean up test file
      const testFile = DriveApp.getFileById(result.fileId);
      testFile.setTrashed(true);
      console.log('🗑️ Test file cleaned up');
      
    } else {
      console.error('❌ Test upload failed:', result.error);
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Test error:', error.toString());
    throw error;
  }
}