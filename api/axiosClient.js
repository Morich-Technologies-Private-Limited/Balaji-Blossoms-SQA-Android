import axios from "axios";
import { getAccessToken } from "../utility/secureStorage";

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

export default axiosClient;
