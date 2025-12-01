// API configuration
export const API_BASE_URL = import.meta.env.PROD 
  ? 'https://your-backend-url.railway.app' // Replace with your actual backend URL after deploying
  : 'http://localhost:3001';
