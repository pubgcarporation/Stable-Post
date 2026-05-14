const KEY = "stable_post_token";

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  localStorage.setItem(KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(KEY);
}
