import { useTranslation } from "../i18n/language";
import { useEffect, useRef, useState } from "react";
import { Alert, Button, Input, Modal, Table, Tag, Typography } from "antd";
import type { TableColumnsType } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useWorkforceUsers } from "../hooks/use-workforce-users";
import { useAddTeamMember } from "../hooks/use-team-members";
import type { QueryWorkforceUsersParams, Team, WorkforceUser } from "../types";

interface AddTeamMemberModalProps {
  team: Team;
  onClose: () => void;
  onAdded: () => void;
}

// Yalnızca açıkken mount edilir; tekrar açıldığında eski arama/seçim kalmaz.
export function AddTeamMemberModal({
  team,
  onClose,
  onAdded,
}: AddTeamMemberModalProps) {
  const t = useTranslation();
  const [search, setSearch] = useState("");
  const [params, setParams] = useState<QueryWorkforceUsersParams>({
    page: 1,
    limit: 10,
  });
  const [selectedId, setSelectedId] = useState<number>();
  const submitting = useRef(false);
  const mutation = useAddTeamMember();
  const { data, isFetching, isError, refetch } = useWorkforceUsers(params);

  useEffect(() => {
    const timer = setTimeout(() => {
      const nextSearch = search.trim() || undefined;
      setParams((current) =>
        current.search === nextSearch
          ? current
          : { ...current, search: nextSearch, page: 1 },
      );
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const isSearching = search.trim() !== (params.search ?? "");
  const unavailableReason = (person: WorkforceUser) => {
    if (person.teamId !== null) {
      return person.teamId === team.id
        ? t("Zaten bu ekibin üyesi")
        : t("{team} ekibine atanmış", {
            team: person.team?.name ?? t("Ekip #{id}", { id: person.teamId }),
          });
    }
    return person.isActive ? undefined : t("Personel pasif");
  };
  const selected = data?.data.find((person) => person.id === selectedId);
  const canSubmit =
    team.isActive &&
    selected &&
    !unavailableReason(selected) &&
    !isFetching &&
    !isSearching &&
    !isError &&
    !mutation.isPending;

  const submit = async () => {
    if (!canSubmit || !selected || submitting.current) return;
    submitting.current = true;
    try {
      await mutation.mutateAsync({
        teamId: team.id,
        workforceUserId: selected.id,
      });
      onAdded();
      onClose();
    } catch {
      // Ortak HTTP istemcisi backend mesajını gösterir. Modal açık kalır.
    } finally {
      submitting.current = false;
    }
  };

  const columns: TableColumnsType<WorkforceUser> = [
    {
      title: t("Sicil No"),
      dataIndex: "registrationNumber",
      key: "registrationNumber",
    },
    {
      title: t("Ad Soyad"),
      key: "fullName",
      render: (_value, person) => `${person.firstName} ${person.lastName}`,
    },
    {
      title: t("Ekip"),
      key: "team",
      render: (_value, person) =>
        person.teamId !== null ? (
          <Tag color={person.teamId === team.id ? "blue" : "default"}>
            {person.team?.name ?? t("Ekip #{id}", { id: person.teamId })}
          </Tag>
        ) : (
          "—"
        ),
    },
    {
      title: t("Durum"),
      key: "status",
      render: (_value, person) => (
        <Tag color={person.isActive ? "green" : "default"}>
          {person.isActive ? t("Aktif") : t("Pasif")}
        </Tag>
      ),
    },
  ];

  return (
    <Modal
      title={`${team.name} — ${t("Üye Ekle")}`}
      open
      width={760}
      okText={t("Ekle")}
      cancelText={t("Vazgeç")}
      onOk={() => {
        void submit();
      }}
      onCancel={() => {
        if (!submitting.current) onClose();
      }}
      confirmLoading={mutation.isPending}
      okButtonProps={{ disabled: !canSubmit }}
      cancelButtonProps={{ disabled: mutation.isPending }}
      closable={!mutation.isPending}
      keyboard={!mutation.isPending}
      mask={{ closable: !mutation.isPending }}
    >
      <Typography.Paragraph type="secondary" style={{ marginTop: 16 }}>
        {t(
          "Personeli ad, soyad veya sicil numarasıyla arayın. Bir ekibe atanmış veya pasif personeller seçilemez.",
        )}
      </Typography.Paragraph>
      {!team.isActive && (
        <Alert
          type="warning"
          showIcon
          title={t("Pasif ekibe personel eklenemez.")}
          style={{ marginBottom: 16 }}
        />
      )}
      <Input
        aria-label={t("Eklenecek personeli ara")}
        placeholder={t("Ad, soyad veya sicil numarası...")}
        prefix={<SearchOutlined />}
        allowClear
        value={search}
        disabled={mutation.isPending}
        onChange={(event) => {
          setSearch(event.target.value);
          setSelectedId(undefined);
        }}
        style={{ marginBottom: 16 }}
      />
      {isError ? (
        <Alert
          type="error"
          showIcon
          title={t("Personel listesi yüklenemedi")}
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
          size="small"
          columns={columns}
          dataSource={data?.data ?? []}
          loading={isFetching || isSearching}
          locale={{ emptyText: t("Aramaya uygun personel bulunamadı") }}
          scroll={{ x: 580 }}
          rowSelection={{
            type: "radio",
            selectedRowKeys: selectedId === undefined ? [] : [selectedId],
            onChange: (keys) =>
              setSelectedId(
                keys[0] === undefined ? undefined : Number(keys[0]),
              ),
            getCheckboxProps: (person) => ({
              disabled:
                Boolean(unavailableReason(person)) ||
                !team.isActive ||
                mutation.isPending ||
                isSearching,
              title: unavailableReason(person),
              "aria-label": t("{name} seç", {
                name: `${person.firstName} ${person.lastName}`,
              }),
            }),
          }}
          pagination={{
            current: params.page,
            pageSize: params.limit,
            total: data?.total ?? 0,
            showSizeChanger: false,
            disabled: mutation.isPending,
            onChange: (page) => {
              setSelectedId(undefined);
              setParams((current) => ({ ...current, page }));
            },
          }}
        />
      )}
    </Modal>
  );
}
