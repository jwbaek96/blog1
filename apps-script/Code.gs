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

// Comments System Configuration
const SHEET_NAME = '시트1';
const ADMIN_KEY = '9632'; // 관리자 인증 키

// CORS Configuration
const ALLOWED_ORIGINS = [
  'https://jwbaek96.github.io',
  'https://jwbaek.kr',
  'http://localhost:5500',
  'http://127.0.0.1:5500'
];

/**
 * Create response with CORS headers
 */
function createCORSResponse(data, origin = null) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  
  // Set CORS headers
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    output.addHeader('Access-Control-Allow-Origin', origin);
  } else {
    output.addHeader('Access-Control-Allow-Origin', '*');
  }
  
  output.addHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  output.addHeader('Access-Control-Allow-Headers', 'Content-Type');
  output.addHeader('Access-Control-Max-Age', '86400');
  
  return output;
}

// 보안 설정
const SECURITY_CONFIG = {
    maxCommentLength: 500,
    maxAuthorLength: 20,
    minPasswordLength: 4,
    maxPasswordLength: 20,
    maxCommentsPerHour: 10, // 시간당 최대 댓글 수
    bannedWords: [
        '바보', '멍청이', '욕설', 'spam', 'advertisement',
        '광고', '홍보', '도박', '대출', '성인', '불법',
        '카지노', '바카라', '토토', '먹튀', '성인용품'
    ],
    spamPatterns: [
        /(.)\1{4,}/g, // 같은 문자 5번 이상 반복
        /[^\w\s가-힣]{5,}/g, // 특수문자 5개 이상 연속
        /(http|https|www\.|\.com|\.kr|\.net|\.org)/i, // URL 패턴
        /(\d{2,3}-?\d{3,4}-?\d{4})/g, // 전화번호 패턴
        /(카톡|텔레그램|위챗|라인)\s*[:：]\s*\w+/i // 메신저 ID 패턴
    ]
};

/**
 * Handle OPTIONS requests (CORS preflight)
 */
function doOptions(e) {
  console.log('📋 OPTIONS request received for CORS preflight');
  const origin = e.parameter?.origin || e.headers?.origin;
  console.log('🌐 Origin:', origin);
  
  const output = ContentService.createTextOutput('');
  output.setMimeType(ContentService.MimeType.TEXT);
  
  // 강화된 CORS 헤더
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    output.addHeader('Access-Control-Allow-Origin', origin);
    console.log('✅ Allowed origin:', origin);
  } else {
    output.addHeader('Access-Control-Allow-Origin', '*');
    console.log('⚠️ Using wildcard origin for:', origin);
  }
  
  output.addHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  output.addHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  output.addHeader('Access-Control-Max-Age', '86400');
  output.addHeader('Access-Control-Allow-Credentials', 'false');
  
  console.log('📤 OPTIONS response sent');
  return output;
}

/**
 * Handle GET requests (data retrieval)
 */
function doGet(e) {
  try {
    const origin = e.parameter.origin || e.headers?.origin;
    const action = e.parameter.action || 'getPosts';
    
    if (action === 'getPosts') {
      return handleGetPosts(origin);
    } else if (action === 'savePost') {
      // Handle post save via GET request (from editor)
      const postData = JSON.parse(e.parameter.data || '{}');
      const requestData = {
        action: 'savePost',
        postData: postData
      };
      return handlePostSave(requestData);
    } else if (action === 'updatePost') {
      // Handle post update via GET request (from editor)
      const postData = JSON.parse(e.parameter.data || '{}');
      const requestData = {
        action: 'updatePost',
        postData: postData
      };
      return handlePostUpdate(requestData);
    } else if (action === 'deletePost') {
      // Handle post delete via GET request
      const requestData = {
        postId: e.parameter.postId
      };
      return handleDeletePost(requestData);
    } else if (action === 'getGuestbook') {
      const offset = parseInt(e.parameter.offset) || 0;
      const limit = parseInt(e.parameter.limit) || 10;
      return handleGetGuestbook(offset, limit);
    } else if (action === 'getComments') {
      // Handle comment retrieval
      const postId = e.parameter.postId;
      return getComments(postId);
    } else if (action === 'init') {
      // Handle comments system initialization
      return initializeCommentsSystem();
    } else if (action === 'addComment') {
      // Handle comment addition
      const requestData = {
        postId: e.parameter.postId,
        author: e.parameter.author,
        password: e.parameter.password,
        content: e.parameter.content,
        parentId: e.parameter.parentId
      };
      return addComment(requestData);
    } else if (action === 'deleteComment') {
      // Handle comment deletion
      const requestData = {
        postId: e.parameter.postId,
        commentId: e.parameter.commentId,
        password: e.parameter.password,
        isAdmin: e.parameter.isAdmin === 'true'
      };
      return deleteComment(requestData);
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
 * Handle get posts requests (OPTIMIZED)
 */
function handleGetPosts(origin = null) {
  try {
    // 캐시 확인 (5분 캐시)
    const cache = CacheService.getScriptCache();
    const cacheKey = 'blog_posts_cache';
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      console.log('✅ Returning cached posts data');
      return createCORSResponse(JSON.parse(cachedData), origin);
    }
    
    const spreadsheet = getSpreadsheet();
    const sheet = spreadsheet.getActiveSheet();
    
    // 최적화: 필요한 범위만 읽기
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    
    if (lastRow <= 1) {
      return createJsonResponse({
        success: true,
        posts: [],
        message: 'No posts found'
      });
    }
    
    // 배치로 데이터 읽기 (헤더 제외하고 데이터만)
    const values = sheet.getRange(2, 1, lastRow - 1, Math.min(lastCol, 10)).getValues();
    
    // 빈 행 필터링을 위한 사전 처리
    const validRows = values.filter(row => 
      row[1] && // title 존재
      row[1].toString().trim() !== '' && // 빈 제목 제외
      !row[1].toString().includes('<div>') && // HTML 조각 제외
      !row[1].toString().includes('</div>') &&
      !row[1].toString().match(/^\d+$/) // 숫자만인 제목 제외
    );
    
    // 배치 처리로 posts 배열 생성
    const posts = validRows.map((row, index) => ({
      id: row[0] || (index + 2), // 원본 행 번호 고려
      title: row[1].toString().trim(),
      date: row[2] || '',
      thumbnail: row[3] || '',
      content: row[4] || '',
      tags: row[5] || '',
      images: row[6] || '',
      videos: row[7] || '',
      status: row[8] || 'published',
      comment: row[9] || ''
    }));
    
    const response = {
      success: true,
      posts: posts,
      count: posts.length,
      timestamp: new Date().toISOString()
    };
    
    // 캐시에 저장 (5분)
    try {
      cache.put(cacheKey, JSON.stringify(response), 300);
      console.log('✅ Posts data cached for 5 minutes');
    } catch (cacheError) {
      console.warn('⚠️ Failed to cache data:', cacheError);
    }
    
    return createCORSResponse(response, origin);
    
  } catch (error) {
    console.error('❌ Get request error:', error.toString());
    
    const origin = e.parameter.origin || e.headers?.origin;
    const errorResponse = {
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    };
    
    return createCORSResponse(errorResponse, origin);
  }
}

/**
 * Handle POST requests (file uploads and post saving)
 */
function doPost(e) {
  try {
    const origin = e.parameter?.origin || e.headers?.origin;
    let requestData;
    
    // Handle FormData (from form submission)
    if (e.parameters && e.parameters.data) {
      requestData = JSON.parse(e.parameters.data[0]); // FormData values are arrays
    }
    // Handle direct JSON (fallback)
    else if (e.postData && e.postData.contents) {
      requestData = JSON.parse(e.postData.contents);
    }
    else {
      throw new Error('No valid request data found');
    }
    
    // Check request type
    if (requestData.action === 'savePost') {
      return handlePostSave(requestData);
    } else if (requestData.action === 'updatePost') {
      return handlePostUpdate(requestData);
    } else if (requestData.action === 'deletePost') {
      return handleDeletePost(requestData);
    } else if (requestData.action === 'addGuestbook') {
      return handleAddGuestbook(requestData);
    } else if (requestData.action === 'deleteGuestbook') {
      return handleDeleteGuestbook(requestData);
    } else if (requestData.action === 'init') {
      return initializeCommentsSystem();
    } else if (requestData.action === 'addComment') {
      return addComment(requestData);
    } else if (requestData.action === 'deleteComment') {
      return deleteComment(requestData);
    } else if (requestData.file) {
      return handleFileUpload(requestData);
    } else {
      throw new Error('Invalid request: no action specified or file data missing');
    }
    
  } catch (error) {
    console.error('❌ Post request error:', error.toString());
    
    const origin = e.parameter?.origin || e.headers?.origin;
    const errorResponse = {
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    };
    
    return createCORSResponse(errorResponse, origin);
  }
}

/**
 * Handle file upload requests
 */
function handleFileUpload(requestData) {
  try {
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
    // Validate post data
    const postData = requestData.postData;
    
    if (!postData || !postData.title) {
      throw new Error('Invalid post data: title is required');
    }
    
    // Get spreadsheet
    const spreadsheet = getSpreadsheet();
    const sheet = spreadsheet.getActiveSheet();
    
    // Use ROW()-1 formula for auto-incrementing ID
    const currentDateTime = new Date().toISOString().replace('T', ' ').split('.')[0]; // YYYY-MM-DD HH:MM:SS format
    
    // Prepare row data matching required structure: [id, title, date, thumbnail, content, tags, images, videos, status, comment]
    const rowData = [
      '=ROW()-1',                       // A: ID (자동 증가 공식)
      postData.title || 'Untitled',    // B: Title  
      postData.date || currentDateTime, // C: Date
      postData.thumbnail || '',        // D: Thumbnail
      postData.content || '',          // E: Content
      postData.tags || '',             // F: Tags
      postData.images || '',           // G: Images
      postData.videos || '',           // H: Videos
      postData.status || 'published',  // I: Status
      ''                               // J: Comment (댓글 데이터 - 빈 문자열로 초기화)
    ];
    
    // Add row to sheet
    sheet.appendRow(rowData);
    
    // Get the row number to determine the actual ID that will be generated
    const lastRow = sheet.getLastRow();
    const calculatedId = lastRow - 1;
    
    // 캐시 무효화 (새 포스트가 추가되었으므로)
    const cache = CacheService.getScriptCache();
    try {
      cache.remove('blog_posts_cache');
      console.log('✅ Post cache invalidated after save');
    } catch (cacheError) {
      console.warn('⚠️ Failed to invalidate cache:', cacheError);
    }
    
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
 * Handle post update requests
 */
function handlePostUpdate(requestData) {
  try {
    console.log('🔄 ===== POST UPDATE REQUEST RECEIVED =====');
    console.log('📥 Full request data:', JSON.stringify(requestData, null, 2));
    
    // Validate post data
    const postData = requestData.postData;
    console.log('📋 Post data received:', JSON.stringify(postData, null, 2));
    
    if (!postData || !postData.id || !postData.title) {
      throw new Error('Invalid post data: ID and title are required for update');
    }
    
    const postId = parseInt(postData.id);
    
    // Get spreadsheet
    const spreadsheet = getSpreadsheet();
    const sheet = spreadsheet.getActiveSheet();
    const data = sheet.getDataRange().getValues();
    
    // Find the row with matching ID (ID is in column A, but remember row 1 is headers)
    let targetRow = -1;
    for (let i = 1; i < data.length; i++) { // Start from 1 to skip header
      if (data[i][0] == postId) { // Column A contains ID
        targetRow = i + 1; // Convert to 1-based row number
        break;
      }
    }
    
    if (targetRow === -1) {
      throw new Error(`Post with ID ${postId} not found`);
    }
    
    console.log(`📍 Found post at row ${targetRow}, updating...`);
    
    // Current date for update
    const currentDateTime = new Date().toISOString().replace('T', ' ').split('.')[0]; // YYYY-MM-DD HH:MM:SS format
    
    // Update row data - preserve ID but update other fields
    // Structure: [id, title, date, thumbnail, content, tags, images, videos, status, comment]
    const updatedRowData = [
      postId,                          // A: ID (keep existing)
      postData.title || 'Untitled',   // B: Title  
      postData.date || currentDateTime, // C: Date
      postData.thumbnail || '',       // D: Thumbnail
      postData.content || '',         // E: Content
      postData.tags || '',            // F: Tags
      postData.images || '',          // G: Images
      postData.videos || '',          // H: Videos
      postData.status || 'published', // I: Status
      data[targetRow-1][9] || ''      // J: Comment (preserve existing comment data)
    ];
    
    console.log('📊 Updating data structure:');
    console.log('🆔 ID:', postId, '(preserved)');
    console.log('📝 Title:', postData.title);
    console.log('📅 Date:', postData.date || currentDateTime);
    console.log('🖼️ Thumbnail:', postData.thumbnail || '(empty)');
    console.log('📄 Content length:', (postData.content || '').length);
    console.log('🏷️ Tags:', postData.tags || '(empty)');
    console.log('📷 Images:', postData.images || '(empty)');
    console.log('🎥 Videos:', postData.videos || '(empty)');
    console.log('📊 Status:', postData.status || 'published');
    console.log('💬 Comment: (preserved)');
    console.log('📋 Updated row data array:', updatedRowData);
    
    // Update the specific row
    const range = sheet.getRange(targetRow, 1, 1, updatedRowData.length);
    range.setValues([updatedRowData]);
    
    // 캐시 무효화 (포스트가 업데이트되었으므로)
    const cache = CacheService.getScriptCache();
    try {
      cache.remove('blog_posts_cache');
      cache.remove(`comments_${postId}`); // 해당 포스트의 댓글 캐시도 무효화
      console.log('✅ Post cache invalidated after update');
    } catch (cacheError) {
      console.warn('⚠️ Failed to invalidate cache:', cacheError);
    }
    
    console.log(`✅ Post updated successfully: ${postData.title} (ID: ${postId})`);
    
    const response = {
      success: true,
      postId: postId,
      title: postData.title,
      message: 'Post updated in Google Sheets successfully',
      timestamp: new Date().toISOString()
    };
    
    return createJsonResponse(response);
    
  } catch (error) {
    console.error('❌ Post update error:', error.toString());
    
    const errorResponse = {
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    };
    
    return createJsonResponse(errorResponse);
  }
}

/**
 * Handle post update requests
 */
function handlePostUpdate(requestData) {
  try {
    console.log('🔄 ===== POST UPDATE REQUEST RECEIVED =====');
    console.log('📥 Full request data:', JSON.stringify(requestData, null, 2));
    
    // Validate post data
    const postData = requestData.postData;
    console.log('📋 Post data received:', JSON.stringify(postData, null, 2));
    
    if (!postData || !postData.title || !postData.id) {
      throw new Error('Invalid post data: title and id are required for update');
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
      if (rowId == postData.id) {
        targetRowIndex = i + 1; // Convert to 1-based index for Google Sheets
        break;
      }
    }
    
    if (targetRowIndex === -1) {
      throw new Error('Post not found with ID: ' + postData.id);
    }
    
    const currentDateTime = new Date().toISOString().replace('T', ' ').split('.')[0]; // YYYY-MM-DD HH:MM:SS format
    
    // Update row data (keeping existing ID and preserving comment data)
    const existingCommentData = values[targetRowIndex - 1][9] || ''; // J column (comments)
    
    const updatedRowData = [
      postData.id,                        // A: ID (keep existing)
      postData.title || 'Untitled',      // B: Title  
      postData.date || currentDateTime,   // C: Date
      postData.thumbnail || '',          // D: Thumbnail
      postData.content || '',            // E: Content
      postData.tags || '',               // F: Tags
      postData.images || '',             // G: Images
      postData.videos || '',             // H: Videos
      postData.status || 'published',    // I: Status
      existingCommentData                // J: Comment (preserve existing comments)
    ];
    
    console.log('📊 Updating post data:');
    console.log('🆔 ID:', postData.id, '(preserving existing)');
    console.log('📝 Title:', postData.title);
    console.log('📅 Date:', postData.date || currentDateTime);
    console.log('🖼️ Thumbnail:', postData.thumbnail || '(empty)');
    console.log('📄 Content length:', (postData.content || '').length);
    console.log('🏷️ Tags:', postData.tags || '(empty)');
    console.log('📷 Images:', postData.images || '(empty)');
    console.log('🎥 Videos:', postData.videos || '(empty)');
    console.log('📊 Status:', postData.status || 'published');
    console.log('💬 Comments: preserved existing data');
    
    // Update the entire row
    const range = sheet.getRange(targetRowIndex, 1, 1, updatedRowData.length);
    range.setValues([updatedRowData]);
    
    console.log(`✅ Post updated successfully: ${postData.title} (ID: ${postData.id})`);
    
    const response = {
      success: true,
      postId: postData.id,
      title: postData.title,
      message: 'Post updated successfully',
      timestamp: new Date().toISOString()
    };
    
    return createJsonResponse(response);
    
  } catch (error) {
    console.error('❌ Post update error:', error.toString());
    
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
 * Create JSON response with proper headers (deprecated - use createCORSResponse)
 */
function createJsonResponse(data) {
  return createCORSResponse(data, null);
}

// ==================== 댓글 시스템 함수들 ====================

/**
 * 시트 초기화 및 검증
 */
function initializeCommentsSystem() {
    try {
        const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
        if (!spreadsheet) {
            throw new Error('Spreadsheet not found');
        }
        
        const sheet = spreadsheet.getSheetByName(SHEET_NAME);
        if (!sheet) {
            throw new Error(`Sheet "${SHEET_NAME}" not found`);
        }
        
        const dataRange = sheet.getDataRange();
        if (!dataRange || dataRange.getNumRows() === 0) {
            throw new Error('No data in sheet');
        }
        
        const headers = dataRange.getValues()[0];
        
        // comment 컬럼이 있는지 확인
        const commentColumnIndex = headers.indexOf('comment');
        if (commentColumnIndex === -1) {
            // comment 컬럼 추가
            headers.push('comment');
            sheet.getRange(1, headers.length).setValue('comment');
            console.log('✅ Added comment column to sheet');
        }
        
        return createJsonResponse({ 
            success: true, 
            message: 'Comments system initialized successfully' 
        });
        
    } catch (error) {
        console.error('❌ Error initializing comments system:', error);
        return createJsonResponse({ 
            success: false, 
            error: error.toString() 
        });
    }
}

/**
 * 댓글 조회 (OPTIMIZED)
 */
function getComments(postId) {
    try {
        console.log('💬 Getting comments for post:', postId);
        
        if (!postId) {
            return createJsonResponse({ 
                success: false, 
                error: 'Post ID is required' 
            });
        }
        
        // 캐시 확인
        const cache = CacheService.getScriptCache();
        const cacheKey = `comments_${postId}`;
        const cachedComments = cache.get(cacheKey);
        
        if (cachedComments) {
            console.log('✅ Returning cached comments for post:', postId);
            return createJsonResponse(JSON.parse(cachedComments));
        }
        
        const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
        const sheet = spreadsheet.getSheetByName(SHEET_NAME);
        
        if (!sheet) {
            return createJsonResponse({ 
                success: false, 
                error: `Sheet "${SHEET_NAME}" not found` 
            });
        }
        
        // 최적화: 헤더만 먼저 읽고 컬럼 인덱스 파악
        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        const idColumnIndex = headers.findIndex(h => h.toLowerCase() === 'id') + 1;
        const commentColumnIndex = headers.findIndex(h => h.toLowerCase() === 'comment') + 1;
        
        if (idColumnIndex === 0) {
            return createJsonResponse({ 
                success: false, 
                error: 'ID column not found' 
            });
        }
        
        // 최적화: ID 컬럼만 읽어서 빠르게 행 찾기
        const lastRow = sheet.getLastRow();
        const idValues = sheet.getRange(2, idColumnIndex, lastRow - 1, 1).getValues();
        
        let targetRowIndex = -1;
        const searchId = String(postId);
        
        for (let i = 0; i < idValues.length; i++) {
            if (String(idValues[i][0]) === searchId) {
                targetRowIndex = i + 2; // 헤더 행 고려한 실제 행 번호
                break;
            }
        }
        
        if (targetRowIndex === -1) {
            return createJsonResponse({ 
                success: false, 
                error: 'Post not found' 
            });
        }
        
        // 해당 행의 댓글 컬럼만 읽기
        let commentData = '';
        if (commentColumnIndex > 0) {
            const commentCell = sheet.getRange(targetRowIndex, commentColumnIndex).getValue();
            commentData = commentCell || '';
        }
        
        // 댓글 데이터 파싱
        let comments = [];
        if (commentData) {
            try {
                comments = JSON.parse(commentData);
                if (!Array.isArray(comments)) {
                    comments = [];
                }
            } catch (parseError) {
                console.warn('⚠️ Failed to parse comments:', parseError);
                comments = [];
            }
        }
        
        const response = { 
            success: true, 
            data: comments 
        };
        
        // 캐시 저장 (2분)
        try {
            cache.put(cacheKey, JSON.stringify(response), 120);
            console.log('✅ Comments cached for post:', postId);
        } catch (cacheError) {
            console.warn('⚠️ Failed to cache comments:', cacheError);
        }
        
        console.log('✅ Retrieved comments:', comments.length);
        return createJsonResponse(response);
        
    } catch (error) {
        console.error('❌ Error getting comments:', error);
        return createJsonResponse({ 
            success: false, 
            error: error.toString() 
        });
    }
}

/**
 * 댓글 작성
 */
function addComment(requestData) {
    try {
        console.log('✏️ Adding comment:', requestData);
        
        const { postId, author, password, content, parentId } = requestData;
        
        // 보안 검증
        const securityCheck = validateCommentSecurity(author, password, content);
        if (!securityCheck.isValid) {
            return createJsonResponse({ 
                success: false, 
                error: securityCheck.error 
            });
        }
        
        // 스팸 방지 검사
        const spamCheck = checkForSpam(content, author);
        if (!spamCheck.isValid) {
            return createJsonResponse({ 
                success: false, 
                error: spamCheck.error 
            });
        }
        
        // 사용자별 댓글 빈도 체크
        const rateLimit = checkRateLimit(author);
        if (!rateLimit.isValid) {
            return createJsonResponse({ 
                success: false, 
                error: rateLimit.error 
            });
        }
        
        const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
        const sheet = spreadsheet.getSheetByName(SHEET_NAME);
        
        if (!sheet) {
            return createJsonResponse({ 
                success: false, 
                error: `Sheet "${SHEET_NAME}" not found` 
            });
        }
        
        // 최적화: 헤더와 필요한 컬럼만 읽기
        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        const idColumnIndex = headers.findIndex(h => h.toLowerCase() === 'id') + 1;
        const commentColumnIndex = headers.findIndex(h => h.toLowerCase() === 'comment') + 1;
        
        if (idColumnIndex === 0) {
            return createJsonResponse({ 
                success: false, 
                error: 'ID column not found' 
            });
        }
        
        // 최적화: ID 컬럼만 읽어서 빠르게 행 찾기
        const lastRow = sheet.getLastRow();
        const idValues = sheet.getRange(2, idColumnIndex, lastRow - 1, 1).getValues();
        
        let postRowIndex = -1;
        const searchId = String(postId);
        
        for (let i = 0; i < idValues.length; i++) {
            if (String(idValues[i][0]) === searchId) {
                postRowIndex = i + 2; // 헤더 행 고려한 실제 행 번호
                break;
            }
        }
        
        if (postRowIndex === -1) {
            return createJsonResponse({ 
                success: false, 
                error: 'Post not found' 
            });
        }
        
        // 최적화: 해당 행의 댓글 컬럼만 읽기
        let commentData = '';
        if (commentColumnIndex > 0) {
            const commentCell = sheet.getRange(postRowIndex, commentColumnIndex).getValue();
            commentData = commentCell || '';
        }
        
        // 기존 댓글 데이터 가져오기
        let comments = [];
        if (commentData && commentData.trim()) {
            try {
                comments = JSON.parse(commentData);
            } catch (parseError) {
                console.warn('⚠️ Failed to parse existing comments:', parseError);
                comments = [];
            }
        }
        
        // 새 댓글 ID 생성
        const newCommentId = generateCommentId(parentId, comments);
        
        // 새 댓글 객체 생성
        const newComment = {
            id: newCommentId,
            type: parentId ? 'reply' : 'comment',
            parentId: parentId,
            depth: parentId ? 1 : 0,
            author: author,
            password: hashPassword(password), // 비밀번호 해싱
            content: content,
            createdAt: new Date().toISOString(),
            isDeleted: false
        };
        
        // 댓글 배열에 추가
        comments.push(newComment);
        
        // 스프레드시트 업데이트 (이미 commentColumnIndex는 위에서 계산됨)
        if (commentColumnIndex === 0) {
            return createJsonResponse({ 
                success: false, 
                error: 'Comment column not found in sheet' 
            });
        }
        
        sheet.getRange(postRowIndex, commentColumnIndex).setValue(JSON.stringify(comments));
        
        // 캐시 무효화 (댓글이 추가되었으므로)
        const cache = CacheService.getScriptCache();
        try {
            cache.remove(`comments_${postId}`);
            cache.remove('blog_posts_cache'); // 전체 포스트 캐시도 무효화
            console.log('✅ Cache invalidated for post:', postId);
        } catch (cacheError) {
            console.warn('⚠️ Failed to invalidate cache:', cacheError);
        }
        
        console.log('✅ Comment added successfully:', newCommentId);
        return createJsonResponse({ 
            success: true, 
            commentId: newCommentId,
            message: 'Comment added successfully' 
        });
        
    } catch (error) {
        console.error('❌ Error adding comment:', error);
        return createJsonResponse({ 
            success: false, 
            error: error.toString() 
        });
    }
}

/**
 * 댓글 삭제
 */
function deleteComment(requestData) {
    try {
        console.log('🗑️ Deleting comment:', requestData);
        
        const { postId, commentId, password, isAdmin } = requestData;
        
        if (!postId || !commentId) {
            return createJsonResponse({ 
                success: false, 
                error: 'Post ID and Comment ID are required' 
            });
        }
        
        const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
        if (!spreadsheet) {
            return createJsonResponse({ 
                success: false, 
                error: 'Spreadsheet not found' 
            });
        }
        
        const sheet = spreadsheet.getSheetByName(SHEET_NAME);
        if (!sheet) {
            return createJsonResponse({ 
                success: false, 
                error: `Sheet "${SHEET_NAME}" not found` 
            });
        }
        
        const dataRange = sheet.getDataRange();
        if (!dataRange) {
            return createJsonResponse({ 
                success: false, 
                error: 'No data found in sheet' 
            });
        }
        
        const data = dataRange.getValues();
        const headers = data[0];
        
        // postId로 해당 행 찾기
        let postRowIndex = -1;
        let postRow = null;
        
        for (let i = 1; i < data.length; i++) {
            const row = {};
            headers.forEach((header, index) => {
                row[header] = data[i][index];
            });
            
            // 타입을 맞춰서 비교 (숫자/문자열 모두 처리)
            const rowId = String(row.id || row.ID || row.Id);
            const searchId = String(postId);
            
            if (rowId === searchId) {
                postRowIndex = i + 1;
                postRow = row;
                break;
            }
        }
        
        if (!postRow) {
            return createJsonResponse({ 
                success: false, 
                error: 'Post not found' 
            });
        }
        
        // 기존 댓글 데이터 가져오기
        let comments = [];
        if (postRow.comment && postRow.comment.trim()) {
            try {
                comments = JSON.parse(postRow.comment);
            } catch (parseError) {
                return createJsonResponse({ 
                    success: false, 
                    error: 'Failed to parse comments data' 
                });
            }
        }
        
        // 삭제할 댓글 찾기
        const commentIndex = comments.findIndex(c => c.id === commentId);
        if (commentIndex === -1) {
            return createJsonResponse({ 
                success: false, 
                error: 'Comment not found' 
            });
        }
        
        const comment = comments[commentIndex];
        
        // 이미 삭제된 댓글인지 확인
        if (comment.isDeleted) {
            return createJsonResponse({ 
                success: false, 
                error: 'Comment already deleted' 
            });
        }
        
        // 권한 확인
        if (!isAdmin) {
            // 일반 사용자는 비밀번호 확인
            if (!password) {
                return createJsonResponse({ 
                    success: false, 
                    error: 'Password is required' 
                });
            }
            
            if (!verifyPassword(password, comment.password)) {
                return createJsonResponse({ 
                    success: false, 
                    error: 'Incorrect password' 
                });
            }
        } else {
            console.log('🔑 Admin deletion requested');
        }
        
        // 댓글을 삭제됨으로 표시
        comments[commentIndex].isDeleted = true;
        comments[commentIndex].content = ''; // 내용 제거
        
        // 스프레드시트 업데이트
        const commentColumnIndex = headers.indexOf('comment') + 1;
        sheet.getRange(postRowIndex, commentColumnIndex).setValue(JSON.stringify(comments));
        
        console.log('✅ Comment deleted successfully:', commentId);
        return createJsonResponse({ 
            success: true, 
            message: 'Comment deleted successfully' 
        });
        
    } catch (error) {
        console.error('❌ Error deleting comment:', error);
        return createJsonResponse({ 
            success: false, 
            error: error.toString() 
        });
    }
}

// ==================== 댓글 유틸리티 함수들 ====================

/**
 * 댓글 ID 생성 (2단계 계층 구조)
 */
function generateCommentId(parentId, existingComments) {
    if (!parentId) {
        // 최상위 댓글: 1, 2, 3, ...
        const topLevelIds = existingComments
            .filter(c => !c.parentId)
            .map(c => parseInt(c.id))
            .filter(id => !isNaN(id));
        
        const maxId = topLevelIds.length > 0 ? Math.max(...topLevelIds) : 0;
        return String(maxId + 1);
    } else {
        // 답글: 1-1, 1-2, 1-3, ...
        // 2단계 제한 확인
        if (parentId.includes('-')) {
            throw new Error('Cannot reply to replies (2-level limit)');
        }
        
        const siblings = existingComments.filter(c => c.parentId === parentId);
        const siblingNumbers = siblings
            .map(c => {
                const parts = c.id.split('-');
                if (parts.length === 2 && parts[1] !== 'admin') {
                    return parseInt(parts[1]);
                }
                return 0;
            })
            .filter(num => !isNaN(num));
        
        const maxSibling = siblingNumbers.length > 0 ? Math.max(...siblingNumbers) : 0;
        return `${parentId}-${maxSibling + 1}`;
    }
}

/**
 * 비밀번호 해싱
 */
function hashPassword(password) {
    return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password + 'blog_salt_2024'));
}

/**
 * 비밀번호 검증
 */
function verifyPassword(inputPassword, hashedPassword) {
    return hashPassword(inputPassword) === hashedPassword;
}

// ==================== 보안 검증 함수들 ====================

/**
 * 댓글 보안 검증
 */
function validateCommentSecurity(author, password, content) {
    // 필수 필드 검증
    if (!author || !password || !content) {
        return { isValid: false, error: '필수 필드가 누락되었습니다.' };
    }
    
    // 길이 제한 검증
    if (author.length > 20) {
        return { isValid: false, error: '작성자명이 너무 깁니다. (최대 20자)' };
    }
    
    if (password.length !== 4) {
        return { isValid: false, error: '비밀번호는 숫자 4자리여야 합니다.' };
    }
    
    // 숫자만 허용 검사
    if (!/^\d{4}$/.test(password)) {
        return { isValid: false, error: '비밀번호는 숫자만 입력 가능합니다.' };
    }
    
    if (content.length > 500) {
        return { isValid: false, error: '댓글이 너무 깁니다. (최대 500자)' };
    }
    
    // 금지어 검사
    const bannedCheck = checkBannedWords(content + ' ' + author);
    if (!bannedCheck.isValid) {
        return bannedCheck;
    }
    
    // HTML 태그 검사
    if (content.includes('<') || content.includes('>')) {
        return { isValid: false, error: 'HTML 태그는 사용할 수 없습니다.' };
    }
    
    // 특수문자 남용 검사
    const specialCharPattern = /[!@#$%^&*()_+=\[\]{}|;':",./<>?~`]{5,}/;
    if (specialCharPattern.test(content)) {
        return { isValid: false, error: '특수문자를 과도하게 사용할 수 없습니다.' };
    }
    
    return { isValid: true };
}

/**
 * 금지어 검사
 */
function checkBannedWords(text) {
    const lowerText = text.toLowerCase();
    
    for (const word of SECURITY_CONFIG.bannedWords) {
        if (lowerText.includes(word.toLowerCase())) {
            return { isValid: false, error: '부적절한 내용이 포함되어 있습니다.' };
        }
    }
    
    return { isValid: true };
}

/**
 * 스팸 검사
 */
function checkForSpam(content, author) {
    // 반복 문자 검사
    if (/(.)\1{4,}/.test(content)) {
        return { isValid: false, error: '동일한 문자의 과도한 반복은 허용되지 않습니다.' };
    }
    
    // URL 패턴 검사
    const urlPattern = /(https?:\/\/|www\.|\.com|\.net|\.org|\.kr)/i;
    if (urlPattern.test(content)) {
        return { isValid: false, error: 'URL이나 링크는 포함할 수 없습니다.' };
    }
    
    // 전화번호 패턴 검사
    const phonePattern = /\d{3}[-\s]?\d{3,4}[-\s]?\d{4}/;
    if (phonePattern.test(content)) {
        return { isValid: false, error: '전화번호는 포함할 수 없습니다.' };
    }
    
    // 이메일 패턴 검사
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    if (emailPattern.test(content)) {
        return { isValid: false, error: '이메일 주소는 포함할 수 없습니다.' };
    }
    
    // 스팸 키워드 검사
    for (const pattern of SECURITY_CONFIG.spamPatterns) {
        if (new RegExp(pattern, 'i').test(content)) {
            return { isValid: false, error: '스팸으로 의심되는 내용입니다.' };
        }
    }
    
    return { isValid: true };
}

/**
 * 사용량 제한 검사
 */
function checkRateLimit(author) {
    // 기본적인 검증만 수행
    // 실제로는 PropertiesService나 외부 저장소를 사용하여 
    // 사용자별 댓글 작성 빈도를 추적해야 함
    
    // 작성자명이 너무 짧거나 의심스러운 패턴 검사
    if (author.length < 2) {
        return { isValid: false, error: '작성자명이 너무 짧습니다. (최소 2자)' };
    }
    
    // 숫자만으로 이루어진 작성자명 검사
    if (/^\d+$/.test(author)) {
        return { isValid: false, error: '작성자명은 숫자만으로 구성될 수 없습니다.' };
    }
    
    return { isValid: true };
}