// Centralized API client helpers: base URL, auth headers, and backoff
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  } as Record<string, string>;
};

// Wrapper con backoff per gestire 429 Too Many Requests
export const requestWithBackoff = async (
  input: RequestInfo,
  init?: RequestInit,
  retries = 2,
  baseDelayMs = 500
) => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(input, init);
    if (response.status !== 429) {
      return response;
    }
    const waitMs = baseDelayMs * (attempt + 1);
    await new Promise((res) => setTimeout(res, waitMs));
  }
  // ultimo tentativo senza ulteriori attese
  return fetch(input, init);
};

