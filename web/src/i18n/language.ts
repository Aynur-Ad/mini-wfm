import { useSyncExternalStore } from "react";
import dayjs from "dayjs";
import "dayjs/locale/tr";
import { translator } from "./messages";
import type { Language } from "./messages";

const storageKey = "mini-wfm-language";
const changeEvent = "mini-wfm:language-change";

export function getLanguage(): Language {
  return window.localStorage.getItem(storageKey) === "en" ? "en" : "tr";
}

export function applyLanguage(language: Language) {
  document.documentElement.lang = language;
  dayjs.locale(language);
}

export function setLanguage(language: Language) {
  window.localStorage.setItem(storageKey, language);
  applyLanguage(language);
  window.dispatchEvent(new Event(changeEvent));
}

function subscribe(listener: () => void) {
  function onStorage(event: StorageEvent) {
    if (event.key !== storageKey && event.key !== null) return;
    applyLanguage(getLanguage());
    listener();
  }
  window.addEventListener(changeEvent, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(changeEvent, listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useLanguage() {
  return useSyncExternalStore(subscribe, getLanguage);
}

export function useTranslation() {
  return translator(useLanguage());
}

export function dateTimeFormat() {
  return getLanguage() === "en" ? "DD MMM YYYY HH:mm" : "DD.MM.YYYY HH:mm";
}
