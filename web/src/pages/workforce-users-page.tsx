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
  Typography,
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
          aria-label={`${person.firstName} ${person.lastName} aktiflik durumu`}
          checked={person.isActive}
          loading={mutation.isPending}
          onChange={(checked) => {
            void toggle(checked);
          }}
        />
        <Tag color={person.isActive ? "green" : "default"}>
          {person.isActive ? "Aktif" : "Pasif"}
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
          Düzenle
        </Button>
        <Popconfirm
          title="Personeli silmek istediğinize emin misiniz?"
          description={`${person.firstName} ${person.lastName} (${person.registrationNumber})`}
          okText="Sil"
          cancelText="Vazgeç"
          okButtonProps={{ danger: true, loading: mutation.isPending }}
          onConfirm={remove}
        >
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            loading={mutation.isPending}
          >
            Sil
          </Button>
        </Popconfirm>
      </Space>
    </>
  );
}

export function WorkforceUsersPage() {
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
    void messageApi.success("Personel başarıyla silindi");
    // Son sayfanın son kaydı silinirse kullanıcı boş bir sayfada kalmasın.
    const remainingTotal = Math.max(0, (data?.total ?? 0) - 1);
    setParams((current) => {
      const lastPage = Math.max(1, Math.ceil(remainingTotal / current.limit));
      return current.page > lastPage ? { ...current, page: lastPage } : current;
    });
  };

  const columns: TableColumnsType<WorkforceUser> = [
    {
      title: "Sicil No",
      dataIndex: "registrationNumber",
      key: "registrationNumber",
      render: (value: string, person: WorkforceUser) => (
        <Link to={`/workforce-users/${person.id}`}>{value}</Link>
      ),
    },
    {
      title: "Ad Soyad",
      key: "fullName",
      render: (_value: unknown, person: WorkforceUser) =>
        `${person.firstName} ${person.lastName}`,
    },
    {
      title: "Telefon",
      dataIndex: "phone",
      key: "phone",
      render: (phone: string | null) => formatPhone(phone),
    },
    {
      title: "Ekip",
      key: "team",
      render: (_value: unknown, person: WorkforceUser) =>
        person.team ? (
          <Link to={`/teams/${person.team.id}`}>{person.team.name}</Link>
        ) : (
          "—"
        ),
    },
    {
      title: "Durum",
      key: "status",
      render: (_value: unknown, person: WorkforceUser) => (
        <PersonStatus
          person={person}
          onChanged={(checked) => {
            void messageApi.success(
              checked
                ? "Personel aktif hale getirildi"
                : "Personel pasif hale getirildi",
            );
          }}
        />
      ),
    },
    {
      title: "İşlemler",
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
    <div>
      {contextHolder}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <Typography.Title level={3} style={{ margin: 0 }}>
          Personeller
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Yeni Personel
        </Button>
      </div>
      <Space wrap style={{ marginBottom: 16 }}>
        <Input
          aria-label="Personel ara"
          placeholder="Ad, soyad veya sicil numarası ara..."
          prefix={<SearchOutlined />}
          allowClear
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          style={{ width: 320, maxWidth: "100%" }}
        />
        <Select
          aria-label="Personel durumu"
          value={status}
          style={{ width: 160 }}
          options={[
            { value: "all", label: "Tümü" },
            { value: "active", label: "Aktif" },
            { value: "passive", label: "Pasif" },
          ]}
          onChange={(value: "all" | "active" | "passive") =>
            setParams((current) => ({
              ...current,
              page: 1,
              isActive: value === "all" ? undefined : value === "active",
            }))
          }
        />
      </Space>
      {isError ? (
        <Alert
          type="error"
          showIcon
          title="Personel listesi yüklenemedi"
          description="Sunucu bağlantısını kontrol edip yeniden deneyin."
          action={
            <Button
              onClick={() => {
                void refetch();
              }}
            >
              Yeniden dene
            </Button>
          }
        />
      ) : (
        <Table<WorkforceUser>
          rowKey="id"
          columns={columns}
          dataSource={data?.data ?? []}
          loading={isFetching}
          locale={{ emptyText: "Kayıt bulunamadı" }}
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
      <WorkforceUserFormModal
        open={modalOpen}
        person={editingPerson}
        onClose={closeModal}
        onSaved={() => setParams((current) => ({ ...current, page: 1 }))}
      />
    </div>
  );
}