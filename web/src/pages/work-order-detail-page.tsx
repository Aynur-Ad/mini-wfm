import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Breadcrumb,
  Button,
  Descriptions,
  Form,
  Input,
  Modal,
  Result,
  Select,
  Space,
  Spin,
  Timeline,
} from "antd";
import { EditOutlined, ReloadOutlined } from "@ant-design/icons";
import { isAxiosError } from "axios";
import { Link, useParams } from "react-router-dom";
import { apiErrorMessage } from "../api/http";
import { useSession } from "../auth/use-session";
import { TEAMS_QUERY_KEY } from "../hooks/query-keys";
import { OrderForm } from "../work-orders/order-form";
import { PriorityTag, StatusTag } from "../work-orders/order-ui";
import {
  changeWorkOrderStatus,
  getOrderTeams,
  getWorkOrder,
  getWorkOrderHistory,
  historyKey,
  orderKey,
  ordersKey,
  updateWorkOrder,
} from "../work-orders/work-orders.api";
import {
  actionLabels,
  allowedTransitions,
  canWriteOrders,
  displayDate,
  statusLabels,
} from "../work-orders/work-orders";
import type {
  Status,
  WorkOrder,
  WorkOrderInput,
} from "../work-orders/work-orders";

type ChangeFields = { teamId?: number; reason?: string };

export function WorkOrderDetailPage() {
  const { id } = useParams();
  const valid = Boolean(
    id && /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id)),
  );
  return valid ? <OrderDetails key={id} id={Number(id)} /> : <MissingOrder />;
}

function MissingOrder() {
  return (
    <Result
      status="404"
      title="İş emri bulunamadı"
      extra={<Link to="/work-orders">İş emirlerine dön</Link>}
    />
  );
}

function OrderDetails({ id }: { id: number }) {
  const client = useQueryClient();
  const { account } = useSession();
  const [editing, setEditing] = useState<WorkOrder>();
  const [transition, setTransition] = useState<{
    target: Status;
    version: number;
  }>();
  const [conflict, setConflict] = useState("");
  const [reloading, setReloading] = useState(false);
  const [form] = Form.useForm<ChangeFields>();
  const detail = useQuery({
    queryKey: orderKey(id),
    queryFn: ({ signal }) => getWorkOrder(id, signal),
  });
  const history = useQuery({
    queryKey: historyKey(id),
    queryFn: ({ signal }) => getWorkOrderHistory(id, signal),
    enabled: detail.isSuccess,
  });
  const teams = useQuery({
    queryKey: [TEAMS_QUERY_KEY, "order-options"],
    queryFn: getOrderTeams,
    enabled: detail.isSuccess,
  });

  function saved(updated: WorkOrder) {
    setEditing(undefined);
    setTransition(undefined);
    setConflict("");
    client.setQueryData(orderKey(id), updated);
    void client.invalidateQueries({ queryKey: ordersKey });
  }

  function onConflict(error: unknown) {
    if (isAxiosError(error) && error.response?.status === 409) {
      setEditing(undefined);
      setTransition(undefined);
      setConflict(
        apiErrorMessage(
          error,
          "Kayıt değişti. Güncel veriyi yüklemek için Yenile'ye bas.",
        ),
      );
    }
  }

  const edit = useMutation({
    mutationFn: ({
      original,
      input,
    }: {
      original: WorkOrder;
      input: WorkOrderInput;
    }) => {
      const { dueAt, ...changes } = input;
      // Değişmemiş, geçmişteki son tarihi PATCH'e eklemek backend doğrulamasına takılır.
      return updateWorkOrder(id, original.version, {
        ...changes,
        ...(Date.parse(dueAt) !== Date.parse(original.dueAt) ? { dueAt } : {}),
      });
    },
    onSuccess: saved,
    onError: onConflict,
  });
  const change = useMutation({
    mutationFn: ({
      target,
      version,
      values,
    }: {
      target: Status;
      version: number;
      values: ChangeFields;
    }) => changeWorkOrderStatus(id, version, target, values),
    onSuccess: saved,
    onError: onConflict,
  });

  async function refresh() {
    setReloading(true);
    try {
      const result = await detail.refetch();
      if (result.isSuccess) {
        await history.refetch();
        void client.invalidateQueries({ queryKey: [...ordersKey, "list"] });
        setConflict("");
      }
    } finally {
      setReloading(false);
    }
  }

  if (isAxiosError(detail.error) && detail.error.response?.status === 404)
    return <MissingOrder />;
  if (detail.isPending)
    return (
      <div className="order-loading">
        <Spin aria-label="İş emri yükleniyor" />
      </div>
    );
  if (detail.isError && !detail.data)
    return (
      <Result
        status="error"
        title="İş emri yüklenemedi"
        extra={
          <Button onClick={() => void refresh()} loading={reloading}>
            Yenile
          </Button>
        }
      />
    );
  const order = detail.data;
  if (!order) return null;

  const role = account.data?.role;
  const actions = allowedTransitions(order.status, role);
  const locked =
    Boolean(conflict) || edit.isPending || change.isPending || reloading;
  const teamName = (teamId: number | null) =>
    teamId === null
      ? "Atanmamış"
      : (teams.data?.find((team) => team.id === teamId)?.name ??
        `Ekip #${teamId}`);

  function openTransition(target: Status, version: number) {
    setTransition({ target, version });
  }

  return (
    <section aria-labelledby="order-title">
      <Breadcrumb
        items={[
          { title: <Link to="/work-orders">İş Emirleri</Link> },
          { title: order.code },
        ]}
      />
      <div className="workspace-page-heading detail-heading order-detail-heading">
        <div>
          <div className="order-code">{order.code}</div>
          <h1 id="order-title">{order.title}</h1>
        </div>
        <Space wrap>
          <PriorityTag priority={order.priority} />
          <StatusTag status={order.status} />
        </Space>
      </div>
      {conflict && (
        <Alert
          className="order-conflict"
          showIcon
          type="warning"
          title={conflict}
          action={
            <Button
              icon={<ReloadOutlined />}
              loading={reloading}
              onClick={() => void refresh()}
            >
              Yenile
            </Button>
          }
        />
      )}
      <Descriptions
        bordered
        column={1}
        items={[
          { key: "team", label: "Ekip", children: teamName(order.teamId) },
          {
            key: "dueAt",
            label: "Bitiş zamanı",
            children: displayDate(order.dueAt),
          },
          {
            key: "description",
            label: "Açıklama",
            children: (
              <span className="order-description">
                {order.description || "—"}
              </span>
            ),
          },
        ]}
      />
      {canWriteOrders(role) && actions.length > 0 && (
        <Space wrap className="order-actions">
          <Button
            icon={<EditOutlined />}
            disabled={locked}
            onClick={() => setEditing(order)}
          >
            Düzenle
          </Button>
          {actions.map((target) => (
            <Button
              key={target}
              disabled={locked}
              type={target === actions[0] ? "primary" : "default"}
              danger={target === "CANCELLED"}
              onClick={() => openTransition(target, order.version)}
            >
              {actionLabels[target]}
            </Button>
          ))}
        </Space>
      )}

      <section className="order-history" aria-labelledby="history-title">
        <h2 id="history-title">Durum geçmişi</h2>
        {history.isPending ? (
          <Spin aria-label="Durum geçmişi yükleniyor" />
        ) : history.isError ? (
          <Alert
            title="Durum geçmişi yüklenemedi"
            type="error"
            showIcon
            action={
              <Button onClick={() => void history.refetch()}>Yenile</Button>
            }
          />
        ) : history.data.length ? (
          <Timeline
            items={history.data.map((entry) => ({
              key: entry.id,
              color: entry.toStatus === "CANCELLED" ? "gray" : "green",
              content: (
                <div className="history-entry">
                  <strong>
                    {entry.fromStatus
                      ? `${statusLabels[entry.fromStatus]} → ${statusLabels[entry.toStatus]}`
                      : "İş emri oluşturuldu"}
                  </strong>
                  <span>
                    {displayDate(entry.changedAt)} · {entry.changedBy.username}
                    {entry.teamId !== null
                      ? ` · ${teamName(entry.teamId)}`
                      : ""}
                  </span>
                  {entry.reason && <p>{entry.reason}</p>}
                </div>
              ),
            }))}
          />
        ) : (
          <p>Henüz bir geçmiş kaydı yok.</p>
        )}
      </section>

      {editing && (
        <OrderForm
          order={editing}
          pending={edit.isPending}
          onSave={(input) => edit.mutate({ original: editing, input })}
          onClose={() => setEditing(undefined)}
        />
      )}
      {transition && (
        <Modal
          open
          title={actionLabels[transition.target]}
          okText={actionLabels[transition.target]}
          cancelText="Vazgeç"
          confirmLoading={change.isPending}
          okButtonProps={{
            danger: transition.target === "CANCELLED",
            disabled:
              transition.target === "ASSIGNED" &&
              (!teams.data?.some((team) => team.isActive) || teams.isError),
          }}
          cancelButtonProps={{ disabled: change.isPending }}
          onCancel={() => {
            if (!change.isPending) setTransition(undefined);
          }}
          onOk={() => form.submit()}
          destroyOnHidden
        >
          <Form<ChangeFields>
            form={form}
            preserve={false}
            layout="vertical"
            onFinish={({ teamId, reason }) => {
              change.mutate({
                ...transition,
                values: {
                  ...(transition.target === "ASSIGNED" && { teamId }),
                  ...(transition.target === "CANCELLED" && {
                    reason: reason?.trim(),
                  }),
                },
              });
            }}
          >
            {transition.target === "ASSIGNED" ? (
              <>
                {teams.isError && (
                  <Alert
                    title="Ekipler yüklenemedi"
                    type="error"
                    action={
                      <Button onClick={() => void teams.refetch()}>
                        Yenile
                      </Button>
                    }
                  />
                )}
                <Form.Item
                  name="teamId"
                  label="Ekip"
                  rules={[{ required: true, message: "Bir ekip seç." }]}
                >
                  <Select
                    showSearch
                    optionFilterProp="label"
                    loading={teams.isPending}
                    placeholder="Aktif ekip seç"
                    notFoundContent="Aktif ekip bulunamadı"
                    options={teams.data
                      ?.filter((team) => team.isActive)
                      .map((team) => ({ value: team.id, label: team.name }))}
                  />
                </Form.Item>
              </>
            ) : transition.target === "CANCELLED" ? (
              <Form.Item
                name="reason"
                label="İptal nedeni"
                rules={[
                  {
                    required: true,
                    whitespace: true,
                    message: "İptal nedeni gir.",
                  },
                  { max: 500 },
                ]}
              >
                <Input.TextArea rows={3} maxLength={500} showCount />
              </Form.Item>
            ) : (
              <p>
                İş emrinin durumu{" "}
                <strong>{statusLabels[transition.target]}</strong> olarak
                güncellenecek.
              </p>
            )}
          </Form>
        </Modal>
      )}
    </section>
  );
}
