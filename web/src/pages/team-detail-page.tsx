// web/src/pages/team-detail-page.tsx
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Breadcrumb,
  Button,
  Descriptions,
  Result,
  Spin,
  Tag,
  Typography,
} from "antd";
import { ArrowLeftOutlined, EditOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { TeamFormModal } from "../components/team-form-modal";
import { useTeam } from "../hooks/use-teams";

const { Title } = Typography;

export function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

  const teamId = Number(id);
  const isValidId = Number.isInteger(teamId) && teamId > 0;

  const { data: team, isLoading, isError } = useTeam(isValidId ? teamId : 0);

  // 1. Veri yüklenirken dönen gösterge
  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 64 }}>
        <Spin size="large" />
      </div>
    );
  }

  // 2. Geçersiz ID veya 404 durumunda "Ekip bulunamadı" ekranı ve "Listeye dön" butonu
  if (!isValidId || isError || !team) {
    return (
      <Result
        status="404"
        title="Ekip bulunamadı"
        subTitle="Aradığınız ekip mevcut değil veya silinmiş olabilir."
        extra={
          <Button
            type="primary"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/teams")}
          >
            Listeye dön
          </Button>
        }
      />
    );
  }

  return (
    <div>
      {/* Üst Gezinme Yolu: Ekipler / {ekip adı} */}
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          {
            title: <Link to="/teams">Ekipler</Link>,
          },
          {
            title: team.name,
          },
        ]}
      />

      {/* Başlık ve Düzenle Butonu */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          {team.name}
        </Title>
        <Button
          type="primary"
          icon={<EditOutlined />}
          onClick={() => setIsEditModalOpen(true)}
        >
          Düzenle
        </Button>
      </div>

      {/* Ekip Detay Bilgileri */}
      <Descriptions
        bordered
        column={1}
        items={[
          {
            key: "name",
            label: "Ad",
            children: team.name,
          },
          {
            key: "description",
            label: "Açıklama",
            children:
              team.description && team.description.trim() !== ""
                ? team.description
                : "-",
          },
          {
            key: "isActive",
            label: "Durum",
            children: team.isActive ? (
              <Tag color="green">Aktif</Tag>
            ) : (
              <Tag color="default">Pasif</Tag>
            ),
          },
          {
            key: "createdAt",
            label: "Oluşturulma",
            children: dayjs(team.createdAt).format("DD.MM.YYYY HH:mm"),
          },
          {
            key: "updatedAt",
            label: "Son Güncelleme",
            children: dayjs(team.updatedAt).format("DD.MM.YYYY HH:mm"),
          },
        ]}
      />

      {/* MWFM-14'te yaptığımız düzenleme modal'ı */}
      <TeamFormModal
        open={isEditModalOpen}
        team={team}
        onClose={() => setIsEditModalOpen(false)}
      />
    </div>
  );
}
