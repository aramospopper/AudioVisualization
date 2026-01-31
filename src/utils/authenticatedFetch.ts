// Utility for making authenticated API requests with automatic token attachment

const TOKEN_KEY = 'auth.token';

interface RequestOptions extends RequestInit {
  headers?: HeadersInit;
}

/**
 * Wrapper around fetch that automatically adds Authorization header
 * Usage: authenticatedFetch('/api/data', { method: 'GET' })
 */
export async function authenticatedFetch(
  url: string,
  options: RequestOptions = {}
): Promise<Response> {
  const token = localStorage.getItem(TOKEN_KEY);

  if (!token) {
    throw new Error('No authentication token found');
  }

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Content-Type', 'application/json');

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Helper for JSON responses
 */
export async function authenticatedFetchJson<T>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const response = await authenticatedFetch(url, options);

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  return response.json();
}
