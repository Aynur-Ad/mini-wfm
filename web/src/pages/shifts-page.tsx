import { useState } from "react";
import { Alert, Button, Card, Select, Space, Spin, message } from "antd";
import {
  CalendarOutlined,
  LeftOutlined,
  RightOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getOrderTeams } from "../work-orders/work-orders.api";
import { allPeople, monday, useWeek } from "../api/shifts";
import { useSession } from "../auth/use-session";
import { useLanguage, useTranslation } from "../i18n/language";
import { ShiftPlanner } from "../components/shift-planner";

import { ShiftWeekBoard } from "../components/shift-week-board";

export function ShiftsPage() {
  const t = useTranslation(),
    lang = useLanguage(),
    client = useQueryClient(),
    { account } = useSession();
  const [week, setWeek] = useState(() => monday()),
    [team, setTeam] = useState<number>(),
    [person, setPerson] = useState<number>();
  const [view, setView] = useState<"week" | "agenda">(() =>
    window.matchMedia("(max-width: 680px)").matches ? "agenda" : "week",
  );
  const [form, setForm] = useState<"person" | "rotation">();
  const [feedback, feedbackHolder] = message.useMessage();
  const shifts = useWeek(week, team);
  const teams = useQuery({
    queryKey: ["teams", "order-options"],
    queryFn: getOrderTeams,
  });
  const people = useQuery({
    queryKey: ["workforce-users", "calendar-options"],
    queryFn: allPeople,
  });
  const write =
    account.data?.role === "ADMIN" || account.data?.role === "PLANNER";
  const days = Array.from({ length: 7 }, (_, i) =>
    week.add(i, "day").locale(lang),
  );
  const visible = (people.data ?? [])
    .filter(
      (p) =>
        (!team || p.teamId === team) &&
        (!person || p.id === person) &&
        (p.isActive || shifts.data?.some((s) => s.workforceUserId === p.id)),
    )
    .sort(
      (a, b) =>
        (a.team?.name ?? "").localeCompare(b.team?.name ?? "", lang) ||
        a.firstName.localeCompare(b.firstName, lang),
    );
  const canOpen = !!people.data && !!teams.data;
  return (
    <section>
      {feedbackHolder}
      <header className="workspace-page-heading">
        <h1>{t("Vardiya takvimi")}</h1>
        {write && (
          <Space wrap>
            <Button
              disabled={!canOpen}
              icon={<CalendarOutlined />}
              onClick={() => setForm("rotation")}
            >
              {t("Otomatik vardiya planı")}
            </Button>
            <Button
              disabled={!canOpen}
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setForm("person")}
            >
              {t("Vardiya ata")}
            </Button>
          </Space>
        )}
      </header>
      <Card className="calendar-card">
        <div className="calendar-tools">
          <Space wrap>
            <Button
              aria-label={t("Önceki hafta")}
              icon={<LeftOutlined />}
              onClick={() => setWeek(week.subtract(7, "day"))}
            />
            <b>
              {days[0].format("D MMM")} – {days[6].format("D MMM YYYY")}
            </b>
            <Button
              aria-label={t("Sonraki hafta")}
              icon={<RightOutlined />}
              onClick={() => setWeek(week.add(7, "day"))}
            />
            <Button onClick={() => setWeek(monday())}>{t("Bu hafta")}</Button>
          </Space>
          <Space wrap>
            <Select
              allowClear
              aria-label={t("Ekip")}
              placeholder={t("Tüm ekipler")}
              value={team}
              options={teams.data?.map((x) => ({ value: x.id, label: x.name }))}
              onChange={(v) => {
                setTeam(v);
                setPerson(undefined);
              }}
            />
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              aria-label={t("Personel")}
              placeholder={t("Tüm personel")}
              value={person}
              options={people.data
                ?.filter((p) => !team || p.teamId === team)
                .map((p) => ({
                  value: p.id,
                  label: p.firstName + " " + p.lastName,
                }))}
              onChange={setPerson}
            />
          </Space>
        </div>
        {shifts.isError || people.isError || teams.isError ? (
          <Alert
            type="error"
            showIcon
            title={t("Bazı veriler yüklenemedi")}
            action={
              <Button
                onClick={() => {
                  void shifts.refetch();
                  void people.refetch();
                  void teams.refetch();
                }}
              >
                {t("Tekrar dene")}
              </Button>
            }
          />
        ) : shifts.isPending || people.isPending ? (
          <Spin />
        ) : (
          <ShiftWeekBoard
            view={view}
            setView={setView}
            days={days}
            people={visible}
            shifts={shifts.data ?? []}
          />
        )}
      </Card>
      {form && (
        <ShiftPlanner
          mode={form}
          date={(week.isAfter(dayjs()) ? week : dayjs().add(1, "day")).format(
            "YYYY-MM-DD",
          )}
          people={people.data ?? []}
          teams={teams.data ?? []}
          initialTeam={teams.data?.find((x) => x.id === team && x.isActive)?.id}
          close={() => setForm(undefined)}
          saved={(date, newTeam) => {
            setForm(undefined);
            setWeek(monday(dayjs(date)));
            setTeam(newTeam);
            setPerson(undefined);
            void client.invalidateQueries({ queryKey: ["shifts"] });
            void feedback.success(t("Vardiyalar kaydedildi"));
          }}
        />
      )}
    </section>
  );
}
