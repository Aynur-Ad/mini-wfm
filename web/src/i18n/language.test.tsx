import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { getLanguage, setLanguage, useTranslation } from "./language";
import { translator } from "./messages";
import { LanguageSelect } from "./language-select";

function TranslatedTitle() {
  const t = useTranslation();
  return <h1>{t("İş Emirleri")}</h1>;
}

afterEach(() => {
  setLanguage("tr");
  localStorage.removeItem("mini-wfm-language");
});

it("dil seçicisi tercihi kaydeder ve açık ekranı yeniden çevirir", async () => {
  render(
    <>
      <LanguageSelect />
      <TranslatedTitle />
    </>,
  );
  expect(screen.getByRole("heading", { name: "İş Emirleri" })).toBeTruthy();

  fireEvent.mouseDown(screen.getByRole("combobox", { name: "Arayüz dili" }));
  fireEvent.click(await screen.findByText("English", { exact: true }));
  expect(screen.getByRole("heading", { name: "Work Orders" })).toBeTruthy();
  expect(document.documentElement.lang).toBe("en");
  expect(localStorage.getItem("mini-wfm-language")).toBe("en");

  act(() => setLanguage("tr"));
  expect(getLanguage()).toBe("tr");
  expect(screen.getByRole("heading", { name: "İş Emirleri" })).toBeTruthy();
});

it("geçersiz dil tercihlerinde Türkçeyi kullanır ve veri değerlerini korur", () => {
  localStorage.setItem("mini-wfm-language", "de");
  expect(getLanguage()).toBe("tr");
  expect(translator("en")("{team} ekibine atanmış", { team: "Saha A" })).toBe(
    "Assigned to Saha A",
  );
});
