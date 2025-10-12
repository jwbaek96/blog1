/**
 * Google Apps Script for Blog File Upload and Data Management
 * 
 * This script handles file uploads to Google Drive and returns public URLs
 * for use in the blog editor. It also manages blog post data in Google Sheets.
 * 
 * Deployment Instructions:
 * 1. Go to https://script.google.com
 * 2. Create a new project named "Blog API"
 * 3. Replace Code.gs content with this file
 * 4. Set your BLOG_FOLDER_ID and SPREADSHEET_ID below
 * 5. Deploy as Web App with execute permissions set to "Anyone"
 * 6. Copy the deployment URL to your config.js
 */

// Configuration
const BLOG_FOLDER_ID = '1gei84cTcsgRheWIyhGuqPLX4DZcXTJkb'; // Replace with your actual folder ID
const SPREADSHEET_ID = '1X9uL2ZmuaHTc4kl8Z6C63fJ8lb99_LDP4CVqSoP2FqY'; // Google Sheets ID from config.js
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov'];

/**
 * Handle GET requests (data retrieval)
 */
function doGet(e) {
  try {
    console.log('📥 GET request received');
    console.log('📋 Parameters:', e.parameter);
    
    const action = e.parameter.action || 'getPosts';
    
    if (action === 'getPosts') {
      return handleGetPosts();
    } else if (action === 'savePost') {
      // Handle post save via GET request (from editor)
      const postData = JSON.parse(e.parameter.data || '{}');
      const requestData = {
        action: 'savePost',
        postData: postData
      };
      return handlePostSave(requestData);
    } else if (action === 'getGuestbook') {
      const offset = parseInt(e.parameter.offset) || 0;
      const limit = parseInt(e.parameter.limit) || 10;
      return handleGetGuestbook(offset, limit);
    } else {
      throw new Error('Invalid action: ' + action);
    }
    
  } catch (error) {
    console.error('❌ GET request error:', error.toString());
    
    const errorResponse = {
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    };
    
    return createJsonResponse(errorResponse);
  }
}

/**
 * Handle get posts requests
 */
function handleGetPosts() {
  try {
    console.log('📊 Getting posts data from spreadsheet');
    
    const spreadsheet = getSpreadsheet();
    const sheet = spreadsheet.getActiveSheet();
    
    // Get all data (excluding header row)
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    if (values.length <= 1) {
      console.log('📋 No posts found');
      return createJsonResponse({
        success: true,
        posts: [],
        message: 'No posts found'
      });
    }
    
    // Skip header row and process data
    const posts = [];
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      
      // Skip empty rows
      if (!row[1]) continue; // Skip if title is empty
      
      const post = {
        id: row[0] || i,                 // A: ID
        title: row[1] || 'Untitled',     // B: Title
        date: row[2] || '',              // C: Date
        thumbnail: row[3] || '',         // D: Thumbnail
        content: row[4] || '',           // E: Content
        tags: row[5] || '',              // F: Tags
        images: row[6] || '',            // G: Images
        videos: row[7] || '',            // H: Videos
        status: row[8] || 'published'    // I: Status
      };
      
      posts.push(post);
    }
    
    console.log(`✅ Found ${posts.length} posts`);
    
    const response = {
      success: true,
      posts: posts,
      count: posts.length,
      timestamp: new Date().toISOString()
    };
    
    return createJsonResponse(response);
    
  } catch (error) {
    console.error('❌ Get posts error:', error.toString());
    
    const errorResponse = {
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    };
    
    return createJsonResponse(errorResponse);
  }
}

/**
 * Handle POST requests (file uploads and post saving)
 */
function doPost(e) {
  try {
    console.log('📥 POST request received');
    console.log('📋 Request parameters:', e.parameters);
    console.log('📋 Post data type:', e.postData ? e.postData.type : 'no postData');
    
    let requestData;
    
    // Handle FormData (from form submission)
    if (e.parameters && e.parameters.data) {
      console.log('📝 Processing FormData request');
      requestData = JSON.parse(e.parameters.data[0]); // FormData values are arrays
    }
    // Handle direct JSON (fallback)
    else if (e.postData && e.postData.contents) {
      console.log('📝 Processing JSON request');
      requestData = JSON.parse(e.postData.contents);
    }
    else {
      throw new Error('No valid request data found');
    }
    
    console.log('📋 Parsed request data:', requestData);
    
    // Check request type
    if (requestData.action === 'savePost') {
      return handlePostSave(requestData);
    } else if (requestData.action === 'deletePost') {
      return handleDeletePost(requestData);
    } else if (requestData.action === 'addGuestbook') {
      return handleAddGuestbook(requestData);
    } else if (requestData.action === 'deleteGuestbook') {
      return handleDeleteGuestbook(requestData);
    } else if (requestData.file) {
      return handleFileUpload(requestData);
    } else {
      throw new Error('Invalid request: no action specified or file data missing');
    }
    
  } catch (error) {
    console.error('❌ Request error:', error.toString());
    
    const errorResponse = {
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    };
    
    return createJsonResponse(errorResponse);
  }
}

/**
 * Handle file upload requests
 */
function handleFileUpload(requestData) {
  try {
    console.log('📁 File upload request received');
    
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
 * Handle post save requests
 */
function handlePostSave(requestData) {
  try {
    console.log('💾 ===== POST SAVE REQUEST RECEIVED =====');
    console.log('📥 Full request data:', JSON.stringify(requestData, null, 2));
    
    // Validate post data
    const postData = requestData.postData;
    console.log('📋 Post data received:', JSON.stringify(postData, null, 2));
    
    if (!postData || !postData.title) {
      throw new Error('Invalid post data: title is required');
    }
    
    // Get spreadsheet
    const spreadsheet = getSpreadsheet();
    const sheet = spreadsheet.getActiveSheet();
    
    // Use ROW()-1 formula for auto-incrementing ID
    const currentDateTime = new Date().toISOString().replace('T', ' ').split('.')[0]; // YYYY-MM-DD HH:MM:SS format
    
    // Prepare row data matching required structure: [id, title, date, thumbnail, content, tags, images, videos, status]
    const rowData = [
      '=ROW()-1',                       // A: ID (자동 증가 공식)
      postData.title || 'Untitled',    // B: Title  
      postData.date || currentDateTime, // C: Date
      postData.thumbnail || '',        // D: Thumbnail
      postData.content || '',          // E: Content
      postData.tags || '',             // F: Tags
      postData.images || '',           // G: Images
      postData.videos || '',           // H: Videos
      postData.status || 'published'   // I: Status
    ];
    
    console.log('📊 Saving data structure:');
    console.log('🆔 ID: =ROW()-1 (자동 증가)');
    console.log('📝 Title:', postData.title);
    console.log('📅 Date:', postData.date || currentDateTime);
    console.log('🖼️ Thumbnail:', postData.thumbnail || '(empty)');
    console.log('📄 Content length:', (postData.content || '').length);
    console.log('🏷️ Tags:', postData.tags || '(empty)');
    console.log('📷 Images:', postData.images || '(empty)');
    console.log('🎥 Videos:', postData.videos || '(empty)');
    console.log('📊 Status:', postData.status || 'published');
    console.log('📋 Row data array:', rowData);
    
    // Add row to sheet
    sheet.appendRow(rowData);
    
    // Get the row number to determine the actual ID that will be generated
    const lastRow = sheet.getLastRow();
    const calculatedId = lastRow - 1;
    
    console.log(`✅ Post saved successfully: ${postData.title} (ID will be: ${calculatedId})`);
    
    const response = {
      success: true,
      postId: calculatedId,
      title: postData.title,
      message: 'Post saved to Google Sheets successfully',
      timestamp: new Date().toISOString()
    };
    
    return createJsonResponse(response);
    
  } catch (error) {
    console.error('❌ Post save error:', error.toString());
    
    const errorResponse = {
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    };
    
    return createJsonResponse(errorResponse);
  }
}

/**
 * Handle post delete requests
 */
function handleDeletePost(requestData) {
  try {
    console.log('🗑️ ===== POST DELETE REQUEST RECEIVED =====');
    console.log('📥 Full request data:', JSON.stringify(requestData, null, 2));
    
    const postId = requestData.postId;
    
    if (!postId) {
      throw new Error('Post ID is required for deletion');
    }
    
    // Get spreadsheet
    const spreadsheet = getSpreadsheet();
    const sheet = spreadsheet.getActiveSheet();
    
    // Find the post by ID
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    let targetRowIndex = -1;
    for (let i = 1; i < values.length; i++) { // Skip header row
      const row = values[i];
      const rowId = row[0];
      
      // Check if this is the target post
      if (rowId == postId) {
        targetRowIndex = i + 1; // Convert to 1-based index for Google Sheets
        break;
      }
    }
    
    if (targetRowIndex === -1) {
      throw new Error('Post not found with ID: ' + postId);
    }
    
    // Delete the row
    sheet.deleteRow(targetRowIndex);
    
    console.log(`✅ Post deleted successfully: ID ${postId}`);
    
    const response = {
      success: true,
      postId: postId,
      message: 'Post deleted successfully',
      timestamp: new Date().toISOString()
    };
    
    return createJsonResponse(response);
    
  } catch (error) {
    console.error('❌ Post delete error:', error.toString());
    
    const errorResponse = {
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    };
    
    return createJsonResponse(errorResponse);
  }
}

/**
 * Handle get guestbook requests
 */
function handleGetGuestbook(offset = 0, limit = 10) {
  try {
    console.log(`📋 Getting guestbook entries from spreadsheet (Offset: ${offset}, Limit: ${limit})`);
    
    const spreadsheet = getSpreadsheet();
    const guestbookSheet = getGuestbookSheet(spreadsheet);
    
    // Get all data (excluding header row)
    const dataRange = guestbookSheet.getDataRange();
    const values = dataRange.getValues();
    
    if (values.length <= 1) {
      console.log('📋 No guestbook entries found');
      return createJsonResponse({
        success: true,
        entries: [],
        totalEntries: 0,
        hasMore: false,
        message: 'No guestbook entries found'
      });
    }
    
    // Skip header row and process data
    const allEntries = [];
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      
      // Skip empty rows or entries marked as deleted
      if (!row[2] || row[6] === 'deleted') continue; // Skip if name is empty or status is deleted
      
      const entry = {
        id: row[0] || i,                 // A: ID
        date: row[1] || '',              // B: Date
        name: row[2] || 'Anonymous',     // C: Name
        // password: row[3] - 보안상 클라이언트로 전송하지 않음
        message: row[4] || '',           // E: Message
        ip: row[5] || '',                // F: IP (보안상 선택적 노출)
        status: row[6] || 'active',      // G: Status
        comment: row[7] || ''            // H: Comment
      };
      
      allEntries.push(entry);
    }
    
    // 최신순으로 정렬
    allEntries.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Offset/Limit 계산
    const totalEntries = allEntries.length;
    const endIndex = Math.min(offset + limit, totalEntries);
    const requestedEntries = allEntries.slice(offset, endIndex);
    const hasMore = endIndex < totalEntries;
    
    console.log(`✅ Found ${totalEntries} total entries, returning ${requestedEntries.length} entries from offset ${offset}`);
    
    const response = {
      success: true,
      entries: requestedEntries,
      totalEntries: totalEntries,
      hasMore: hasMore,
      timestamp: new Date().toISOString()
    };
    
    return createJsonResponse(response);
    
  } catch (error) {
    console.error('❌ Get guestbook error:', error.toString());
    
    const errorResponse = {
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    };
    
    return createJsonResponse(errorResponse);
  }
}

/**
 * Handle add guestbook entry requests
 */
function handleAddGuestbook(requestData) {
  try {
    console.log('📝 ===== ADD GUESTBOOK REQUEST RECEIVED =====');
    console.log('📥 Full request data:', JSON.stringify(requestData, null, 2));
    
    // Validate guestbook data
    const guestData = requestData.guestData;
    console.log('📋 Guest data received:', JSON.stringify(guestData, null, 2));
    
    if (!guestData || !guestData.name || !guestData.message || !guestData.password) {
      throw new Error('Invalid guestbook data: name, message, and password are required');
    }
    
    // Validate password (4-digit number)
    if (!/^\d{4}$/.test(guestData.password)) {
      throw new Error('Password must be exactly 4 digits');
    }
    
    // Get spreadsheet and guestbook sheet
    const spreadsheet = getSpreadsheet();
    const guestbookSheet = getGuestbookSheet(spreadsheet);
    
    // Get client IP from request data (sent from frontend) or fallback to session key
    const clientIP = guestData.ip || Session.getTemporaryActiveUserKey() || 'unknown';
    
    // Prepare row data matching required structure: [id, date, name, password, message, ip, status, comment]
    const currentDateTime = new Date().toISOString().replace('T', ' ').split('.')[0]; // YYYY-MM-DD HH:MM:SS format
    
    const rowData = [
      '=ROW()-1',                       // A: ID (자동 증가 공식)
      currentDateTime,                  // B: Date
      guestData.name,                   // C: Name
      "'" + guestData.password,         // D: Password (텍스트로 강제 저장하여 0000 등이 0으로 변환되는 것 방지)
      guestData.message,                // E: Message
      clientIP,                         // F: IP
      'active',                         // G: Status
      ''                                // H: Comment (관리자 메모용)
    ];
    
    console.log('📊 Saving guestbook data:');
    console.log('🆔 ID: =ROW()-1 (자동 증가)');
    console.log('📅 Date:', currentDateTime);
    console.log('👤 Name:', guestData.name);
    console.log('🔒 Password: [HIDDEN]');
    console.log('💬 Message:', guestData.message);
    console.log('🌐 IP:', clientIP, guestData.ip ? '(from client)' : '(from session)');
    console.log('📊 Status: active');
    
    // Add row to sheet
    guestbookSheet.appendRow(rowData);
    
    // Get the row number to determine the actual ID that will be generated
    const lastRow = guestbookSheet.getLastRow();
    const calculatedId = lastRow - 1;
    
    console.log(`✅ Guestbook entry saved successfully: ${guestData.name} (ID will be: ${calculatedId})`);
    
    const response = {
      success: true,
      entryId: calculatedId,
      name: guestData.name,
      message: 'Guestbook entry saved successfully',
      timestamp: new Date().toISOString()
    };
    
    return createJsonResponse(response);
    
  } catch (error) {
    console.error('❌ Add guestbook error:', error.toString());
    
    const errorResponse = {
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    };
    
    return createJsonResponse(errorResponse);
  }
}

/**
 * Handle delete guestbook entry requests
 */
function handleDeleteGuestbook(requestData) {
  try {
    console.log('🗑️ ===== DELETE GUESTBOOK REQUEST RECEIVED =====');
    console.log('📥 Full request data:', JSON.stringify(requestData, null, 2));
    
    const entryId = requestData.entryId;
    const password = requestData.password;
    
    if (!entryId || !password) {
      throw new Error('Entry ID and password are required for deletion');
    }
    
    if (!/^\d{4}$/.test(password)) {
      throw new Error('Password must be exactly 4 digits');
    }
    
    // Get spreadsheet and guestbook sheet
    const spreadsheet = getSpreadsheet();
    const guestbookSheet = getGuestbookSheet(spreadsheet);
    
    // Find the entry by ID
    const dataRange = guestbookSheet.getDataRange();
    const values = dataRange.getValues();
    
    let targetRowIndex = -1;
    for (let i = 1; i < values.length; i++) { // Skip header row
      const row = values[i];
      const rowId = row[0];
      
      // Check if this is the target entry
      if (rowId == entryId) {
        const storedPassword = row[3]; // Column D: Password
        
        // 저장된 비밀번호에서 텍스트 강제를 위한 앞의 작은따옴표 제거
        const cleanStoredPassword = storedPassword.toString().startsWith("'") ? 
          storedPassword.toString().substring(1) : storedPassword.toString();
        
        if (cleanStoredPassword === password) {
          targetRowIndex = i + 1; // Convert to 1-based index for Google Sheets
          break;
        } else {
          throw new Error('Incorrect password');
        }
      }
    }
    
    if (targetRowIndex === -1) {
      throw new Error('Guestbook entry not found');
    }
    
    // Mark as deleted (soft delete) instead of actually deleting the row
    guestbookSheet.getRange(targetRowIndex, 7).setValue('deleted'); // Column G: Status
    guestbookSheet.getRange(targetRowIndex, 9).setValue(`Deleted on ${new Date().toISOString()}`); // Column H: Comment
    
    console.log(`✅ Guestbook entry marked as deleted: ID ${entryId}`);
    
    const response = {
      success: true,
      entryId: entryId,
      message: 'Guestbook entry deleted successfully',
      timestamp: new Date().toISOString()
    };
    
    return createJsonResponse(response);
    
  } catch (error) {
    console.error('❌ Delete guestbook error:', error.toString());
    
    const errorResponse = {
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    };
    
    return createJsonResponse(errorResponse);
  }
}

/**
 * Get guestbook sheet (시트2번 - gid=1835692304)
 */
function getGuestbookSheet(spreadsheet) {
  try {
    // Try to get sheet by name first
    let sheet = spreadsheet.getSheetByName('방명록') || spreadsheet.getSheetByName('guestbook') || spreadsheet.getSheetByName('Guestbook');
    
    if (!sheet) {
      // If no sheet found by name, get by index (시트2번 = index 1)
      const sheets = spreadsheet.getSheets();
      if (sheets.length > 1) {
        sheet = sheets[1]; // 시트2번 (0-based index)
      }
    }
    
    if (!sheet) {
      throw new Error('Guestbook sheet not found. Please ensure sheet 2 exists or create a sheet named "방명록"');
    }
    
    console.log(`📋 Using guestbook sheet: ${sheet.getName()}`);
    
    // Check if headers exist, if not create them
    const headerRange = sheet.getRange(1, 1, 1, 8);
    const headers = headerRange.getValues()[0];
    
    const expectedHeaders = ['id', 'date', 'name', 'password', 'message', 'ip', 'status', 'comment'];
    
    // If first header is empty or doesn't match expected, set up headers
    if (!headers[0] || headers.join('').toLowerCase() !== expectedHeaders.join('').toLowerCase()) {
      console.log('📝 Setting up guestbook headers');
      headerRange.setValues([expectedHeaders]);
    }
    
    return sheet;
    
  } catch (error) {
    console.error('❌ Guestbook sheet error:', error.toString());
    throw error;
  }
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
 * Get or create spreadsheet for blog posts
 */
function getSpreadsheet() {
  try {
    if (!SPREADSHEET_ID || SPREADSHEET_ID === 'YOUR_SPREADSHEET_ID_HERE') {
      throw new Error('SPREADSHEET_ID not configured. Please update the script with your Google Sheets ID.');
    }
    
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    console.log(`📊 Using spreadsheet: ${spreadsheet.getName()}`);
    return spreadsheet;
    
  } catch (error) {
    if (error.toString().includes('not found')) {
      throw new Error('Spreadsheet not found. Please check your SPREADSHEET_ID.');
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