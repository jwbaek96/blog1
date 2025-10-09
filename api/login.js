// Vercel API for Admin Login

export default async function handler(req, res) {
    // CORS 헤더 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Preflight request 처리
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
    
    try {
        const { password } = req.body;
        const ADMIN_KEY = process.env.ADMIN_KEY;
        
        if (!ADMIN_KEY) {
            return res.status(500).json({ 
                success: false, 
                error: 'Admin key not configured' 
            });
        }
        
        // 비밀번호 확인
        if (password === ADMIN_KEY) {
            // 간단한 토큰 생성 (현재 시간 + 24시간)
            const token = Buffer.from(`admin_${Date.now()}_${Date.now() + 24 * 60 * 60 * 1000}`).toString('base64');
            
            return res.status(200).json({ 
                success: true, 
                token: token,
                expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24시간 후 만료
            });
        } else {
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid password' 
            });
        }
        
    } catch (error) {
        console.error('Login API Error:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
}