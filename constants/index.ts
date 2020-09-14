//  Validation
export const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

// Request Method Types
export const authRequestType = "POST";
export const confirmRequestType = "GET";
export const signoutRequestType = "POST";
export const statusRequestType = "POST";
export const verifyRequestType = "POST";

// Request Headers
export const authRequestHeaderContentType = "application/json";
export const verifyRequestHeaderContentType = "application/json";
export const signoutRequestHeaderContentType = "application/json";

// Response Headers
export const authResponseHeaderContentType = "application/json";
export const confirmResponseHeaderContentType = "application/json";
export const indexResponseHeaderContentType = "application/json";
export const verifyResponseHeaderContentType = "application/json";
export const signoutResponseHeaderContentType = "application/json";
export const statusResponseHeaderContentType = "application/json";

// Modes
export const validSigninMode = "signin";
export const validSignupMode = "signup";

// Status Codes
export const forbiddenRequest = 403;
export const badRequest = 400;
export const serverError = 502;
export const clientError = 400;
export const okRequest = 200;

// Miscellaneous
export const forProject = "demoauth";

// Time Constants
export const timezone = "Asia/Kolkata";
export const sessionExpiryHours = 24;
export const sessionExpiryInWords = "24 hours";
export const verificationRequestExpiryMinutes = 5;
