const API_BASE = `${import.meta.env.VITE_API_URL ?? 'http://localhost:3001'}/api`;

export async function fetchAPI(endpoint: string, options?: RequestInit) {
  const headers: HeadersInit = { ...options?.headers };
  if (options?.body) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });
  
  if (!res.ok) throw new Error(`API Error: ${res.statusText || res.status}`);
  return res.json();
}
