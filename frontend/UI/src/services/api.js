// API Configuration and Service Functions
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// API Client Configuration
class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem('authToken');
  }

  // Set authentication token
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }

  // Get authentication headers
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  // Generic API request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getHeaders(),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  // GET request
  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  // POST request
  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // PUT request
  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // DELETE request
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // File upload request
  async uploadFile(endpoint, formData) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {};
    
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('File Upload Error:', error);
      throw error;
    }
  }
}

// Create API client instance
const apiClient = new ApiClient();

// Auth API functions
export const authAPI = {
  // Normalize responses to { token, user }
  login: async (credentials) => {
    const res = await apiClient.post('/auth/signin', credentials);
    // Backend shape: { status, message, data: { token, user } }
    if (res && res.data) {
      return { token: res.data.token, user: res.data.user };
    }
    return res;
  },
  register: async (userData) => {
    const res = await apiClient.post('/auth/signup', userData);
    if (res && res.data) {
      return { token: res.data.token, user: res.data.user };
    }
    return res;
  },
  logout: () => {
    apiClient.setToken(null);
    return Promise.resolve();
  },
  // Return just the user object
  getCurrentUser: async () => {
    const res = await apiClient.get('/users/profile');
    if (res && res.data && res.data.user) {
      return res.data.user;
    }
    return res;
  },
};

// User API functions
export const userAPI = {
  getProfile: () => apiClient.get('/users/profile'),
  updateProfile: (data) => apiClient.put('/users/profile', data),
  getAnalysisHistory: () => apiClient.get('/users/history'),
};

// Upload API functions
export const uploadAPI = {
  uploadFile: (file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    
    return apiClient.uploadFile('/upload', formData);
  },
  getUploadHistory: () => apiClient.get('/upload/history'),
  deleteUpload: (uploadId) => apiClient.delete(`/upload/${uploadId}`),
};

// Analysis API functions
export const analysisAPI = {
  analyzeFile: (uploadId, analysisType = 'deepfake') => 
    apiClient.post('/analysis/analyze', { uploadId }),
  getAnalysisResult: (analysisId) => apiClient.get(`/analysis/${analysisId}`),
  getAnalysisHistory: () => apiClient.get('/analysis'),
  generateReport: (analysisId) => apiClient.post(`/analysis/${analysisId}/report`),
};

// Guest API functions (no authentication required)
export const guestAPI = {
  uploadFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    // Don't send auth token for guest uploads
    const url = `${apiClient.baseURL}/guest/upload`;
    return fetch(url, {
      method: 'POST',
      body: formData,
    }).then(res => res.json());
  },
  analyzeFile: (tempId, filePath, fileType) => 
    fetch(`${apiClient.baseURL}/guest/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tempId, filePath, fileType }),
    }).then(res => res.json()),
  analyzeTestFile: (testFileName, fileType = 'audio') =>
    fetch(`${apiClient.baseURL}/guest/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testFileName, fileType }),
    }).then(res => res.json()),
  getTestFiles: () =>
    fetch(`${apiClient.baseURL}/guest/test-files`)
      .then(res => res.json()),
  getAnalysisResult: (analysisId) => 
    fetch(`${apiClient.baseURL}/guest/report/${analysisId}`)
      .then(res => res.json()),
};

// Health check
export const healthAPI = {
  check: () => apiClient.get('/health'),
};

// Export the API client for direct use if needed
export default apiClient;
