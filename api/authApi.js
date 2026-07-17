import axios from "axios";
import API from "../constants/apiConstants";

export const login = async (userId, password) => {
  try {
    const response = await axios.get(API.LOGIN, {
      params: {
        userId,
        password,
      },
    });

    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: "Something went wrong",
      }
    );
  }
};
