import { dateTimeFormat, useTranslation } from "../i18n/language";
// web/src/pages/teams-page.tsx
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
import dayjs from "dayjs";
import { TeamFormModal } from "../components/team-form-modal";
import { useDeleteTeam, useTeams, useUpdateTeam } from "../hooks/use-teams";
import type { Team } from "../types";

export function TeamsPage() {
  const t = useTranslation();
  const { canManagePeople } = useSession();
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [searchInput, setSearchInput] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "passive"
  >("all");

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const isActiveParam =
    statusFilter === "all" ? undefined : statusFilter === "active";

  const { data, isFetching, isError, refetch } = useTeams({
    page,
    limit,
    search: debouncedSearch || undefined,
    isActive: isActiveParam,
  });

  const updateTeamMutation = useUpdateTeam();
  const deleteTeamMutation = useDeleteTeam();

  const handleOpenCreateModal = () => {
    setEditingTeam(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (team: Team) => {
    setEditingTeam(team);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTeam(null);
  };

  // Satırdaki Switch ile aktif/pasif durumunu değiştirir
  const handleToggleStatus = async (team: Team, checked: boolean) => {
    try {
      await updateTeamMutation.mutateAsync({
        id: team.id,
        payload: { isActive: checked },
      });
      message.success(
        checked
          ? t("Ekip aktif hale getirildi")
          : t("Ekip pasif hale getirildi"),
      );
    } catch {
      // Hata mesajı http.ts interceptor tarafından gösterilir
    }
  };

  // Popconfirm onaylandığında ekibi siler
  const handleDeleteTeam = async (id: number) => {
    try {
      await deleteTeamMutation.mutateAsync(id);
      message.success(t("Ekip başarıyla silindi"));
    } catch {
      // Hata mesajı http.ts interceptor tarafından gösterilir
    }
  };

  const columns: TableColumnsType<Team> = [
    {
      title: t("Ekip Adı"),
      dataIndex: "name",
      key: "name",
      render: (name: string, record: Team) => (
        <Link to={`/teams/${record.id}`}>{name}</Link>
      ),
    },
    {
      title: t("Açıklama"),
      dataIndex: "description",
      key: "description",
      render: (description: string | null | undefined) =>
        description && description.trim() !== "" ? description : "-",
    },
    {
      title: t("Durum"),
      dataIndex: "isActive",
      key: "isActive",
      render: (isActive: boolean, record: Team) => {
        // Yalnızca o an güncellenen satırın anahtarı yükleniyor (loading) durumunda olur
        const isRowToggling =
          updateTeamMutation.isPending &&
          updateTeamMutation.variables?.id === record.id;

        return (
          <Space size="small">
            {canManagePeople && (
              <Switch
                size="small"
                checked={isActive}
                loading={isRowToggling}
                onChange={(checked) => handleToggleStatus(record, checked)}
              />
            )}
            {isActive ? (
              <Tag color="green">{t("Aktif")}</Tag>
            ) : (
              <Tag color="default">{t("Pasif")}</Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: t("Oluşturulma"),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (createdAt: string) => dayjs(createdAt).format(dateTimeFormat()),
    },
    {
      title: t("İşlemler"),
      key: "actions",
      render: (_: unknown, record: Team) => {
        const isRowDeleting =
          deleteTeamMutation.isPending &&
          deleteTeamMutation.variables === record.id;

        return (
          <Space size="small">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleOpenEditModal(record)}
            >
              {t("Düzenle")}
            </Button>
            <Popconfirm
              title={t("Ekibi silmek istediğinize emin misiniz?")}
              okText={t("Sil")}
              cancelText={t("Vazgeç")}
              okButtonProps={{ danger: true, loading: isRowDeleting }}
              onConfirm={() => handleDeleteTeam(record.id)}
            >
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                loading={isRowDeleting}
              >
                {t("Sil")}
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <section className="workspace-list-page" aria-labelledby="team-list-title">
      <header className="workspace-page-heading">
        <h1 id="team-list-title">{t("Ekipler")}</h1>
        {canManagePeople && (
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined aria-hidden />}
            onClick={handleOpenCreateModal}
          >
            {t("Yeni Ekip")}
          </Button>
        )}
      </header>
      <div
        className="workspace-filters directory-filters"
        role="group"
        aria-label={t("Ekip filtreleri")}
      >
        <div className="filter-field">
          <label htmlFor="team-list-search">{t("Ara")}</label>
          <Input
            id="team-list-search"
            placeholder={t("Ekip adı ara...")}
            prefix={<SearchOutlined />}
            allowClear
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <div className="filter-field">
          <label htmlFor="team-list-status">{t("Durum")}</label>
          <Select
            id="team-list-status"
            value={statusFilter}
            onChange={(value: "all" | "active" | "passive") => {
              setStatusFilter(value);
              setPage(1);
            }}
            options={[
              { label: t("Tümü"), value: "all" },
              { label: t("Aktif"), value: "active" },
              { label: t("Pasif"), value: "passive" },
            ]}
          />
        </div>
      </div>

      {isError ? (
        <Alert
          type="error"
          showIcon
          title={t("Ekip listesi yüklenemedi")}
          description={t("Sunucu bağlantısını kontrol edip yeniden deneyin.")}
          action={
            <Button
              loading={isFetching}
              onClick={() => {
                void refetch();
              }}
            >
              {t("Yeniden dene")}
            </Button>
          }
        />
      ) : (
        <Table<Team>
          rowKey="id"
          columns={
            canManagePeople
              ? columns
              : columns.filter(({ key }) => key !== "actions")
          }
          dataSource={data?.data ?? []}
          loading={isFetching}
          locale={{ emptyText: t("Kayıt bulunamadı") }}
          scroll={{ x: 720 }}
          pagination={{
            current: page,
            pageSize: limit,
            total: data?.total ?? 0,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50],
            onChange: (newPage, newPageSize) => {
              if (newPageSize !== limit) {
                setLimit(newPageSize);
                setPage(1);
              } else {
                setPage(newPage);
              }
            },
          }}
        />
      )}

      {canManagePeople && (
        <TeamFormModal
          open={isModalOpen}
          team={editingTeam}
          onClose={handleCloseModal}
        />
      )}
    </section>
  );
}
