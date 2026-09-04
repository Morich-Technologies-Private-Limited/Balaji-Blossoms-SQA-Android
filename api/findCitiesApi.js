import {
    FIND_ALL_STATES_URL,
    FIND_CITIES_BY_STATE_URL,
} from "../constants/apiConstants";
import axiosClient from "./axiosClient";
import { handleApiError } from "./errorHandler";

/**
 * GET /info/findAllStates
 * payload is a list of state names: string[].
 */
export const getAllStates = async () => {
  try {
    const response = await axiosClient.get(FIND_ALL_STATES_URL);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * GET /info/findCitiesByStates?stateName=…
 * payload is a list of city names: string[].
 */
export const getCitiesByState = async (stateName) => {
  try {
    const response = await axiosClient.get(FIND_CITIES_BY_STATE_URL, {
      params: { stateName },
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};
