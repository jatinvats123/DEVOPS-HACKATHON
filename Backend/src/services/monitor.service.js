import axios from 'axios';

export async function checkMonitor(url, timeout) {
  const start = Date.now();
  try {
    const response = await axios.get(url, { timeout });
    const responseTime = Date.now() - start;
    return {
      status: 'UP',
      error: null,
      responseTime,
      statusCode: response.status,
    };
  } catch (error) {
    const responseTime = Date.now() - start;
    return {
      status: 'DOWN',
      error: error.message,
      statusCode: error.response?.status || 500,
      responseTime,
    };
  }
}
