const tokenKey = "mini-wfm.access-token";
const sessionChange = "mini-wfm:session-change";

export function getAccessToken(): string | null {
  return window.localStorage.getItem(tokenKey);
}

export function setAccessToken(token: string | null) {
  if (token) window.localStorage.setItem(tokenKey, token);
  else window.localStorage.removeItem(tokenKey);
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
