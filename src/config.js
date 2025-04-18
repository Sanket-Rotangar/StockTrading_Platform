// Get the current hostname (IP address or localhost)
const hostname = window.location.hostname;
const API_BASE_URL = `http://${hostname}:5000`;

export { API_BASE_URL };
