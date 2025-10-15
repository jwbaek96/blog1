// Vercel API endpoint to provide environment variables to client
export default function handler(req, res) {
    // CORS 헤더 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // OPTIONS 요청 처리 (CORS preflight)
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    // GET 요청만 허용
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    
    try {
        // 클라이언트에 제공할 환경변수들
        const config = {
            V_GOOGLE_APPSCRIPT_URL: process.env.V_GOOGLE_APPSCRIPT_URL || null,
            V_GOOGLE_DRIVE_FOLDER_ID: process.env.V_GOOGLE_DRIVE_FOLDER_ID || null,
            V_GOOGLE_DRIVE_API_KEY: process.env.V_GOOGLE_DRIVE_API_KEY || null,
            V_GOOGLE_API_KEY: process.env.V_GOOGLE_API_KEY || null,
            V_GOOGLE_CLIENT_ID: process.env.V_GOOGLE_CLIENT_ID || null
        };
        
        res.status(200).json(config);
    } catch (error) {
        console.error('Config API error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}