import axios from 'axios';

/** The server's error shape, carried through so UI can branch on `code` (RULES.md section 5). */
export class ApiError extends Error {
  constructor({ code, message, details, status }) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

/**
 * The axios instance every feature uses.
 *
 * withCredentials is what sends the httpOnly sp_token cookie (D-01). There is no
 * Authorization header anywhere in this client.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api/v1',
  withCredentials: true,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

/** Paths where a 401 is an expected answer, not a sign the session died. */
const AUTH_PATHS = ['/auth/me', '/auth/login', '/auth/logout', '/auth/register'];

/** Set by AuthProvider, so a 401 can clear the session without this module importing React. */
let onUnauthenticated = null;

export function setUnauthenticatedHandler(handler) {
  onUnauthenticated = handler;
}

/**
 * Unwraps { success, data, meta } and turns an error response into an ApiError.
 *
 * Why: every screen would otherwise repeat `res.data.data`, and error handling would depend
 *      on matching message text instead of a stable code.
 * Flow: on success, return data, attaching meta when the endpoint paginated.
 *       On failure, map the server envelope to an ApiError and, for a real 401, clear the
 *       session exactly once rather than redirecting in a loop.
 */
api.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (body && typeof body === 'object' && 'success' in body) {
      const data = body.data;
      // meta rides along on the array so a list hook can read both from one value.
      if (body.meta && Array.isArray(data)) {
        Object.defineProperty(data, 'meta', { value: body.meta, enumerable: false });
      }
      return data;
    }
    // A PDF or CSV download: hand back the raw body.
    return body;
  },
  (error) => {
    const status = error.response?.status;
    const envelope = error.response?.data?.error;
    const path = error.config?.url ?? '';

    if (status === 401 && !AUTH_PATHS.some((p) => path.startsWith(p))) {
      // The session expired mid-use. Clear it once; the route guard handles the redirect,
      // so we never fight React Router over the location.
      onUnauthenticated?.();
    }

    if (envelope) {
      return Promise.reject(
        new ApiError({
          code: envelope.code,
          message: envelope.message,
          details: envelope.details,
          status,
        }),
      );
    }

    if (error.code === 'ECONNABORTED') {
      return Promise.reject(
        new ApiError({ code: 'TIMEOUT', message: 'The request took too long. Try again.', status }),
      );
    }

    if (!error.response) {
      return Promise.reject(
        new ApiError({
          code: 'NETWORK_ERROR',
          message: 'Cannot reach the server. Check that it is running on port 5000.',
          status: 0,
        }),
      );
    }

    return Promise.reject(
      new ApiError({
        code: 'UNEXPECTED_ERROR',
        message: 'Something failed on our side. Try again.',
        status,
      }),
    );
  },
);

/** A multipart POST, for the photo and document endpoints. */
export function postForm(url, formData) {
  return api.post(url, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
}

/** A PDF or CSV download, returned as a Blob. */
export function getFile(url, params) {
  return api.get(url, { params, responseType: 'blob' });
}

/** Triggers a browser download for a Blob the API returned. */
export function downloadBlob(blob, filename) {
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}
