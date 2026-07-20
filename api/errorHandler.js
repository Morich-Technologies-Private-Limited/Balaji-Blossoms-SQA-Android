export const handleApiError = (error) => {
  const httpStatus = error.response?.status || 500;
  const apiError = error.response?.data;

  return {
    status: apiError?.status || "ERROR",
    payload: null,
    message:
      apiError?.message ||
      (error.response
        ? `Request failed with status ${httpStatus}`
        : "Network error or server not reachable"),
    errorList: apiError?.errorList || [],
  };
};
