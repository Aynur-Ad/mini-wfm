import { dateTimeFormat, useTranslation } from "../i18n/language";
import { useSession } from "../auth/use-session";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
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
import { WorkforceUserFormModal } from "../components/workforce-user-form-modal";
import { useWorkforceUser } from "../hooks/use-workforce-users";
import { formatPhone } from "../utils/format-phone";

export function WorkforceUserDetailPage() {
  const t = useTranslation();
  const { canManagePeople } = useSession();
  const { id } = useParams<{ id: string }>();
  const [modalOpen, setModalOpen] = useState(false);
  const personId = Number(id);
  const isValidId = Boolean(
    id && /^[1-9][0-9]*$/.test(id) && Number.isSafeInteger(personId),
  );
  const {
    data: person,
    isLoading,
    isError,
    error,
    refetch,
  } = useWorkforceUser(isValidId ? personId : 0);
  const notFound =
    !isValidId || (isAxiosError(error) && error.response?.status === 404);
  const back = (
    <Link to="/workforce-users">
      <Button icon={<ArrowLeftOutlined />}>{t("Listeye dön")}</Button>
    </Link>
  );

  if (notFound) {
    return (
      <Result
        status="404"
        title={t("Personel bulunamadı")}
        subTitle={t("Aradığınız personel mevcut değil veya silinmiş olabilir.")}
        extra={back}
      />
    );
  }
  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 64 }}>
        <Spin size="large" aria-label={t("Personel yükleniyor")} />
      </div>
    );
  }
  if (isError) {
    return (
      <Result
        status="error"
        title={t("Personel bilgileri yüklenemedi")}
        subTitle={t("Sunucu bağlantısını kontrol edip yeniden deneyin.")}
        extra={
          <Space>
            {back}
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
  if (!person) return null;

  const fullName = `${person.firstName} ${person.lastName}`;
  return (
    <section aria-labelledby="person-detail-title">
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <Link to="/workforce-users">{t("Personeller")}</Link> },
          { title: fullName },
        ]}
      />
      <header className="workspace-page-heading detail-heading">
        <h1 id="person-detail-title">{fullName}</h1>
        <Space wrap>
          {back}
          {canManagePeople && (
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => setModalOpen(true)}
            >
              {t("Düzenle")}
            </Button>
          )}
        </Space>
      </header>
      <Descriptions
        bordered
        column={1}
        items={[
          {
            key: "registrationNumber",
            label: t("Sicil No"),
            children: person.registrationNumber,
          },
          { key: "firstName", label: t("Ad"), children: person.firstName },
          { key: "lastName", label: t("Soyad"), children: person.lastName },
          {
            key: "phone",
            label: t("Telefon"),
            children: formatPhone(person.phone),
          },
          {
            key: "isActive",
            label: t("Durum"),
            children: (
              <Tag color={person.isActive ? "green" : "default"}>
                {person.isActive ? t("Aktif") : t("Pasif")}
              </Tag>
            ),
          },
          {
            key: "createdAt",
            label: t("Oluşturulma"),
            children: dayjs(person.createdAt).format(dateTimeFormat()),
          },
          {
            key: "updatedAt",
            label: t("Son Güncelleme"),
            children: dayjs(person.updatedAt).format(dateTimeFormat()),
          },
        ]}
      />
      {canManagePeople && (
        <WorkforceUserFormModal
          open={modalOpen}
          person={person}
          onClose={() => setModalOpen(false)}
        />
      )}
    </section>
  );
}
