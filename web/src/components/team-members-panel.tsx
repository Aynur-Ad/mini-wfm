import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button, Popconfirm, Table, Tooltip, Typography, message } from "antd";
import type { TableColumnsType } from "antd";
import { PlusOutlined, UserDeleteOutlined } from "@ant-design/icons";
import { AddTeamMemberModal } from "./add-team-member-modal";
import { useRemoveTeamMember } from "../hooks/use-team-members";
import { formatPhone } from "../utils/format-phone";
import type { TeamDetail, TeamMember } from "../types";

function RemoveMemberButton({
  team,
  person,
  onRemoved,
}: {
  team: TeamDetail;
  person: TeamMember;
  onRemoved: () => void;
}) {
  const mutation = useRemoveTeamMember();
  const submitting = useRef(false);
  const disabledReason = !team.isActive
    ? "Pasif ekipte üyelik değiştirilemez."
    : !person.isActive
      ? "Pasif personel çıkarılamaz. Önce personeli aktif hale getirin."
      : undefined;
  const remove = async () => {
    if (submitting.current || disabledReason) return;
    submitting.current = true;
    try {
      await mutation.mutateAsync({
        teamId: team.id,
        workforceUserId: person.id,
      });
      onRemoved();
    } catch {
      // İstek başarısızsa kişi üyeler tablosunda kalır; hata ortak istemciden gösterilir.
    } finally {
      submitting.current = false;
    }
  };

  return (
    <Tooltip title={disabledReason}>
      <span style={{ display: "inline-block" }}>
        <Popconfirm
          title="Personel ekipten çıkarılsın mı?"
          description={`${person.firstName} ${person.lastName} (${person.registrationNumber}) — personel kaydı silinmez.`}
          okText="Çıkar"
          cancelText="Vazgeç"
          disabled={Boolean(disabledReason) || mutation.isPending}
          okButtonProps={{ danger: true, loading: mutation.isPending }}
          cancelButtonProps={{ disabled: mutation.isPending }}
          onConfirm={remove}
        >
          <Button
            danger
            type="text"
            icon={<UserDeleteOutlined />}
            loading={mutation.isPending}
            disabled={Boolean(disabledReason)}
          >
            Çıkar
          </Button>
        </Popconfirm>
      </span>
    </Tooltip>
  );
}

export function TeamMembersPanel({ team }: { team: TeamDetail }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const columns: TableColumnsType<TeamMember> = [
    {
      title: "Sicil No",
      dataIndex: "registrationNumber",
      key: "registrationNumber",
      render: (value: string, person) => (
        <Link to={`/workforce-users/${person.id}`}>{value}</Link>
      ),
    },
    {
      title: "Ad Soyad",
      key: "fullName",
      render: (_value, person) => `${person.firstName} ${person.lastName}`,
    },
    {
      title: "Telefon",
      dataIndex: "phone",
      key: "phone",
      render: (phone: string | null) => formatPhone(phone),
    },
    {
      title: "İşlemler",
      key: "actions",
      render: (_value, person) => (
        <RemoveMemberButton
          team={team}
          person={person}
          onRemoved={() => {
            void messageApi.success("Personel ekipten çıkarıldı");
          }}
        />
      ),
    },
  ];

  return (
    <section aria-label="Ekip üyeleri" style={{ marginTop: 32 }}>
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
        <Typography.Title level={4} style={{ margin: 0 }}>
          Üyeler
        </Typography.Title>
        <Tooltip
          title={
            !team.isActive
              ? "Pasif ekibe personel eklenemez. Önce ekibi aktif hale getirin."
              : undefined
          }
        >
          <span style={{ display: "inline-block" }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              disabled={!team.isActive}
              onClick={() => setModalOpen(true)}
            >
              Üye Ekle
            </Button>
          </span>
        </Tooltip>
      </div>
      <Table<TeamMember>
        rowKey="id"
        columns={columns}
        dataSource={team.members}
        locale={{ emptyText: "Bu ekibe henüz personel atanmamış" }}
        scroll={{ x: 650 }}
        pagination={{
          pageSize: 10,
          hideOnSinglePage: true,
          showSizeChanger: false,
        }}
      />
      {modalOpen && (
        <AddTeamMemberModal
          key={team.id}
          team={team}
          onClose={() => setModalOpen(false)}
          onAdded={() => {
            void messageApi.success("Personel ekibe eklendi");
          }}
        />
      )}
    </section>
  );
}