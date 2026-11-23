import { dateTimeFormat, useTranslation } from "../i18n/language";
// web/src/pages/team-detail-page.tsx
import { useSession } from "../auth/use-session";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Breadcrumb,
  Button,
  Descriptions,
  Result,
  Space,
  Spin,
  Tag,
} from "antd";
import {
  ArrowLeftOutlined,
  EditOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { isAxiosError } from "axios";
import dayjs from "dayjs";
import { TeamFormModal } from "../components/team-form-modal";
import { useTeam } from "../hooks/use-teams";
import { TeamMembersPanel } from "../components/team-members-panel";

export function TeamDetailPage() {
  const t = useTranslation();
  const { canManagePeople } = useSession();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

  const teamId = Number(id);
  const isValidId = Boolean(
    id && /^[1-9][0-9]*$/.test(id) && Number.isSafeInteger(teamId),
  );

  const {
    data: team,
    isLoading,
    isError,
    error,
    refetch,
  } = useTeam(isValidId ? teamId : 0);

  // 1. Veri yüklenirken dönen gösterge
  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 64 }}>
        <Spin size="large" />
      </div>
    );
  }

  // 2. Geçersiz ID veya 404 durumunda "Ekip bulunamadı" ekranı ve "Listeye dön" butonu
  if (!isValidId || (isAxiosError(error) && error.response?.status === 404)) {
    return (
      <Result
        status="404"
        title={t("Ekip bulunamadı")}
        subTitle={t("Aradığınız ekip mevcut değil veya silinmiş olabilir.")}
        extra={
          <Button
            type="primary"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/teams")}
          >
            {t("Listeye dön")}
          </Button>
        }
      />
    );
  }

  if (isError) {
    return (
      <Result
        status="error"
        title={t("Ekip bilgileri yüklenemedi")}
        subTitle={t("Sunucu bağlantısını kontrol edip yeniden deneyin.")}
        extra={
          <Space>
            <Button onClick={() => navigate("/teams")}>
              {t("Listeye dön")}
            </Button>
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={() => {
                void refetch();
              }}
            >
              {t("Yeniden dene")}
            </Button>
          </Space>
        }
      />
    );
  }
  if (!team) return null;

  return (
    <section aria-labelledby="team-detail-title">
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          {
            title: <Link to="/teams">{t("Ekipler")}</Link>,
          },
          {
            title: team.name,
          },
        ]}
      />

      <header className="workspace-page-heading detail-heading">
        <h1 id="team-detail-title">{team.name}</h1>
        {canManagePeople && (
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => setIsEditModalOpen(true)}
          >
            {t("Düzenle")}
          </Button>
        )}
      </header>

      <Descriptions
        bordered
        column={1}
        items={[
          {
            key: "name",
            label: t("Ad"),
            children: team.name,
          },
          {
            key: "description",
            label: t("Açıklama"),
            children:
              team.description && team.description.trim() !== ""
                ? team.description
                : "-",
          },
          {
            key: "isActive",
            label: t("Durum"),
            children: team.isActive ? (
              <Tag color="green">{t("Aktif")}</Tag>
            ) : (
              <Tag color="default">{t("Pasif")}</Tag>
            ),
          },
          {
            key: "createdAt",
            label: t("Oluşturulma"),
            children: dayjs(team.createdAt).format(dateTimeFormat()),
          },
          {
            key: "updatedAt",
            label: t("Son Güncelleme"),
            children: dayjs(team.updatedAt).format(dateTimeFormat()),
          },
        ]}
      />

      <TeamMembersPanel key={team.id} team={team} canManage={canManagePeople} />

      {/* MWFM-14'te yaptığımız düzenleme modal'ı */}
      {canManagePeople && (
        <TeamFormModal
          open={isEditModalOpen}
          team={team}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}
    </section>
  );
}
