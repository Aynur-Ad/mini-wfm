import React from "react";
import { Typography } from "antd";
import { useParams } from "react-router-dom";

export const TeamDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return <Typography.Title level={2}>Ekip Detayı (#{id})</Typography.Title>;
};
