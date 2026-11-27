import { useState } from "react";
import {
  Alert,
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
} from "antd";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import dayjs from "dayjs";
import { http, apiErrorMessage } from "../api/http";
import type { RotationPlan } from "../api/shifts";
import type { Team, WorkforceUser } from "../types";
import { useTranslation } from "../i18n/language";

import type { MessageKey } from "../i18n/messages";
const reasons: Record<string, MessageKey> = {
  REST: "Dinlenme süresi",
  WEEKLY_LIMIT: "Haftalık çalışma sınırı",
  CONSECUTIVE_DAYS: "Ardışık çalışma günü sınırı",
  OVERLAP: "Vardiya çakışması",
  INSUFFICIENT_MEMBERS: "Yeterli aktif üye yok",
};
type Mode = "person" | "team" | "rotation";
interface Fields {
  mode: Mode;
  teamId: number;
  workforceUserId: number;
  startAt: string;
  endAt: string;
  note?: string;
  startDate: string;
  days: number;
  slots: {
    name: string;
    startTime: string;
    endTime: string;
    requiredCount: number;
  }[];
}
interface Props {
  date: string;
  initialTeam?: number;
  mode: Mode;
  teams: Team[];
  people: WorkforceUser[];
  close: () => void;
  saved: (date: string, team?: number) => void;
}
export function ShiftPlanner({
  date,
  initialTeam,
  mode,
  teams,
  people,
  close,
  saved,
}: Props) {
  const t = useTranslation(),
    [form] = Form.useForm<Fields>();
  const selectedMode = Form.useWatch("mode", form) ?? mode;
  const rotation = selectedMode === "rotation";
  const [preview, setPreview] = useState<RotationPlan>();
  const names = new Map(
    people.map((p) => [p.id, p.firstName + " " + p.lastName]),
  );
  const required = [{ required: true, message: t("Bu alan zorunlu") }];
  const mutation = useMutation({
    mutationFn: async ({ v, apply }: { v: Fields; apply: boolean }) => {
      if (v.mode === "rotation") {
        const { data } = await http.post<RotationPlan>(
          "/teams/" + v.teamId + "/rotation-plan",
          { startDate: v.startDate, days: v.days, slots: v.slots, apply },
        );
        return data;
      }
      const start = dayjs(v.startAt),
        end = dayjs(v.endAt);
      const hours = end.diff(start, "minute") / 60;
      if (start.isBefore(dayjs()) || hours < 1 || hours > 12)
        throw new Error(t("Vardiya gelecekte başlamalı ve 1–12 saat sürmeli."));
      const payload = {
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        note: v.note?.trim() || null,
      };
      if (v.mode === "team")
        await http.post("/teams/" + v.teamId + "/shifts", payload);
      else
        await http.post("/shifts", {
          ...payload,
          workforceUserId: v.workforceUserId,
        });
    },
    onSuccess: (plan, { v, apply }) => {
      if (plan && !apply) {
        setPreview(plan);
        return;
      }
      const team =
        v.mode === "person"
          ? people.find((p) => p.id === v.workforceUserId)?.teamId
          : v.teamId;
      saved(v.mode === "rotation" ? v.startDate : v.startAt, team ?? undefined);
    },
  });
  function submit(v: Fields) {
    mutation.mutate({ v, apply: Boolean(rotation && preview) });
  }
  const initialSlot = {
    name: t("Gündüz"),
    startTime: "08:00",
    endTime: "16:00",
    requiredCount: 1,
  };
  return (
    <Drawer
      open
      size="min(520px,100vw)"
      title={t(rotation ? "Otomatik vardiya planı" : "Vardiya ata")}
      closable={!mutation.isPending}
      maskClosable={!mutation.isPending}
      keyboard={!mutation.isPending}
      onClose={close}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          mode,
          teamId: initialTeam,
          startAt: date + "T08:00",
          endAt: date + "T16:00",
          startDate: date,
          days: 7,
          slots: [initialSlot],
        }}
        onFinish={submit}
        disabled={mutation.isPending}
        onValuesChange={() => {
          setPreview(undefined);
          mutation.reset();
        }}
      >
        <Form.Item label={t("Atama türü")} name="mode">
          <Select
            options={[
              { value: "person", label: t("Personel") },
              { value: "team", label: t("Tüm ekip") },
              { value: "rotation", label: t("Otomatik vardiya planı") },
            ]}
          />
        </Form.Item>
        {selectedMode === "person" ? (
          <Form.Item
            name="workforceUserId"
            label={t("Personel")}
            rules={required}
          >
            <Select
              showSearch
              optionFilterProp="label"
              options={people
                .filter((p) => p.isActive)
                .map((p) => ({
                  value: p.id,
                  label:
                    p.firstName +
                    " " +
                    p.lastName +
                    " · " +
                    p.registrationNumber,
                }))}
            />
          </Form.Item>
        ) : (
          <Form.Item name="teamId" label={t("Ekip")} rules={required}>
            <Select
              showSearch
              optionFilterProp="label"
              options={teams
                .filter((x) => x.isActive)
                .map((x) => ({ value: x.id, label: x.name }))}
            />
          </Form.Item>
        )}
        {rotation ? (
          <>
            <div className="form-pair">
              <Form.Item
                name="startDate"
                label={t("Başlangıç tarihi")}
                rules={required}
              >
                <Input type="date" min={dayjs().format("YYYY-MM-DD")} />
              </Form.Item>
              <Form.Item name="days" label={t("Gün sayısı")} rules={required}>
                <InputNumber min={1} max={14} precision={0} />
              </Form.Item>
            </div>
            <Form.List name="slots">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name }) => (
                    <fieldset className="slot-fields" key={key}>
                      <legend>
                        {t("Vardiya kalıbı")} {name + 1}
                      </legend>
                      <Form.Item
                        name={[name, "name"]}
                        label={t("Ad")}
                        rules={required}
                      >
                        <Input maxLength={100} />
                      </Form.Item>
                      <div className="form-pair">
                        <Form.Item
                          name={[name, "startTime"]}
                          label={t("Başlangıç")}
                          rules={required}
                        >
                          <Input type="time" />
                        </Form.Item>
                        <Form.Item
                          name={[name, "endTime"]}
                          label={t("Bitiş")}
                          rules={required}
                        >
                          <Input type="time" />
                        </Form.Item>
                      </div>
                      <Form.Item
                        name={[name, "requiredCount"]}
                        label={t("Gerekli personel")}
                        rules={required}
                      >
                        <InputNumber min={1} max={100} precision={0} />
                      </Form.Item>
                      {fields.length > 1 && (
                        <Button
                          type="text"
                          icon={<MinusCircleOutlined />}
                          onClick={() => remove(name)}
                        >
                          {t("Kaldır")}
                        </Button>
                      )}
                    </fieldset>
                  ))}
                  {fields.length < 24 && (
                    <Button
                      icon={<PlusOutlined />}
                      onClick={() => add({ ...initialSlot, name: "" })}
                    >
                      {t("Kalıp ekle")}
                    </Button>
                  )}
                </>
              )}
            </Form.List>
          </>
        ) : (
          <>
            <Form.Item name="startAt" label={t("Başlangıç")} rules={required}>
              <Input type="datetime-local" />
            </Form.Item>
            <Form.Item name="endAt" label={t("Bitiş")} rules={required}>
              <Input type="datetime-local" />
            </Form.Item>
            <Form.Item name="note" label={t("Not")}>
              <Input.TextArea maxLength={500} />
            </Form.Item>
          </>
        )}
        {preview && (
          <section className="plan-preview">
            <h3>{t("Plan önizlemesi")}</h3>
            {preview.unfilled.length > 0 && (
              <Alert
                type="warning"
                showIcon
                title={t("Eksik atamalar")}
                description={preview.unfilled.map((s) => (
                  <div key={s.date + s.slot}>
                    {s.date} · {s.slot} ·{" "}
                    {t("{n} kişi eksik", { n: s.missing })} (
                    {s.reasonCodes
                      .map((code) => (reasons[code] ? t(reasons[code]) : code))
                      .join(", ")}
                    )
                  </div>
                ))}
              />
            )}
            <ul>
              {preview.assignments.map((a) => (
                <li key={[a.date, a.slot, a.workforceUserId].join("-")}>
                  <b>
                    {names.get(a.workforceUserId)} · {a.registrationNumber}
                  </b>
                  <span>
                    {dayjs(a.startAt).format("DD.MM HH:mm")} –{" "}
                    {dayjs(a.endAt).format("DD.MM HH:mm")} · {a.slot}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {mutation.isError && (
          <Alert
            type="error"
            showIcon
            title={
              mutation.error instanceof Error
                ? apiErrorMessage(mutation.error, mutation.error.message)
                : t("İşlem başarısız")
            }
          />
        )}
        <Space className="planner-actions">
          <Button onClick={close}>{t("Vazgeç")}</Button>
          <Button
            type="primary"
            htmlType="submit"
            disabled={Boolean(preview?.unfilled.length)}
            loading={mutation.isPending}
          >
            {t(
              rotation ? (preview ? "Planı uygula" : "Önizle") : "Vardiya ata",
            )}
          </Button>
        </Space>
      </Form>
    </Drawer>
  );
}
