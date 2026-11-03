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
  Typography,
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
      <Button icon={<ArrowLeftOutlined />}>Listeye dön</Button>
    </Link>
  );

  if (notFound) {
    return (
      <Result
        status="404"
        title="Personel bulunamadı"
        subTitle="Aradığınız personel mevcut değil veya silinmiş olabilir."
        extra={back}
      />
    );
  }
  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 64 }}>
        <Spin size="large" aria-label="Personel yükleniyor" />
      </div>
    );
  }
  if (isError) {
    return (
      <Result
        status="error"
        title="Personel bilgileri yüklenemedi"
        subTitle="Sunucu bağlantısını kontrol edip yeniden deneyin."
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
              Yeniden dene
            </Button>
          </Space>
        }
      />
    );
  }
  if (!person) return null;

  const fullName = `${person.firstName} ${person.lastName}`;
  return (
    <div>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <Link to="/workforce-users">Personeller</Link> },
          { title: fullName },
        ]}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <Typography.Title level={3} style={{ margin: 0 }}>
          {fullName}
        </Typography.Title>
        <Space>
          {back}
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => setModalOpen(true)}
          >
            Düzenle
          </Button>
        </Space>
      </div>
      <Descriptions
        bordered
        column={1}
        items={[
          {
            key: "registrationNumber",
            label: "Sicil No",
            children: person.registrationNumber,
          },
          { key: "firstName", label: "Ad", children: person.firstName },
          { key: "lastName", label: "Soyad", children: person.lastName },
          {
            key: "phone",
            label: "Telefon",
            children: formatPhone(person.phone),
          },
          {
            key: "isActive",
            label: "Durum",
            children: (
              <Tag color={person.isActive ? "green" : "default"}>
                {person.isActive ? "Aktif" : "Pasif"}
              </Tag>
            ),
          },
          {
            key: "createdAt",
            label: "Oluşturulma",
            children: dayjs(person.createdAt).format("DD.MM.YYYY HH:mm"),
          },
          {
            key: "updatedAt",
            label: "Son Güncelleme",
            children: dayjs(person.updatedAt).format("DD.MM.YYYY HH:mm"),
          },
        ]}
      />
      <WorkforceUserFormModal
        open={modalOpen}
        person={person}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}