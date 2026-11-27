import { useSyncExternalStore } from "react";

const key = "mini-wfm-theme";
function readTheme() {
  return localStorage.getItem(key) === "dark";
}
export function applyTheme() {
  document.documentElement.dataset.theme = readTheme() ? "dark" : "light";
}
export function toggleTheme() {
  localStorage.setItem(key, readTheme() ? "light" : "dark");
  applyTheme();
  window.dispatchEvent(new Event(key));
}
function subscribe(listener: () => void) {
  function update() {
    applyTheme();
    listener();
  }
  window.addEventListener(key, update);
  window.addEventListener("storage", update);
  return () => {
    window.removeEventListener(key, update);
    window.removeEventListener("storage", update);
  };
}
export function useDarkMode() {
  return useSyncExternalStore(subscribe, readTheme);
}
