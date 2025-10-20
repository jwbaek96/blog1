// 포스트 관리 API (Vercel Serverless Function)
// 관리자 전용 - 포스트 CRUD 기능

export const maxDuration = 60; // 60초 타임아웃 설정

export default async function handler(req, res) {
    // CORS 헤더 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Preflight request 처리
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        // 환경변수에서 Google Apps Script URL 가져오기
        const APPS_SCRIPT_URL = process.env.V_GOOGLE_APPSCRIPT_URL;
        
        if (!APPS_SCRIPT_URL) {
            console.error('❌ V_GOOGLE_APPSCRIPT_URL not configured');
            return res.status(500).json({ 
                success: false, 
                error: 'Google Apps Script URL not configured'
            });
        }
        
        let targetUrl = APPS_SCRIPT_URL;
        let options = {
            method: req.method,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            }
        };
        
        // 허용된 액션들 (포스트 관련)
        const allowedActions = [
            'getPosts',     // 포스트 조회 (관리자용 실시간)
            'savePost',     // 포스트 생성
            'updatePost',   // 포스트 수정  
            'deletePost'    // 포스트 삭제
        ];
        
        // GET 요청 처리 (포스트 조회)
        if (req.method === 'GET') {
            const action = req.query.action;
            
            if (!action || !allowedActions.includes(action)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid or missing action for posts API',
                    allowedActions: allowedActions
                });
            }
            
            // 쿼리 파라미터 전달
            const params = new URLSearchParams(req.query);
            targetUrl += `?${params.toString()}`;
        }
        
        // POST/PUT/DELETE 요청 처리 (포스트 CUD)
        else if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
            const requestData = req.body;
            
            if (!requestData || !requestData.action || !allowedActions.includes(requestData.action)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid or missing action for posts API',
                    allowedActions: allowedActions
                });
            }
            
            // FormData 형식으로 전송
            const formData = new URLSearchParams();
            formData.append('data', JSON.stringify(requestData));
            
            options.body = formData.toString();
        }
        
        else {
            return res.status(405).json({
                success: false,
                error: 'Method not allowed'
            });
        }
        
        // Google Apps Script로 요청 전달
        console.log(`🔄 Proxying ${req.method} request to Google Apps Script for posts`);
        
        const response = await fetch(targetUrl, options);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.text();
        
        // JSON 파싱 시도
        try {
            const jsonData = JSON.parse(data);
            
            // 포스트 생성/수정/삭제 성공 시 GitHub Actions 트리거
            if (jsonData.success && ['savePost', 'updatePost', 'deletePost'].includes(req.body?.action || req.query?.action)) {
                console.log('✅ Post operation successful, will be synced to static files in ~15 minutes');
            }
            
            return res.status(200).json(jsonData);
        } catch (parseError) {
            // HTML 응답인 경우 (에러 페이지 등)
            console.warn('⚠️ Received non-JSON response:', data.substring(0, 200));
            return res.status(502).json({
                success: false,
                error: 'Invalid response from Google Apps Script',
                details: 'Expected JSON but received HTML/text'
            });
        }
        
    } catch (error) {
        console.error('❌ Posts API error:', error);
        
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error',
            timestamp: new Date().toISOString()
        });
    }
}