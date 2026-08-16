import { FIND_COMPANY_URL } from "../constants/apiConstants";
import axiosClient from "./axiosClient";
import { handleApiError } from "./errorHandler";

export const getCompanies = async () => {
  try {
    const response = await axiosClient.get(FIND_COMPANY_URL);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};
