import React from "react";
import { Typography } from "antd";

export const TeamsPage: React.FC = () => {
  return <Typography.Title level={2}>Ekipler</Typography.Title>;
};

/*
import { useQuery } from "@tanstack/react-query";
import { getTeams, getTeamById } from "../api/teams.api";

export function TeamsPage() {
  // 1. Ekip listesini çek
  const { data: teams } = useQuery({
    queryKey: ["teams"],
    queryFn: () => getTeams(),
  });

  // 2. Olmayan bir ekibin detayını iste (404 hatasını görmek için)
  useQuery({
    queryKey: ["team", 99999],
    queryFn: () => getTeamById(99999),
  });

  return (
    <div style={{ padding: 24 }}>
      <h2>Ekip Listesi Geçici Test</h2>
      <pre>{JSON.stringify(teams, null, 2)}</pre>
    </div>
  );
}
  */
