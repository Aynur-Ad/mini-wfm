import { useTranslation } from "../i18n/language";
import { useSession } from "../auth/use-session";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Alert,
  Button,
  Input,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  message,
} from "antd";
import type { TableColumnsType } from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { WorkforceUserFormModal } from "../components/workforce-user-form-modal";
import {
  useDeleteWorkforceUser,
  useUpdateWorkforceUser,
  useWorkforceUsers,
} from "../hooks/use-workforce-users";
import type { QueryWorkforceUsersParams, WorkforceUser } from "../types";
import { formatPhone } from "../utils/format-phone";

interface ListParams extends QueryWorkforceUsersParams {
  page: number;
  limit: number;
}

// Her satır kendi mutation durumunu tutar; başka satırın isteği bunu etkilemez.
function PersonStatus({
  person,
  onChanged,
}: {
  person: WorkforceUser;
  onChanged: (checked: boolean) => void;
}) {
  const t = useTranslation();
  const mutation = useUpdateWorkforceUser();
  const toggle = async (checked: boolean) => {
    try {
      await mutation.mutateAsync({
        id: person.id,
        payload: { isActive: checked },
      });
      onChanged(checked);
    } catch {
      // Ortak HTTP istemcisi hata bildirimini gösterir.
    }
  };
  return (
    <>
      <Space size="small">
        <Switch
          size="small"
          aria-label={t("{name} aktiflik durumu", {
            name: `${person.firstName} ${person.lastName}`,
          })}
          checked={person.isActive}
          loading={mutation.isPending}
          onChange={(checked) => {
            void toggle(checked);
          }}
        />
        <Tag color={person.isActive ? "green" : "default"}>
          {person.isActive ? t("Aktif") : t("Pasif")}
        </Tag>
      </Space>
    </>
  );
}

function PersonActions({
  person,
  onEdit,
  onDeleted,
}: {
  person: WorkforceUser;
  onEdit: (person: WorkforceUser) => void;
  onDeleted: () => void;
}) {
  const t = useTranslation();
  const mutation = useDeleteWorkforceUser();
  const remove = async () => {
    try {
      await mutation.mutateAsync(person.id);
      onDeleted();
    } catch {
      // Hata durumunda satır silinmez; ortak istemci mesajı gösterir.
    }
  };
  return (
    <>
      <Space size="small">
        <Button
          type="text"
          icon={<EditOutlined />}
          disabled={mutation.isPending}
          onClick={() => onEdit(person)}
        >
          {t("Düzenle")}
        </Button>
        <Popconfirm
          title={t("Personeli silmek istediğinize emin misiniz?")}
          description={`${person.firstName} ${person.lastName} (${person.registrationNumber})`}
          okText={t("Sil")}
          cancelText={t("Vazgeç")}
          okButtonProps={{ danger: true, loading: mutation.isPending }}
          onConfirm={remove}
        >
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            loading={mutation.isPending}
          >
            {t("Sil")}
          </Button>
        </Popconfirm>
      </Space>
    </>
  );
}

export function WorkforceUsersPage() {
  const t = useTranslation();
  const { canManagePeople } = useSession();
  const [messageApi, contextHolder] = message.useMessage();
  const [params, setParams] = useState<ListParams>({ page: 1, limit: 10 });
  const [searchInput, setSearchInput] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<WorkforceUser | null>(
    null,
  );
  const { data, isFetching, isError, refetch } = useWorkforceUsers(params);

  useEffect(() => {
    const timer = setTimeout(() => {
      setParams((current) => ({
        ...current,
        page: 1,
        search: searchInput.trim() || undefined,
      }));
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const openCreate = () => {
    setEditingPerson(null);
    setModalOpen(true);
  };
  const openEdit = (person: WorkforceUser) => {
    setEditingPerson(person);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setEditingPerson(null);
  };
  const afterDelete = () => {
    void messageApi.success(t("Personel başarıyla silindi"));
    // Son sayfanın son kaydı silinirse kullanıcı boş bir sayfada kalmasın.
    const remainingTotal = Math.max(0, (data?.total ?? 0) - 1);
    setParams((current) => {
      const lastPage = Math.max(1, Math.ceil(remainingTotal / current.limit));
      return current.page > lastPage ? { ...current, page: lastPage } : current;
    });
  };

  const columns: TableColumnsType<WorkforceUser> = [
    {
      title: t("Sicil No"),
      dataIndex: "registrationNumber",
      key: "registrationNumber",
      render: (value: string, person: WorkforceUser) => (
        <Link to={`/workforce-users/${person.id}`}>{value}</Link>
      ),
    },
    {
      title: t("Ad Soyad"),
      key: "fullName",
      render: (_value: unknown, person: WorkforceUser) =>
        `${person.firstName} ${person.lastName}`,
    },
    {
      title: t("Telefon"),
      dataIndex: "phone",
      key: "phone",
      render: (phone: string | null) => formatPhone(phone),
    },
    {
      title: t("Ekip"),
      key: "team",
      render: (_value: unknown, person: WorkforceUser) =>
        person.team ? (
          <Link to={`/teams/${person.team.id}`}>{person.team.name}</Link>
        ) : (
          "—"
        ),
    },
    {
      title: t("Durum"),
      key: "status",
      render: (_value: unknown, person: WorkforceUser) =>
        canManagePeople ? (
          <PersonStatus
            person={person}
            onChanged={(checked) => {
              void messageApi.success(
                checked
                  ? t("Personel aktif hale getirildi")
                  : t("Personel pasif hale getirildi"),
              );
            }}
          />
        ) : (
          <Tag color={person.isActive ? "green" : "default"}>
            {person.isActive ? t("Aktif") : t("Pasif")}
          </Tag>
        ),
    },
    {
      title: t("İşlemler"),
      key: "actions",
      render: (_value: unknown, person: WorkforceUser) => (
        <PersonActions
          person={person}
          onEdit={openEdit}
          onDeleted={afterDelete}
        />
      ),
    },
  ];

  const status =
    params.isActive === undefined
      ? "all"
      : params.isActive
        ? "active"
        : "passive";
  return (
    <section
      className="workspace-list-page"
      aria-labelledby="people-list-title"
    >
      {contextHolder}
      <header className="workspace-page-heading">
        <h1 id="people-list-title">{t("Personeller")}</h1>
        {canManagePeople && (
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined aria-hidden />}
            onClick={openCreate}
          >
            {t("Yeni Personel")}
          </Button>
        )}
      </header>
      <div
        className="workspace-filters directory-filters"
        role="group"
        aria-label={t("Personel filtreleri")}
      >
        <div className="filter-field">
          <label htmlFor="people-list-search">{t("Ara")}</label>
          <Input
            id="people-list-search"
            aria-label={t("Personel ara")}
            placeholder={t("Ad, soyad veya sicil numarası ara...")}
            prefix={<SearchOutlined />}
            allowClear
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>
        <div className="filter-field">
          <label htmlFor="people-list-status">{t("Durum")}</label>
          <Select
            id="people-list-status"
            aria-label={t("Personel durumu")}
            value={status}
            options={[
              { value: "all", label: t("Tümü") },
              { value: "active", label: t("Aktif") },
              { value: "passive", label: t("Pasif") },
            ]}
            onChange={(value: "all" | "active" | "passive") =>
              setParams((current) => ({
                ...current,
                page: 1,
                isActive: value === "all" ? undefined : value === "active",
              }))
            }
          />
        </div>
      </div>
      {isError ? (
        <Alert
          type="error"
          showIcon
          title={t("Personel listesi yüklenemedi")}
          description={t("Sunucu bağlantısını kontrol edip yeniden deneyin.")}
          action={
            <Button
              onClick={() => {
                void refetch();
              }}
            >
              {t("Yeniden dene")}
            </Button>
          }
        />
      ) : (
        <Table<WorkforceUser>
          rowKey="id"
          columns={
            canManagePeople
              ? columns
              : columns.filter(({ key }) => key !== "actions")
          }
          dataSource={data?.data ?? []}
          loading={isFetching}
          locale={{ emptyText: t("Kayıt bulunamadı") }}
          scroll={{ x: 1000 }}
          pagination={{
            current: params.page,
            pageSize: params.limit,
            total: data?.total ?? 0,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50],
            onChange: (page, limit) =>
              setParams((current) => ({
                ...current,
                page: limit === current.limit ? page : 1,
                limit,
              })),
          }}
        />
      )}
      {canManagePeople && (
        <WorkforceUserFormModal
          open={modalOpen}
          person={editingPerson}
          onClose={closeModal}
          onSaved={() => setParams((current) => ({ ...current, page: 1 }))}
        />
      )}
    </section>
  );
}
