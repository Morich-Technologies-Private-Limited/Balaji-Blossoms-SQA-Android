import { CREATE_QUOTATION_URL } from "../constants/apiConstants";
import axiosClient from "./axiosClient";

export const createQuotation = async (customerId, userId) => {
  try {
    const response = await axiosClient.post(CREATE_QUOTATION_URL, null, {
      params: {
        customerId,
        userId,
      },
    });

    return response.data;
  } catch (error) {
    return toErrorResponse(error);
  }
};
