const API_BASE_URL = process.env.EXPO_PUBLIC_BASE_URL;

export const LOGIN_URL = `${API_BASE_URL}/auth/login`;

export const CREATE_QUOTATION_URL = `${API_BASE_URL}/quotation/create`;
export const QUOTATION_BY_USER_URL = `${API_BASE_URL}/quotation/getByUser`;
export const QUOTATION_BY_UNIT_URL = `${API_BASE_URL}/quotation/getByUnit`;
export const UPDATE_QUOTATION_PLANTS_URL = `${API_BASE_URL}/quotation/updatePlants`;
export const QUOTATION_PDF_URL = `${API_BASE_URL}/quotation/pdf`;

export const CONVERT_TO_INVOICE_URL = `${API_BASE_URL}/quotation/convertToInvoice`;
export const MOVE_TO_DELIVERY_SHADE_URL = `${API_BASE_URL}/quotation/update/status`;

export const SEARCH_PLANTS_URL = `${API_BASE_URL}/plants/searchPlants`;

export const PACKING_LIST_URL = `${API_BASE_URL}/info/packingList`;

export const CREATE_CUSTOMER_URL = `${API_BASE_URL}/customer/create`;
