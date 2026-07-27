const API_BASE_URL = process.env.EXPO_PUBLIC_BASE_URL;

export const LOGIN_URL = `${API_BASE_URL}/auth/login`;
export const CREATE_QUOTATION_URL = `${API_BASE_URL}/quotation/create`;
export const QUOTATION_BY_USER_URL = `${API_BASE_URL}/quotation/getByUser`;
export const QUOTATION_BY_UNIT_URL = `${API_BASE_URL}/quotation/getByUnit`;
export const QUOTATION_FIND_URL = `${API_BASE_URL}/quotation/find`;
export const UPDATE_QUOTATION_PLANTS_URL = `${API_BASE_URL}/quotation/updatePlants`;
export const QUOTATION_PDF_URL = `${API_BASE_URL}/quotation/pdf`;
export const COLLECTION_SHEET_PDF_URL = `${API_BASE_URL}/quotation/download/collection-sheet`;
export const QUOTATION_ACCESS_URL = `${API_BASE_URL}/quotation/check/access`;

export const CONVERT_TO_INVOICE_URL = `${API_BASE_URL}/quotation/convertToInvoice`;
export const MOVE_TO_DELIVERY_SHADE_URL = `${API_BASE_URL}/quotation/update/status/moveToDeliveryShade`;
export const GET_OFFER_URL = `${API_BASE_URL}/quotation/getOffer`;
export const SEARCH_PLANTS_URL = `${API_BASE_URL}/plants/searchPlants`;
export const SPECIAL_PLANT_BY_BARCODE_URL = `${API_BASE_URL}/plants/getSpecialPlantByBarcodeId`;
export const PACKING_LIST_URL = `${API_BASE_URL}/info/packingList`;
export const CREATE_CUSTOMER_URL = `${API_BASE_URL}/customer/create`;
export const CUSTOMER_SEARCH_URL = `${API_BASE_URL}/customer/search`;

export const INVOICE_FIND_BY_UNIT_URL = `${API_BASE_URL}/invoice/findByUnitId`;
export const INVOICE_FIND_URL = `${API_BASE_URL}/invoice/find`;
export const INVOICE_PDF_URL = `${API_BASE_URL}/invoice/pdf`;
export const INVOICE_SEARCH_URL = `${API_BASE_URL}/invoice/search`;
