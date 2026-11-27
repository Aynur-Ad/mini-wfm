import { useTranslation } from "../i18n/language";
import React from "react";
import { Button, Result } from "antd";
import { useNavigate } from "react-router-dom";

export const NotFoundPage: React.FC = () => {
  const t = useTranslation();
  const navigate = useNavigate();

  return (
    <Result
      status="404"
      title="404"
      subTitle={t("Aradığınız sayfa bulunamadı.")}
      extra={
        <Button type="primary" onClick={() => navigate("/teams")}>
          {t("Ekiplere Dön")}
        </Button>
      }
    />
  );
};
