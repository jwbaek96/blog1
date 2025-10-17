// Vercel Serverless Function for Google Apps Script Proxy
// This hides the actual Google Apps Script URL from the client

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
        // 환경변수에서 실제 Google Apps Script URL 가져오기
        const APPS_SCRIPT_URL = process.env.V_GOOGLE_APPSCRIPT_URL;
        
        // 환경변수 소스 확인을 위한 로깅
        console.log('🔍 Environment Variable Source Check:');
        console.log('- V_GOOGLE_APPSCRIPT_URL:', APPS_SCRIPT_URL ? '✅ Found' : '❌ Missing');
        console.log('- Source: Vercel Environment Variables');
        console.log('- URL Preview:', APPS_SCRIPT_URL ? `${APPS_SCRIPT_URL.substring(0, 50)}...` : 'N/A');
        
        if (!APPS_SCRIPT_URL) {
            console.error('❌ V_GOOGLE_APPSCRIPT_URL environment variable not configured');
            
            return res.status(500).json({ 
                success: false, 
                error: 'V_GOOGLE_APPSCRIPT_URL not configured in Vercel environment variables' 
            });
        }
        
        let targetUrl = APPS_SCRIPT_URL;
        let options = {
            method: req.method,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            }
        };
        
        // GET 요청의 경우 쿼리 파라미터 전달
        if (req.method === 'GET' && req.query) {
            const params = new URLSearchParams(req.query);
            targetUrl += `?${params.toString()}`;
        }
        
        // POST 요청의 경우 body 전달
        if (req.method === 'POST' && req.body) {
            if (typeof req.body === 'string') {
                options.body = req.body;
            } else {
                // JSON 객체인 경우 URLSearchParams로 변환
                const params = new URLSearchParams();
                Object.keys(req.body).forEach(key => {
                    params.append(key, req.body[key]);
                });
                options.body = params.toString();
            }
        }
        
        // Google Apps Script에 요청 전달
        console.log('🔗 Forwarding request to:', targetUrl);
        const response = await fetch(targetUrl, options);
        
        if (!response.ok) {
            console.error('❌ Apps Script response error:', response.status, response.statusText);
            const errorText = await response.text();
            console.error('❌ Error details:', errorText);
            throw new Error(`Apps Script returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // 응답 반환
        return res.status(200).json(data);
        
    } catch (error) {
        console.error('API Proxy Error:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
}