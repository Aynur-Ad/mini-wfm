import { useQueries } from "@tanstack/react-query";
import { Alert, Card, Progress, Spin } from "antd";
import {
  ScheduleOutlined,
  TeamOutlined,
  IdcardOutlined,
  CalendarOutlined,
  ArrowUpOutlined,
  PieChartOutlined,
  BarChartOutlined,
  ApartmentOutlined,
} from "@ant-design/icons";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import { useLanguage, useTranslation } from "../i18n/language";
import { useTeams } from "../hooks/use-teams";
import { useWorkforceUsers } from "../hooks/use-workforce-users";
import { listWorkOrders, listKey } from "../work-orders/work-orders.api";
import { statusOptions } from "../work-orders/work-orders";
import { monday, useWeek } from "../api/shifts";

export function DashboardPage() {
  const t = useTranslation(),
    language = useLanguage();
  const start = monday(),
    shifts = useWeek(start);
  const teams = useTeams({ page: 1, limit: 1 }),
    people = useWorkforceUsers({ page: 1, limit: 1 });
  const activeTeams = useTeams({ page: 1, limit: 1, isActive: true }),
    activePeople = useWorkforceUsers({ page: 1, limit: 1, isActive: true });
  const states = statusOptions(t);
  const orders = useQueries({
    queries: states.map(({ value }) => {
      const filters = { page: 1, limit: 1, status: [value] };
      return {
        queryKey: listKey(filters),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          listWorkOrders(filters, signal),
      };
    }),
  });
  const counts = orders.map((q) => q.data?.total);
  const total = counts.every((n) => n !== undefined)
    ? counts.reduce<number>((a, b) => a + (b ?? 0), 0)
    : undefined;
  const statusSegments = states.map(({ value }, index) => {
    const count = counts[index] ?? 0;
    const offset = counts
      .slice(0, index)
      .reduce<number>((sum, n) => sum + (n ?? 0), 0);
    return {
      value,
      length: total ? (100 * count) / total : 0,
      start: total ? (100 * offset) / total : 0,
    };
  });
  const cards = [
    {
      label: t("İş Emirleri"),
      value: total,
      icon: <ScheduleOutlined />,
      to: "/work-orders",
    },
    {
      label: t("Ekipler"),
      value: teams.data?.total,
      icon: <TeamOutlined />,
      to: "/teams",
    },
    {
      label: t("Personeller"),
      value: people.data?.total,
      icon: <IdcardOutlined />,
      to: "/workforce-users",
    },
    {
      label: t("Bu haftaki vardiyalar"),
      value: shifts.data?.length,
      icon: <CalendarOutlined />,
      to: "/shifts",
    },
  ];
  const errors = [
    ...orders,
    teams,
    people,
    activeTeams,
    activePeople,
    shifts,
  ].some((q) => q.isError);
  const daily = Array.from({ length: 7 }, (_, i) => {
    const day = start.add(i, "day");
    return {
      label: day.locale(language).format("ddd"),
      value: shifts.data?.filter(
        (s) =>
          dayjs(s.startAt).isBefore(day.add(1, "day")) &&
          dayjs(s.endAt).isAfter(day),
      ).length,
    };
  });
  const max = Math.max(1, ...daily.map((d) => d.value ?? 0));
  return (
    <section className="dashboard-page">
      <header className="workspace-page-heading">
        <h1>{t("Genel bakış")}</h1>
        <time>
          <CalendarOutlined aria-hidden />
          {new Intl.DateTimeFormat(language, { dateStyle: "long" }).format(
            new Date(),
          )}
        </time>
      </header>
      {errors && (
        <Alert type="error" showIcon title={t("Bazı veriler yüklenemedi")} />
      )}
      <div className="metric-grid">
        {cards.map((c) => (
          <Link className="metric" key={c.to} to={c.to}>
            <span className="metric-icon">{c.icon}</span>
            <span>{c.label}</span>
            <strong>{c.value ?? "—"}</strong>
            <ArrowUpOutlined className="metric-arrow" />
          </Link>
        ))}
      </div>
      <div className="analysis-grid">
        <Card
          title={
            <>
              <PieChartOutlined /> {t("İş emirlerinin durumu")}
            </>
          }
        >
          <div className="status-breakdown">
            <div className="status-ring" aria-hidden="true">
              <svg viewBox="0 0 100 100">
                <circle className="ring-track" cx="50" cy="50" r="41" />
                {statusSegments
                  .filter((segment) => segment.length > 0)
                  .map((segment) => (
                    <circle
                      key={segment.value}
                      data-status={segment.value}
                      cx="50"
                      cy="50"
                      r="41"
                      pathLength="100"
                      strokeDasharray={
                        segment.length + " " + (100 - segment.length)
                      }
                      strokeDashoffset={-segment.start}
                      transform="rotate(-90 50 50)"
                    />
                  ))}
              </svg>
              <div>
                <strong>{total ?? "—"}</strong>
                <small>{t("İş Emirleri")}</small>
              </div>
            </div>
            <div>
              {states.map((s, i) => (
                <div className="bar-item" key={s.value}>
                  <span>{s.label}</span>
                  <b>{counts[i] ?? "—"}</b>
                  <div className="bar-track">
                    <i
                      data-status={s.value}
                      style={{
                        width: (100 * (counts[i] ?? 0)) / (total || 1) + "%",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
        <Card
          title={
            <>
              <BarChartOutlined /> {t("Haftalık vardiya dağılımı")}
            </>
          }
          extra={<Link to="/shifts">{t("Takvim")}</Link>}
        >
          <p className="chart-range">
            {start.locale(language).format("D MMM")} –{" "}
            {start.add(6, "day").locale(language).format("D MMM YYYY")}
          </p>
          {shifts.isPending ? (
            <Spin />
          ) : (
            <div className="day-chart">
              {daily.map((d) => (
                <div key={d.label}>
                  <strong>{d.value ?? "—"}</strong>
                  <i style={{ height: (100 * (d.value ?? 0)) / max + "px" }} />
                  <small>{d.label}</small>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card
          title={
            <>
              <ApartmentOutlined /> {t("Organizasyon")}
            </>
          }
        >
          <div className="org-counts">
            {[
              {
                label: t("Aktif ekipler"),
                n: activeTeams.data?.total,
                all: teams.data?.total,
              },
              {
                label: t("Aktif personel"),
                n: activePeople.data?.total,
                all: people.data?.total,
              },
            ].map(({ label, n, all }) => (
              <div key={label}>
                <span>{label}</span>
                <strong>
                  {n ?? "—"} / {all ?? "—"}
                </strong>
                {n !== undefined && all !== undefined && (
                  <Progress
                    percent={all ? Math.round((n / all) * 100) : 0}
                    showInfo={false}
                    strokeColor="var(--accent)"
                    aria-label={label}
                  />
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}
