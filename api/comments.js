// 댓글 시스템 API (Vercel Serverless Function)
// Google Apps Script의 댓글 관련 기능만 프록시

export const maxDuration = 60; // 60초 타임아웃 설정

export default async function handler(req, res) {
    // CORS 헤더 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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
        
        // 허용된 액션들 (댓글 관련만)
        const allowedActions = [
            'getComments',
            'addComment', 
            'deleteComment',
            'init'
        ];
        
        // GET 요청 처리 (댓글 조회)
        if (req.method === 'GET') {
            const action = req.query.action;
            
            if (!action || !allowedActions.includes(action)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid or missing action for comments API',
                    allowedActions: allowedActions
                });
            }
            
            // 쿼리 파라미터 전달
            const params = new URLSearchParams(req.query);
            targetUrl += `?${params.toString()}`;
        }
        
        // POST 요청 처리 (댓글 추가/삭제)
        else if (req.method === 'POST') {
            const requestData = req.body;
            
            if (!requestData || !requestData.action || !allowedActions.includes(requestData.action)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid or missing action for comments API',
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
        console.log(`🔄 Proxying ${req.method} request to Google Apps Script`);
        
        const response = await fetch(targetUrl, options);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.text();
        
        // JSON 파싱 시도
        try {
            const jsonData = JSON.parse(data);
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
        console.error('❌ Comments API error:', error);
        
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error',
            timestamp: new Date().toISOString()
        });
    }
}