import { useAuth } from "../context/AuthContext";



const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

const apiClient = async (url, options = {}) => {
    const originalRequest = { ...options
    };

    // Function to get the current access token
    const getAccessToken = () => localStorage.getItem('access_token');

    // Set headers, but handle FormData correctly
    options.headers = { ...options.headers,
    };
    // Do NOT set Content-Type for FormData; the browser must do it to include the boundary.
    if (!(options.body instanceof FormData)) {
        options.headers['Content-Type'] = 'application/json';
    }

    const token = getAccessToken();
    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }

    // Initial request
    let response = await fetch(`${API_BASE_URL}${url}`, options);

    // Check for 401 Unauthorized error
    if (response.status === 401) {
        if (isRefreshing) {
            // If token is already being refreshed, wait for the new token
            return new Promise((resolve, reject) => {
                    failedQueue.push({
                        resolve,
                        reject
                    });
                })
                .then(newToken => {
                    originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
                    return fetch(`${API_BASE_URL}${url}`, originalRequest);
                })
                .catch(err => {
                    return Promise.reject(err);
                });
        }

        isRefreshing = true;

        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
            // No refresh token, logout user
            isRefreshing = false;
            // This should trigger a redirect via AuthContext state change
            window.dispatchEvent(new Event('auth-failure'));
            return Promise.reject(new Error("No refresh token available."));
        }

        try {
            const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    refresh_token: refreshToken
                }),
            });

            if (!refreshResponse.ok) {
                // Refresh token is invalid, logout user
                processQueue(new Error("Session expired."), null);
                window.dispatchEvent(new Event('auth-failure'));
                return Promise.reject(new Error("Session expired. Please log in again."));
            }

            const {
                access_token
            } = await refreshResponse.json();
            localStorage.setItem('access_token', access_token);

            // Retry the original request with the new token
            options.headers['Authorization'] = `Bearer ${access_token}`;
            processQueue(null, access_token);
            return fetch(`${API_BASE_URL}${url}`, options);

        } catch (error) {
            processQueue(error, null);
            window.dispatchEvent(new Event('auth-failure'));
            return Promise.reject(error);
        } finally {
            isRefreshing = false;
        }
    }

    return response;
};

export default apiClient;