
import axios from 'axios';

const YOUR_LOCAL_IP = '10.131.143.65' 
const BACKEND_PORT = 5000; 

const BASE_URL = `http://${YOUR_LOCAL_IP}:${BACKEND_PORT}/api`; 
// const BASE_URL = `https://safewalk-3sv0.onrender.com/api`;

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;