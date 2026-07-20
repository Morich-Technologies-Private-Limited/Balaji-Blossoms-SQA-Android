import { LOGIN_URL } from "../constants/apiConstants";
import axiosClient from "./axiosClient";
import { handleApiError } from "./errorHandler";

export const login = async (userId, password) => {
  try {
    const response = await axiosClient.get(LOGIN_URL, {
      params: {
        userId,
        password,
      },
      requiresAuth: false,
    });

    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};
