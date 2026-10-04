import axios from "axios";
import { getAccessToken, logout } from "../utility/secureStorage";

const axiosClient = axios.create({
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosClient.interceptors.request.use(
  async (config) => {
    // Skip token for public APIs
    if (config.requiresAuth === false) {
      return config;
    }

    const token = await getAccessToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// A token the server has already rejected is worthless — drop it so the next
// auth check routes back to login instead of retrying with a dead session.
axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const rejectedAuth =
      error.response?.status === 401 && error.config?.requiresAuth !== false;

    if (rejectedAuth) {
      await logout();
    }

    return Promise.reject(error);
  },
);

export default axiosClient;
