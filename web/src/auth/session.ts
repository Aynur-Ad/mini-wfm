const tokenKey = "mini-wfm.access-token";
const sessionChange = "mini-wfm:session-change";

export function getAccessToken(): string | null {
  return (
    window.sessionStorage.getItem(tokenKey) ??
    window.localStorage.getItem(tokenKey)
  );
}

export function setAccessToken(token: string | null, remember = true) {
  window.localStorage.removeItem(tokenKey);
  window.sessionStorage.removeItem(tokenKey);
  if (token) {
    const storage = remember ? window.localStorage : window.sessionStorage;
    storage.setItem(tokenKey, token);
  }
  window.dispatchEvent(new Event(sessionChange));
}

export function subscribeToSession(listener: () => void) {
  window.addEventListener(sessionChange, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(sessionChange, listener);
    window.removeEventListener("storage", listener);
  };
}
