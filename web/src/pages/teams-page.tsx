// web/src/pages/teams-page.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
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
import dayjs from "dayjs";
import { TeamFormModal } from "../components/team-form-modal";
import { useDeleteTeam, useTeams, useUpdateTeam } from "../hooks/use-teams";
import type { Team } from "../types";

const { Title } = Typography;

export function TeamsPage() {
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

  const { data, isFetching } = useTeams({
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
        checked ? "Ekip aktif hale getirildi" : "Ekip pasif hale getirildi",
      );
    } catch {
      // Hata mesajı http.ts interceptor tarafından gösterilir
    }
  };

  // Popconfirm onaylandığında ekibi siler
  const handleDeleteTeam = async (id: number) => {
    try {
      await deleteTeamMutation.mutateAsync(id);
      message.success("Ekip başarıyla silindi");
    } catch {
      // Hata mesajı http.ts interceptor tarafından gösterilir
    }
  };

  const columns: TableColumnsType<Team> = [
    {
      title: "Ekip Adı",
      dataIndex: "name",
      key: "name",
      render: (name: string, record: Team) => (
        <Link to={`/teams/${record.id}`}>{name}</Link>
      ),
    },
    {
      title: "Açıklama",
      dataIndex: "description",
      key: "description",
      render: (description: string | null | undefined) =>
        description && description.trim() !== "" ? description : "-",
    },
    {
      title: "Durum",
      dataIndex: "isActive",
      key: "isActive",
      render: (isActive: boolean, record: Team) => {
        // Yalnızca o an güncellenen satırın anahtarı yükleniyor (loading) durumunda olur
        const isRowToggling =
          updateTeamMutation.isPending &&
          updateTeamMutation.variables?.id === record.id;

        return (
          <Space size="small">
            <Switch
              size="small"
              checked={isActive}
              loading={isRowToggling}
              onChange={(checked) => handleToggleStatus(record, checked)}
            />
            {isActive ? (
              <Tag color="green">Aktif</Tag>
            ) : (
              <Tag color="default">Pasif</Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: "Oluşturulma",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (createdAt: string) =>
        dayjs(createdAt).format("DD.MM.YYYY HH:mm"),
    },
    {
      title: "İşlemler",
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
              Düzenle
            </Button>
            <Popconfirm
              title="Ekibi silmek istediğinize emin misiniz?"
              okText="Sil"
              cancelText="Vazgeç"
              okButtonProps={{ danger: true, loading: isRowDeleting }}
              onConfirm={() => handleDeleteTeam(record.id)}
            >
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                loading={isRowDeleting}
              >
                Sil
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          Ekipler
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleOpenCreateModal}
        >
          Yeni Ekip
        </Button>
      </div>

      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="Ekip adı ara..."
          prefix={<SearchOutlined />}
          allowClear
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          style={{ width: 260 }}
        />
        <Select
          value={statusFilter}
          onChange={(value: "all" | "active" | "passive") => {
            setStatusFilter(value);
            setPage(1);
          }}
          style={{ width: 160 }}
          options={[
            { label: "Tümü", value: "all" },
            { label: "Aktif", value: "active" },
            { label: "Pasif", value: "passive" },
          ]}
        />
      </Space>

      <Table<Team>
        rowKey="id"
        columns={columns}
        dataSource={data?.data ?? []}
        loading={isFetching}
        locale={{ emptyText: "Kayıt bulunamadı" }}
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

      <TeamFormModal
        open={isModalOpen}
        team={editingTeam}
        onClose={handleCloseModal}
      />
    </div>
  );
}
