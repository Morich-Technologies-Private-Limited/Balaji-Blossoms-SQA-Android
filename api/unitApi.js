import {
  FIND_ALL_UNITS_URL,
  PLANT_INVENTORY_CONFIG_URL,
} from "../constants/apiConstants";
import axiosClient from "./axiosClient";
import { handleApiError } from "./errorHandler";

/** The two modes the backend can put unit picking in. */
export const INVENTORY_MODES = {
  ANY_UNIT: "ANY_UNIT",
  AVAILABLE_UNIT: "AVAILABLE_UNIT",
};

/**
 * GET /info/find/units
 *
 * Every unit in the company, stock or no stock. Only needed in ANY_UNIT mode,
 * where the operator may put a row on a unit that does not carry the plant —
 * in AVAILABLE_UNIT mode the units come from the plant's own inventoryList.
 *
 * Returns the ApiResponseModal shape: { status, message, payload }
 */
export const fetchAllUnits = async () => {
  try {
    const response = await axiosClient.get(FIND_ALL_UNITS_URL);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * GET /info/plant/inventory/config
 *
 * Which of the two unit-picking modes this deployment runs in. Resolved to a
 * plain "ANY_UNIT" | "AVAILABLE_UNIT" string here, because the endpoint may
 * answer either as a bare string or wrapped in the usual ApiResponseModal.
 * Anything unrecognised (including a failed call) comes back as null so the
 * caller can keep its own default rather than guess.
 */
export const fetchPlantInventoryConfig = async () => {
  try {
    const response = await axiosClient.get(PLANT_INVENTORY_CONFIG_URL);
    const body = response.data;
    const raw = typeof body === "string" ? body : body?.payload;
    const mode = typeof raw === "string" ? raw.trim().toUpperCase() : null;

    return INVENTORY_MODES[mode] ?? null;
  } catch {
    return null;
  }
};
