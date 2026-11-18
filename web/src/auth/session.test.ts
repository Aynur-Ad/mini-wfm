import { afterEach, describe, expect, it, vi } from "vitest";
import { getAccessToken, setAccessToken, subscribeToSession } from "./session";

afterEach(() => setAccessToken(null));

describe("Tarayıcı oturumu", () => {
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
