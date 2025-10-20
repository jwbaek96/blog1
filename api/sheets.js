// Vercel Serverless Function for Google Apps Script Proxy
// This hides the actual Google Apps Script URL from the client

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
        // 환경변수에서 실제 Google Apps Script URL 가져오기
        const APPS_SCRIPT_URL = process.env.V_GOOGLE_APPSCRIPT_URL;
        
        if (!APPS_SCRIPT_URL) {
            console.error('❌ V_GOOGLE_APPSCRIPT_URL environment variable not configured');
            
            return res.status(500).json({ 
                success: false, 
                error: 'V_GOOGLE_APPSCRIPT_URL not configured in Vercel environment variables',
                debug: {
                    hasEnvVar: !!APPS_SCRIPT_URL,
                    availableEnvVarsCount: Object.keys(process.env).filter(key => key.startsWith('V_')).length,
                    vercelEnv: !!process.env.VERCEL
                }
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
                // JSON 객체를 JSON 문자열로 전달 (Google Apps Script가 JSON으로 응답하도록)
                options.body = JSON.stringify(req.body);
                options.headers['Content-Type'] = 'application/json';
            }
        }
        
        // Google Apps Script에 요청 전달
        const response = await fetch(targetUrl, options);
        
        if (!response.ok) {
            console.error('❌ Apps Script response error:', response.status, response.statusText);
            const errorText = await response.text();
            console.error('❌ Error details:', errorText);
            throw new Error(`Apps Script returned ${response.status}: ${response.statusText}`);
        }
        
        // 응답 처리 개선
        const responseText = await response.text();
        
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            return res.status(500).json({
                success: false,
                error: 'Google Apps Script returned invalid JSON'
            });
        }
        
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