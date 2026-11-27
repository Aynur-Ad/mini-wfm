import { Fragment, useState } from "react";
import { Empty, Segmented } from "antd";
import {
  CalendarOutlined,
  UnorderedListOutlined,
  TeamOutlined,
  DownOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import type { Shift } from "../api/shifts";
import type { WorkforceUser } from "../types";
import { useLanguage, useTranslation } from "../i18n/language";

function overlap(start: number, end: number, from: number, to: number) {
  return Math.max(0, Math.min(end, to) - Math.max(start, from));
}
export function ShiftWeekBoard({
  days,
  people,
  shifts,
  view,
  setView,
}: {
  days: Dayjs[];
  people: WorkforceUser[];
  shifts: Shift[];
  view: "week" | "agenda";
  setView: (value: "week" | "agenda") => void;
}) {
  const t = useTranslation(),
    language = useLanguage();
  const [collapsed, setCollapsed] = useState<Set<number>>(() => new Set());
  const from = days[0].valueOf(),
    to = days[6].add(1, "day").valueOf();
  const groups = new Map<number, { name: string; members: WorkforceUser[] }>();
  const ids = new Set(people.map((p) => p.id));
  const entries = shifts
    .filter((s) => ids.has(s.workforceUserId))
    .map((s) => ({
      ...s,
      start: Date.parse(s.startAt),
      end: Date.parse(s.endAt),
    }));
  const perPerson = new Map<number, typeof entries>();
  for (const s of entries) {
    const rows = perPerson.get(s.workforceUserId) ?? [];
    rows.push(s);
    perPerson.set(s.workforceUserId, rows);
  }
  for (const p of people) {
    const key = p.teamId ?? 0;
    const group = groups.get(key) ?? {
      name: p.team?.name ?? t("Atanmamış"),
      members: [],
    };
    group.members.push(p);
    groups.set(key, group);
  }
  const formatHours = (ms: number) =>
    t("{n} sa", {
      n: new Intl.NumberFormat(language, { maximumFractionDigits: 2 }).format(
        ms / 3600000,
      ),
    });
  const daily = days.map((day) => {
    const a = day.valueOf(),
      b = day.add(1, "day").valueOf();
    return {
      day,
      a,
      b,
      rows: entries.filter((s) => overlap(s.start, s.end, a, b) > 0),
    };
  });
  const times = (start: number, end: number, a: number, b: number) =>
    (start < a ? "00:00" : dayjs(start).format("HH:mm")) +
    " – " +
    (end >= b ? "24:00" : dayjs(end).format("HH:mm"));
  function toggle(id: number) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  return (
    <>
      <div className="board-heading">
        <div className="board-totals">
          <span>
            <b>{entries.length}</b> {t("Vardiya")}
          </span>
          <span>
            <b>
              {formatHours(
                entries.reduce(
                  (sum, s) => sum + overlap(s.start, s.end, from, to),
                  0,
                ),
              )}
            </b>{" "}
            {t("Planlanan süre")}
          </span>
        </div>
        <Segmented
          aria-label={t("Takvim görünümü")}
          value={view}
          onChange={setView}
          options={[
            { value: "week", label: t("Hafta"), icon: <CalendarOutlined /> },
            {
              value: "agenda",
              label: t("Ajanda"),
              icon: <UnorderedListOutlined />,
            },
          ]}
        />
      </div>
      {view === "agenda" ? (
        <div className="agenda-days">
          {daily
            .filter((d) => d.rows.length)
            .map(({ day, a, b, rows }) => (
              <section key={a} className="agenda-day">
                <header>
                  <time>{day.format("DD")}</time>
                  <div>
                    <strong>{day.format("dddd")}</strong>
                    <small>{day.format("MMMM YYYY")}</small>
                  </div>
                </header>
                <ul>
                  {rows.map((s) => (
                    <li key={s.id}>
                      <b>{times(s.start, s.end, a, b)}</b>
                      <div>
                        <strong>
                          {s.workforceUser.firstName} {s.workforceUser.lastName}
                        </strong>
                        <small>
                          {s.workforceUser.team?.name ?? t("Atanmamış")}
                          {s.note && " · " + s.note}
                        </small>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          {!entries.length && (
            <Empty description={t("Seçili haftada vardiya yok")} />
          )}
        </div>
      ) : (
        <div className="calendar-scroll">
          <table className="shift-grid">
            <thead>
              <tr>
                <th>{t("Personel")}</th>
                {daily.map(({ day, a, rows }) => (
                  <th
                    key={a}
                    className={day.isSame(dayjs(), "day") ? "is-today" : ""}
                  >
                    <small>{day.format("ddd")}</small>
                    <b>{day.format("D MMM")}</b>
                    <span className="day-load">
                      {t("{n} vardiya", { n: rows.length })}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from(groups, ([id, group]) => (
                <Fragment key={id}>
                  <tr className="team-band">
                    <th colSpan={8}>
                      <button
                        type="button"
                        onClick={() => toggle(id)}
                        aria-expanded={!collapsed.has(id)}
                      >
                        <DownOutlined />
                        <TeamOutlined />
                        {group.name}
                        <span>{group.members.length}</span>
                      </button>
                    </th>
                  </tr>
                  {!collapsed.has(id) &&
                    group.members.map((p) => {
                      const rows = perPerson.get(p.id) ?? [];
                      return (
                        <tr key={p.id}>
                          <th scope="row">
                            {p.firstName} {p.lastName}
                            <small>
                              {formatHours(
                                rows.reduce(
                                  (sum, s) =>
                                    sum + overlap(s.start, s.end, from, to),
                                  0,
                                ),
                              )}
                            </small>
                          </th>
                          {daily.map(({ a, b, day }) => (
                            <td
                              key={a}
                              className={
                                day.isSame(dayjs(), "day") ? "today-cell" : ""
                              }
                            >
                              {rows
                                .filter(
                                  (s) => overlap(s.start, s.end, a, b) > 0,
                                )
                                .map((s) => (
                                  <div
                                    key={s.id}
                                    className="shift-chip"
                                    title={
                                      dayjs(s.start).format("DD.MM HH:mm") +
                                      " – " +
                                      dayjs(s.end).format("DD.MM HH:mm")
                                    }
                                  >
                                    <b>{times(s.start, s.end, a, b)}</b>
                                    {s.note && <span>{s.note}</span>}
                                  </div>
                                ))}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                </Fragment>
              ))}
            </tbody>
          </table>
          {!people.length && <Empty description={t("Personel bulunamadı")} />}
        </div>
      )}
    </>
  );
}
