import axios from 'axios';
import https from 'https';

export async function checkMonitor(url, timeout) {
  const start = Date.now();
  try {
    // Some websites block requests without a proper User-Agent
    const response = await axios.get(url, { 
      timeout,
      headers: {
        'User-Agent': 'UptimeAI/1.0 (Monitoring Service)',
      },
      // Allow self-signed certificates and handle 3xx as UP
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      validateStatus: (status) => status >= 200 && status < 400,
      maxRedirects: 5,
    });

    const responseTime = Date.now() - start;
    return {
      status: 'UP',
      error: null,
      responseTime,
      statusCode: response.status,
    };
  } catch (error) {
    const responseTime = Date.now() - start;
    
    // Even if it's a 4xx or 5xx, the server responded, so it might be considered partially UP
    // but for strict monitoring, we usually want 2xx or 3xx.
    // Let's check if there was a response at all.
    const statusCode = error.response?.status || 500;
    
    return {
      status: 'DOWN',
      error: error.message,
      statusCode,
      responseTime,
    };
  }
}
