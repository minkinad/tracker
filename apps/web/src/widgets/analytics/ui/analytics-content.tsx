"use client";

import { Badge } from "@tracker/ui";
import { priorityLabels, priorityTone, statusLabels, statusTone } from "@/lib/task-meta";
import { countByStatus, getCompletion } from "@/widgets/workspace-shell/lib/task-utils";
import {
  getAttentionCounts,
  getDeliveryStats,
  getPriorityMix,
  getProjectPulse,
  getStatusBreakdown,
  getTeamWorkload,
  getTimeline,
} from "@/widgets/workspace-shell/lib/workspace-insights";
import type { WorkspaceData } from "@/widgets/workspace-shell/model/types";

export function AnalyticsContent({ data }: { data: WorkspaceData }) {
  const completion = getCompletion(data.tasks);
  const pulse = getProjectPulse(data.tasks);
  const attention = getAttentionCounts(data.tasks);
  const delivery = getDeliveryStats(data.tasks);
  const statusBreakdown = getStatusBreakdown(data.tasks);
  const statusMax = Math.max(...statusBreakdown.map((item) => item.count), 1);
  const assigneeGroups = getTeamWorkload(data.tasks, data.members);
  const assigneeMax = Math.max(...assigneeGroups.map((item) => item.inFlight), 1);
  const timeline = getTimeline(data.tasks, 7);
  const timelineMax = Math.max(...timeline.map((point) => Math.max(point.created, point.closed, point.touched)), 1);
  const priorityMix = getPriorityMix(data.tasks);
  const priorityMax = Math.max(...priorityMix.map((item) => item.count), 1);

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[30px] border border-black/[0.08] bg-[#111827] px-6 py-6 text-white shadow-[0_18px_38px_rgba(15,23,42,0.16)]">
          <p className="text-xs uppercase tracking-[0.18em] text-white/46">Пульс проекта</p>
          <p className="mt-2 text-5xl font-semibold tracking-[-0.06em]">{pulse.score}</p>
          <p className="mt-3 text-sm leading-6 text-white/72">{pulse.summary}</p>
        </div>
        <div className="rounded-[30px] border border-black/[0.08] bg-white/82 p-6 shadow-[0_18px_38px_rgba(15,23,42,0.05)]">
          <p className="text-xs uppercase tracking-[0.18em] text-text/40">Готовность</p>
          <p className="mt-2 text-5xl font-semibold tracking-[-0.06em] text-text">{completion}%</p>
          <p className="mt-3 text-sm leading-6 text-text/56">Доля задач в статусе Done внутри текущего проекта.</p>
        </div>
        <div className="rounded-[30px] border border-black/[0.08] bg-white/82 p-6 shadow-[0_18px_38px_rgba(15,23,42,0.05)]">
          <p className="text-xs uppercase tracking-[0.18em] text-text/40">Темп 7д</p>
          <p className="mt-2 text-5xl font-semibold tracking-[-0.06em] text-text">{delivery.closed}</p>
          <p className="mt-3 text-sm leading-6 text-text/56">Закрытых задач за неделю при {delivery.created} новых элементах.</p>
        </div>
        <div className="rounded-[30px] border border-black/[0.08] bg-white/82 p-6 shadow-[0_18px_38px_rgba(15,23,42,0.05)]">
          <p className="text-xs uppercase tracking-[0.18em] text-text/40">Риски</p>
          <p className="mt-2 text-5xl font-semibold tracking-[-0.06em] text-text">{attention.stale + attention.unassigned}</p>
          <p className="mt-3 text-sm leading-6 text-text/56">Застрявшие и неразобранные задачи, требующие внимания команды.</p>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_360px]">
        <section className="rounded-[30px] border border-black/[0.08] bg-white/82 p-6 shadow-[0_18px_38px_rgba(15,23,42,0.05)]">
          <p className="text-xs uppercase tracking-[0.18em] text-text/40">Workflow health</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-text">Распределение по статусам</h2>
          <div className="mt-6 space-y-5">
            {statusBreakdown.map((item) => (
              <div key={item.status}>
                <div className="flex items-center justify-between gap-4">
                  <Badge tone={statusTone[item.status]}>{statusLabels[item.status]}</Badge>
                  <span className="text-sm font-semibold text-text">{item.count}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/[0.06]">
                  <div className="h-full rounded-full bg-[#111827]" style={{ width: `${Math.max((item.count / statusMax) * 100, item.count ? 8 : 0)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-[30px] border border-black/[0.08] bg-white/82 p-6 shadow-[0_18px_38px_rgba(15,23,42,0.05)]">
            <p className="text-lg font-semibold text-text">Очереди</p>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-[22px] bg-[#f4f6f8] px-4 py-3">
                <span className="text-sm text-text/56">В работе</span>
                <span className="text-sm font-bold text-text">{countByStatus(data.tasks, "IN_PROGRESS")}</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-[22px] bg-[#f4f6f8] px-4 py-3">
                <span className="text-sm text-text/56">На ревью</span>
                <span className="text-sm font-bold text-text">{attention.review}</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-[22px] bg-[#f4f6f8] px-4 py-3">
                <span className="text-sm text-text/56">Без исполнителя</span>
                <span className="text-sm font-bold text-text">{attention.unassigned}</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-[22px] bg-[#f4f6f8] px-4 py-3">
                <span className="text-sm text-text/56">Застрявшие</span>
                <span className="text-sm font-bold text-text">{attention.stale}</span>
              </div>
            </div>
          </section>

          <section className="rounded-[30px] border border-black/[0.08] bg-white/82 p-6 shadow-[0_18px_38px_rgba(15,23,42,0.05)]">
            <p className="text-lg font-semibold text-text">Приоритеты</p>
            <div className="mt-4 space-y-4">
              {priorityMix.map((item) => (
                <div key={item.priority}>
                  <div className="flex items-center justify-between gap-3">
                    <Badge tone={priorityTone[item.priority]}>{priorityLabels[item.priority]}</Badge>
                    <span className="text-sm font-semibold text-text">{item.count}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/[0.06]">
                    <div className="h-full rounded-full bg-[#111827]" style={{ width: `${Math.max((item.count / priorityMax) * 100, item.count ? 8 : 0)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
        <section className="rounded-[30px] border border-black/[0.08] bg-white/82 p-6 shadow-[0_18px_38px_rgba(15,23,42,0.05)]">
          <p className="text-xs uppercase tracking-[0.18em] text-text/40">Темп изменений</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-text">Создание, движение и закрытие</h2>
          <div className="mt-8 grid grid-cols-7 gap-3">
            {timeline.map((point) => (
              <div key={point.label} className="text-center">
                <div className="flex h-40 items-end justify-center gap-1">
                  <span className="w-3 rounded-full bg-[#d7dee8]" style={{ height: `${Math.max((point.created / timelineMax) * 100, point.created ? 8 : 0)}%` }} />
                  <span className="w-3 rounded-full bg-[#9bb5ff]" style={{ height: `${Math.max((point.touched / timelineMax) * 100, point.touched ? 8 : 0)}%` }} />
                  <span className="w-3 rounded-full bg-[#111827]" style={{ height: `${Math.max((point.closed / timelineMax) * 100, point.closed ? 8 : 0)}%` }} />
                </div>
                <p className="mt-2 text-[11px] font-semibold text-text/42">{point.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-text/44">
            <span>Светлый: создано</span>
            <span>Синий: обновлено</span>
            <span>Тёмный: закрыто</span>
          </div>
        </section>

        <section className="rounded-[30px] border border-black/[0.08] bg-white/82 p-6 shadow-[0_18px_38px_rgba(15,23,42,0.05)]">
          <p className="text-xs uppercase tracking-[0.18em] text-text/40">Нагрузка команды</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-text">Нагрузка по исполнителям</h2>
          <div className="mt-6 space-y-4">
            {assigneeGroups.length === 0 ? (
              <p className="text-sm leading-6 text-text/52">Добавьте участников в организацию, чтобы видеть распределение задач.</p>
            ) : (
              assigneeGroups.map(({ member, inFlight, total, urgent }) => (
                <div key={member.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text">{member.name}</p>
                      <p className="mt-1 text-xs text-text/46">
                        {inFlight} в работе · {total} всего · {urgent} срочных
                      </p>
                    </div>
                    <span className="text-sm font-bold text-text">{inFlight}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/[0.06]">
                    <div className="h-full rounded-full bg-[#111827]" style={{ width: `${Math.max((inFlight / assigneeMax) * 100, inFlight ? 8 : 0)}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
