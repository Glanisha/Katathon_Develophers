
import axios from 'axios';

const YOUR_LOCAL_IP = '192.168.0.101'; 
const BACKEND_PORT = 5000; 

const BASE_URL = `http://${YOUR_LOCAL_IP}:${BACKEND_PORT}/api`; 

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;