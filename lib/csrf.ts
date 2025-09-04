/**
 * CSRF protection utilities for client-side components
 */

/**
 * Gets the CSRF token from cookies
 * @returns The CSRF token or null if not found
 */
export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') {
    return null; // Not in browser environment
  }
  
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrf_token') {
      return value;
    }
  }
  return null;
}

/**
 * Adds CSRF token to fetch options
 * @param options - The fetch options
 * @returns The fetch options with CSRF token header
 */
export function addCsrfToken(options: RequestInit = {}): RequestInit {
  const csrfToken = getCsrfToken();
  if (!csrfToken) {
    console.warn('CSRF token not found in cookies');
    return options;
  }

  const headers = new Headers(options.headers || {});
  headers.set('X-CSRF-Token', csrfToken);

  return {
    ...options,
    headers,
  };
}

/**
 * Fetch wrapper that automatically adds CSRF token
 * @param url - The URL to fetch
 * @param options - The fetch options
 * @returns The fetch response
 */
export async function fetchWithCsrf(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const optionsWithCsrf = addCsrfToken(options);
  return fetch(url, optionsWithCsrf);
}