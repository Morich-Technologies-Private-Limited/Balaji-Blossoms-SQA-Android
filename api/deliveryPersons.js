import { DELIVERY_PERSONS_URL } from "../constants/apiConstants";
import axiosClient from "./axiosClient";
import { handleApiError } from "./errorHandler";

/**
 * GET /info/deliverPerson/findAll
 * Returns { status, payload: [{ id, deliveryPersonName, contactNumber }], message }.
 *
 * Feeds the "Loaded by" picker on the invoice action — convertToInvoice wants
 * the person's name, so the list is what the delivery manager picks from
 * instead of typing it free-hand.
 */
export const findAllDeliveryPersons = async () => {
  try {
    const response = await axiosClient.get(DELIVERY_PERSONS_URL);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};
