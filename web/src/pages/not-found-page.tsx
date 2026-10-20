import React from "react";
import { Button, Result } from "antd";
import { useNavigate } from "react-router-dom";

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Result
      status="404"
      title="404"
      subTitle="Aradığınız sayfa bulunamadı."
      extra={
        <Button type="primary" onClick={() => navigate("/teams")}>
          Ekiplere Dön
        </Button>
      }
    />
  );
};
