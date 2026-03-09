/**
 * CSRF Protection Utility
 * Fetches and manages CSRF tokens for secure API requests.
 */

let csrfToken: string | null = null;

export const fetchCsrfToken = async () => {
  try {
    const response = await fetch("/api/csrf-token");
    if (response.ok) {
      const data = await response.json();
      csrfToken = data.csrfToken;
      return csrfToken;
    }
  } catch (error) {
    console.error("Failed to fetch CSRF token:", error);
  }
  return null;
};

export const getCsrfToken = () => csrfToken;

/**
 * Enhanced fetch wrapper that automatically includes the CSRF token.
 */
export const secureFetch = async (url: string, options: RequestInit = {}) => {
  if (!csrfToken) {
    await fetchCsrfToken();
  }

  const headers = new Headers(options.headers || {});
  if (csrfToken && !["GET", "HEAD", "OPTIONS"].includes(options.method || "GET")) {
    headers.set("X-CSRF-Token", csrfToken);
  }

  return fetch(url, {
    ...options,
    headers,
  });
};
