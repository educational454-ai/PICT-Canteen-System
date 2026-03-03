import axios from 'axios';

// This tells React to always talk to your Node.js server
const API = axios.create({
    baseURL: 'http://localhost:5000/api'
});

export default API;