import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Checkbox,
  Input,
  Select,
  Space,
  Table,
  Tag,
} from "antd";
import type { TableColumnsType } from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import { useSession } from "../auth/use-session";
import { TEAMS_QUERY_KEY } from "../hooks/query-keys";
import {
  createWorkOrder,
  getOrderTeams,
  listKey,
  listWorkOrders,
  ordersKey,
} from "../work-orders/work-orders.api";
import { OrderForm } from "../work-orders/order-form";
import { PriorityTag, StatusTag } from "../work-orders/order-ui";
import {
  canWriteOrders,
  displayDate,
  priorityOptions,
  statusOptions,
} from "../work-orders/work-orders";
import type { Filters, WorkOrderListItem } from "../work-orders/work-orders";

const columns: TableColumnsType<WorkOrderListItem> = [
  {
    title: "Kod",
    key: "code",
    render: (_, row) => (
      <Link className="order-code" to={`/work-orders/${row.id}`}>
        {row.code}
      </Link>
    ),
  },
  { title: "Başlık", dataIndex: "title", key: "title" },
  {
    title: "Öncelik",
    key: "priority",
    render: (_, row) => <PriorityTag priority={row.priority} />,
  },
  {
    title: "Durum",
    key: "status",
    render: (_, row) => <StatusTag status={row.status} />,
  },
  {
    title: "Ekip",
    key: "team",
    render: (_, row) => row.team?.name ?? "Atanmamış",
  },
  {
    title: "Bitiş zamanı",
    key: "dueAt",
    render: (_, row) => (
      <Space wrap>
        {displayDate(row.dueAt)}
        {row.isOverdue && <Tag color="volcano">Gecikti</Tag>}
      </Space>
    ),
  },
];

export function WorkOrdersPage() {
  const navigate = useNavigate();
  const client = useQueryClient();
  const { account } = useSession();
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>({ page: 1, limit: 10 });
  const orders = useQuery({
    queryKey: listKey(filters),
    queryFn: ({ signal }) => listWorkOrders(filters, signal),
  });
  const teams = useQuery({
    queryKey: [TEAMS_QUERY_KEY, "order-options"],
    queryFn: getOrderTeams,
  });
  const create = useMutation({
    mutationFn: createWorkOrder,
    onSuccess: (created) => {
      void client.invalidateQueries({ queryKey: ordersKey });
      void navigate(`/work-orders/${created.id}`);
    },
  });
  const updateFilters = (values: Partial<Filters>) =>
    setFilters((current) => ({ ...current, ...values, page: 1 }));

  return (
    <section aria-labelledby="orders-title">
      <div className="order-heading">
        <div>
          <h1 id="orders-title">İş Emirleri</h1>
          <p>Ekiplerin iş emirlerini ve bitiş zamanlarını takip et.</p>
        </div>
        {canWriteOrders(account.data?.role) && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreating(true)}
          >
            Yeni İş Emri
          </Button>
        )}
      </div>
      <div className="order-filters" aria-label="İş emri filtreleri">
        <Input.Search
          aria-label="İş emri ara"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            if (!event.target.value) updateFilters({ search: undefined });
          }}
          onSearch={(value) => updateFilters({ search: value.trim() })}
          placeholder="Kod veya başlık ara"
          allowClear
          enterButton={<SearchOutlined />}
        />
        <Select
          aria-label="Durum"
          mode="multiple"
          allowClear
          placeholder="Durum"
          options={statusOptions}
          value={filters.status ?? []}
          onChange={(status) => updateFilters({ status })}
        />
        <Select
          aria-label="Öncelik"
          allowClear
          placeholder="Öncelik"
          options={priorityOptions}
          value={filters.priority}
          onChange={(priority) => updateFilters({ priority })}
        />
        <Select
          aria-label="Ekip"
          loading={teams.isPending}
          showSearch
          optionFilterProp="label"
          allowClear
          placeholder="Ekip"
          options={teams.data?.map(({ id, name }) => ({
            value: id,
            label: name,
          }))}
          value={filters.teamId}
          onChange={(teamId) => updateFilters({ teamId })}
        />
        <Checkbox
          checked={Boolean(filters.overdue)}
          onChange={(event) => updateFilters({ overdue: event.target.checked })}
        >
          Yalnızca gecikenler
        </Checkbox>
      </div>
      {teams.isError && (
        <Alert
          type="warning"
          showIcon
          title="Ekip filtresi yüklenemedi"
          action={<Button onClick={() => void teams.refetch()}>Yenile</Button>}
        />
      )}
      {orders.isError ? (
        <Alert
          type="error"
          showIcon
          title="İş emirleri yüklenemedi"
          action={<Button onClick={() => void orders.refetch()}>Yenile</Button>}
        />
      ) : (
        <Table<WorkOrderListItem>
          rowKey="id"
          columns={columns}
          dataSource={orders.data?.data}
          loading={orders.isFetching}
          rowClassName={(row) => (row.isOverdue ? "order-overdue" : "")}
          scroll={{ x: 850 }}
          locale={{ emptyText: "Bu filtrelere uyan iş emri yok." }}
          pagination={{
            current: filters.page,
            pageSize: filters.limit,
            total: orders.data?.total ?? 0,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            onChange: (page, limit) =>
              setFilters((current) => ({
                ...current,
                page: limit === current.limit ? page : 1,
                limit,
              })),
          }}
        />
      )}
      {creating && (
        <OrderForm
          pending={create.isPending}
          onSave={(input) => create.mutate(input)}
          onClose={() => setCreating(false)}
        />
      )}
    </section>
  );
}
