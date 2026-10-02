export const API_BASE_URL = "http://localhost:5000/api";

/* =========================
   AUTH HEADER
========================= */

export const getAuthHeaders = (json = true) => {
    const headers = {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
    };

    if (json) headers["Content-Type"] = "application/json";

    return headers;
};

/* =========================
   REQUEST HELPER
   - body: plain object (sent as JSON) or FormData (sent as multipart)
   - throws Error(message) on non-2xx
========================= */

export const request = async (path, { method = "GET", body, fallback = "Request failed" } = {}) => {
    const isForm = body instanceof FormData;

    const response = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers: getAuthHeaders(!isForm),
        body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    });

    let data = {};
    try {
        data = await response.json();
    } catch {
        // non-JSON response (e.g. server down behind a proxy)
    }

    if (!response.ok) {
        throw new Error(data.message || fallback);
    }

    return data;
};

/* =========================
   QUERY STRING (skips empty values)
========================= */

export const toQuery = (params = {}) => {
    const qs = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "" && value !== false) {
            qs.set(key, String(value));
        }
    });

    const str = qs.toString();
    return str ? `?${str}` : "";
};
