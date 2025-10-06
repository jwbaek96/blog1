/** 1gei84cTcsgRheWIyhGuqPLX4DZcXTJkb
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
const BLOG_FOLDER_ID = '1gei84cTcsgRheWIyhGuqPLX4DZcXTJkb'; // Replace with your actual folder ID
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov'];

/**
 * Debug function to check configuration
 */
function debugConfig() {
  console.log('🔧 Debug Configuration:');
  console.log('BLOG_FOLDER_ID:', BLOG_FOLDER_ID);
  console.log('BLOG_FOLDER_ID length:', BLOG_FOLDER_ID.length);
  console.log('BLOG_FOLDER_ID type:', typeof BLOG_FOLDER_ID);
  console.log('Is default?', BLOG_FOLDER_ID === 'YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE');
  console.log('Is empty?', !BLOG_FOLDER_ID);
  
  if (BLOG_FOLDER_ID && BLOG_FOLDER_ID !== 'YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE') {
    console.log('✅ Configuration looks good!');
    try {
      const folder = DriveApp.getFolderById(BLOG_FOLDER_ID);
      console.log('✅ Folder found:', folder.getName());
    } catch (error) {
      console.error('❌ Folder error:', error.toString());
    }
  } else {
    console.log('❌ Configuration problem detected');
  }
}

/**
 * Check if Drive API is available and authorized
 */
function checkDrivePermissions() {
  try {
    console.log('🔍 Checking Drive API permissions...');
    console.log('🔧 Current BLOG_FOLDER_ID:', BLOG_FOLDER_ID);
    
    // Try to access Drive API
    const folders = DriveApp.getFolders();
    console.log('✅ Drive API access successful!');
    
    // Try to get specific folder if ID is set
    if (BLOG_FOLDER_ID && BLOG_FOLDER_ID !== 'YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE') {
      const folder = DriveApp.getFolderById(BLOG_FOLDER_ID);
      console.log('✅ Blog folder access successful!');
      console.log('📁 Folder name:', folder.getName());
      return true;
    } else {
      console.log('⚠️ BLOG_FOLDER_ID not configured');
      console.log('🔧 Current value:', BLOG_FOLDER_ID);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Drive API error:', error.toString());
    console.log('💡 You may need to:');
    console.log('   1. Enable Drive API in Apps Script');
    console.log('   2. Run the script manually to grant permissions');
    console.log('   3. Check if the folder ID is correct');
    return false;
  }
}

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
  const output = ContentService
    .createTextOutput(JSON.stringify(data, null, 2))
    .setMimeType(ContentService.MimeType.JSON);
  
  // Note: setHeader is not available in all Apps Script versions
  // CORS is handled by Apps Script automatically for web apps
  return output;
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
    console.log('🧪 Starting test upload...');
    
    // Create a test image file (PNG format)
    const testImageData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77yQAAAABJRU5ErkJggg==';
    
    const testRequest = {
      postData: {
        contents: JSON.stringify({
          file: {
            data: testImageData,
            mimeType: 'image/png',
            name: 'test-image.png'
          }
        })
      }
    };
    
    console.log('📤 Sending test request...');
    const response = doPost(testRequest);
    const result = JSON.parse(response.getContent());
    
    if (result.success) {
      console.log('✅ Test upload successful!');
      console.log('📄 File URL:', result.url);
      console.log('📄 File ID:', result.fileId);
      
      // Clean up test file
      try {
        const testFile = DriveApp.getFileById(result.fileId);
        testFile.setTrashed(true);
        console.log('🗑️ Test file cleaned up');
      } catch (cleanupError) {
        console.log('⚠️ Could not clean up test file:', cleanupError.toString());
      }
      
    } else {
      console.error('❌ Test upload failed:', result.error);
    }
    
    console.log('🔧 Full response:', JSON.stringify(result, null, 2));
    return result;
    
  } catch (error) {
    console.error('❌ Test error:', error.toString());
    
    // Additional debugging info
    try {
      const folder = getBlogFolder();
      console.log('📁 Blog folder found:', folder.getName());
    } catch (folderError) {
      console.error('📁 Blog folder error:', folderError.toString());
    }
    
    throw error;
  }
}

/**
 * Simple test to verify folder access
 */
function testFolderAccess() {
  try {
    console.log('📁 Testing folder access...');
    
    // First check Drive API permissions
    const hasPermissions = checkDrivePermissions();
    if (!hasPermissions) {
      return false;
    }
    
    if (!BLOG_FOLDER_ID || BLOG_FOLDER_ID === 'YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE') {
      console.error('❌ BLOG_FOLDER_ID not configured');
      console.log('💡 Please set BLOG_FOLDER_ID in the script');
      return false;
    }
    
    const folder = DriveApp.getFolderById(BLOG_FOLDER_ID);
    console.log('✅ Folder access successful!');
    console.log('📁 Folder name:', folder.getName());
    console.log('📁 Folder ID:', folder.getId());
    
    // Test creating a simple text file
    const testBlob = Utilities.newBlob('Test content', 'text/plain', 'folder-test.txt');
    const testFile = folder.createFile(testBlob);
    console.log('✅ File creation successful!');
    
    // Clean up
    testFile.setTrashed(true);
    console.log('🗑️ Test file cleaned up');
    
    return true;
    
  } catch (error) {
    console.error('❌ Folder access error:', error.toString());
    console.log('💡 Make sure:');
    console.log('   1. The folder ID is correct');
    console.log('   2. The folder exists and is accessible');
    console.log('   3. You have permission to write to the folder');
    return false;
  }
}

/**
 * Step-by-step setup guide
 */
function setupGuide() {
  console.log('🚀 Google Apps Script Setup Guide');
  console.log('================================');
  console.log('');
  console.log('Step 1: Create Google Drive Folder');
  console.log('- Go to https://drive.google.com');
  console.log('- Create a new folder named "Blog Media"');
  console.log('- Copy the folder ID from the URL');
  console.log('');
  console.log('Step 2: Configure Script');
  console.log('- Replace BLOG_FOLDER_ID with your folder ID');
  console.log('- Current value:', BLOG_FOLDER_ID);
  console.log('');
  console.log('Step 3: Enable APIs');
  console.log('- In Apps Script, go to "Services" in the left sidebar');
  console.log('- Add "Google Drive API" if not already added');
  console.log('');
  console.log('Step 4: Test Setup');
  console.log('- Run checkDrivePermissions() first');
  console.log('- Then run testFolderAccess()');
  console.log('- Finally run testUpload()');
  console.log('');
  console.log('Step 5: Deploy as Web App');
  console.log('- Click "Deploy" > "New Deployment"');
  console.log('- Choose "Web app" type');
  console.log('- Set execute as "Me" and access to "Anyone"');
  console.log('- Copy the deployment URL to your config.js');
}