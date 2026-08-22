const API_BASE = `${(import.meta.env.VITE_API_URL ?? 'http://localhost:3001').replace(/\/+$/, '')}/api`;

export async function fetchAPI(endpoint: string, options?: RequestInit) {
  const headers: HeadersInit = { 
    'Content-Type': 'application/json',
    ...options?.headers 
  };

  let body = options?.body;
  if (!body && options?.method && ['POST', 'PUT', 'PATCH'].includes(options.method.toUpperCase())) {
    body = '{}';
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    body,
  });
  
  if (!res.ok) throw new Error(`API Error: ${res.statusText || res.status}`);
  return res.json();
}
