import { afterEach, describe, expect, it, vi } from "vitest";
import { getAccessToken, setAccessToken, subscribeToSession } from "./session";

afterEach(() => setAccessToken(null));

describe("Tarayıcı oturumu", () => {
  it("geçici oturuma geçerken kalıcı tokenı kaldırır ve çıkışta iki depoyu temizler", () => {
    setAccessToken("old-persistent");
    setAccessToken("temporary", false);
    expect(getAccessToken()).toBe("temporary");
    expect(localStorage.getItem("mini-wfm.access-token")).toBeNull();
    expect(sessionStorage.getItem("mini-wfm.access-token")).toBe("temporary");
    setAccessToken(null);
    expect(getAccessToken()).toBeNull();
    expect(sessionStorage.getItem("mini-wfm.access-token")).toBeNull();
  });
  it("beni hatırla seçildiğinde geçici tokenı kalıcı depoya taşır", () => {
    setAccessToken("temporary", false);
    setAccessToken("persistent", true);
    expect(sessionStorage.getItem("mini-wfm.access-token")).toBeNull();
    expect(localStorage.getItem("mini-wfm.access-token")).toBe("persistent");
    expect(getAccessToken()).toBe("persistent");
  });

  it("token saklanınca ve silinince aynı sekmedeki dinleyiciyi günceller", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToSession(listener);
    setAccessToken("test-token");
    expect(getAccessToken()).toBe("test-token");
    setAccessToken(null);
    expect(getAccessToken()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it("diğer sekmelerdeki storage olayını dinler ve aboneliği kaldırır", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToSession(listener);
    window.dispatchEvent(new StorageEvent("storage"));
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    window.dispatchEvent(new StorageEvent("storage"));
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
