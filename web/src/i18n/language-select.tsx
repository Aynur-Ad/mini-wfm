import { Select } from "antd";
import { setLanguage, useLanguage } from "./language";
import { translator } from "./messages";
import type { Language } from "./messages";

export function LanguageSelect() {
  const language = useLanguage();
  const t = translator(language);
  return (
    <Select<Language>
      aria-label={t("Arayüz dili")}
      value={language}
      onChange={setLanguage}
      options={[
        { value: "tr", label: "Türkçe" },
        { value: "en", label: "English" },
      ]}
    />
  );
}
