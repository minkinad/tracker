"use client";

import Link from "next/link";
import type { Route } from "next";
import { Badge, Button } from "@tracker/ui";
import { priorityLabels, priorityTone, statusLabels, statusTone } from "@/lib/task-meta";
import { formatRelativeDate } from "@/shared/lib/utils/date";
import { ActivityIcon, CheckCircleIcon, PlusIcon, QueueIcon, SparkIcon, UserIcon } from "@/shared/ui/tracker-icons";
import { countByStatus, getCompletion, taskKey } from "@/widgets/workspace-shell/lib/task-utils";
import {
  getAttentionCounts,
  getDeliveryStats,
  getPriorityMix,
  getProjectPulse,
  getRecentUpdates,
  getTeamWorkload,
  getTimeline,
} from "@/widgets/workspace-shell/lib/workspace-insights";
import type { WorkspaceData } from "@/widgets/workspace-shell/model/types";
import { EmptyState } from "@/widgets/workspace-shell/ui/empty-state";

function Metric({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <div className="tracker-panel rounded-xl p-4">
      <p className="text-xs font-semibold uppercase text-text/38">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-text">{value}</p>
      <p className="mt-1 text-sm leading-5 text-text/54">{hint}</p>
    </div>
  );
}

export function OverviewContent({ data, onCreateTask }: { data: WorkspaceData; onCreateTask: () => void }) {
  const freshTasks = getRecentUpdates(data.tasks, 5);
  const urgentTasks = data.tasks.filter((task) => task.priority === "URGENT" || task.status === "REVIEW").slice(0, 4);
  const attention = getAttentionCounts(data.tasks);
  const delivery = getDeliveryStats(data.tasks);
  const pulse = getProjectPulse(data.tasks);
  const timeline = getTimeline(data.tasks, 7);
  const timelineMax = Math.max(...timeline.map((point) => Math.max(point.created, point.closed, point.touched)), 1);
  const workload = getTeamWorkload(data.tasks, data.members).slice(0, 4);
  const priorityMix = getPriorityMix(data.tasks);
  const priorityMax = Math.max(...priorityMix.map((item) => item.count), 1);

  return (
    <div className="space-y-5">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Пульс проекта" value={pulse.label} hint={pulse.summary} />
        <Metric label="Открытые очереди" value={data.tasks.length - countByStatus(data.tasks, "DONE")} hint="Все незакрытые задачи текущего проекта." />
        <Metric label="Темп 7д" value={`${delivery.closed}/${delivery.created}`} hint="Закрытые и созданные задачи за последние 7 дней." />
        <Metric label="Готовность" value={`${getCompletion(data.tasks)}%`} hint="Доля задач в статусе Done." />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <div className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase text-text/40">Командный центр</p>
              <h2 className="mt-2 text-xl font-semibold text-text">Что требует внимания</h2>
            </div>
            <Button type="button" variant="primary" onClick={onCreateTask}>
              <PlusIcon className="mr-2" size={16} />
              Новая задача
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <article className="rounded-xl border border-black/[0.08] bg-[#1f2937] p-4 text-white shadow-sm">
              <div className="flex items-center gap-2">
                <QueueIcon size={18} />
                <p className="text-sm font-semibold">Triage</p>
              </div>
              <p className="mt-4 text-3xl font-semibold">{attention.unassigned}</p>
              <p className="mt-2 text-sm leading-6 text-white/72">Без исполнителя. Хорошая точка входа для ежедневного разбора.</p>
            </article>
            <article className="tracker-panel rounded-xl p-4">
              <div className="flex items-center gap-2 text-[#20437a]">
                <SparkIcon size={18} />
                <p className="text-sm font-semibold text-text">Review queue</p>
              </div>
              <p className="mt-4 text-3xl font-semibold text-text">{attention.review}</p>
              <p className="mt-2 text-sm leading-6 text-text/56">Задачи, которые ждут решения, обратной связи или приёмки.</p>
            </article>
            <article className="tracker-panel rounded-xl p-4">
              <div className="flex items-center gap-2 text-[#20437a]">
                <ActivityIcon size={18} />
                <p className="text-sm font-semibold text-text">Застрявшие</p>
              </div>
              <p className="mt-4 text-3xl font-semibold text-text">{attention.stale}</p>
              <p className="mt-2 text-sm leading-6 text-text/56">Задачи без заметного движения, которые могут тормозить delivery.</p>
            </article>
          </div>

          <div className="tracker-panel overflow-hidden rounded-xl">
            <div className="flex items-center justify-between border-b border-black/[0.08] px-5 py-4">
              <div>
                <p className="text-xs uppercase text-text/38">Фокусный backlog</p>
                <h3 className="mt-1 text-lg font-semibold text-text">Критичные и review-задачи</h3>
              </div>
              <Badge tone={attention.urgent > 0 ? "danger" : "success"}>{attention.urgent} критичных</Badge>
            </div>

            {urgentTasks.length === 0 ? (
              <EmptyState title="Критичных задач нет" description="Срочные задачи и ревью будут появляться в этом блоке автоматически." />
            ) : (
              urgentTasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}` as Route}
                className="grid gap-3 border-b border-black/[0.08] px-5 py-3 transition last:border-b-0 hover:bg-[#f8fafc] md:grid-cols-[120px_minmax(0,1fr)_170px]"
                >
                  <span className="font-mono text-xs font-bold uppercase text-text/40">{taskKey(task)}</span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-text">{task.title}</span>
                    <span className="mt-1 block text-sm text-text/50">{task.assignee?.name ?? "Без исполнителя"}</span>
                  </span>
                  <span className="flex items-center gap-2 md:justify-end">
                    <Badge tone={statusTone[task.status]}>{statusLabels[task.status]}</Badge>
                    <Badge tone={priorityTone[task.priority]}>{priorityLabels[task.priority]}</Badge>
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        <aside className="space-y-5">
          <section className="tracker-panel rounded-xl p-4">
            <div className="flex items-center gap-2">
              <CheckCircleIcon size={18} className="text-[#20437a]" />
              <p className="text-sm font-semibold text-text">Темп изменений</p>
            </div>
            <div className="mt-5 grid grid-cols-7 gap-2">
              {timeline.map((point) => (
                <div key={point.label} className="text-center">
                  <div className="flex h-32 items-end justify-center gap-1">
                    <span className="w-2 rounded-full bg-[#d7dee8]" style={{ height: `${Math.max((point.created / timelineMax) * 100, point.created ? 8 : 0)}%` }} />
                    <span className="w-2 rounded-full bg-[#9bb5ff]" style={{ height: `${Math.max((point.touched / timelineMax) * 100, point.touched ? 8 : 0)}%` }} />
                    <span className="w-2 rounded-full bg-[#111827]" style={{ height: `${Math.max((point.closed / timelineMax) * 100, point.closed ? 8 : 0)}%` }} />
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

          <section className="tracker-panel rounded-xl p-4">
            <div className="flex items-center gap-2">
              <UserIcon size={18} className="text-[#20437a]" />
              <p className="text-sm font-semibold text-text">Нагрузка команды</p>
            </div>
            <div className="mt-4 space-y-3">
              {workload.length === 0 ? (
                <p className="text-sm leading-6 text-text/58">Добавьте участников или назначьте задачи, чтобы увидеть распределение нагрузки.</p>
              ) : (
                workload.map(({ member, inFlight, total, urgent }) => (
                  <div key={member.id} className="rounded-lg border border-black/[0.08] px-3 py-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-text">{member.name}</p>
                        <p className="mt-1 text-xs text-text/44">
                          {inFlight} в работе · {total} всего
                        </p>
                      </div>
                      <Badge tone={urgent > 0 ? "danger" : "neutral"}>{urgent} срочных</Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="tracker-panel rounded-xl p-4">
            <p className="text-sm font-semibold text-text">Приоритеты</p>
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

          <section className="tracker-panel overflow-hidden rounded-xl">
            <div className="border-b border-black/[0.08] px-5 py-4">
              <p className="text-sm font-semibold text-text">Последние обновления</p>
            </div>
            {freshTasks.length === 0 ? (
              <p className="px-5 py-5 text-sm leading-6 text-text/58">Пока нет задач для отображения.</p>
            ) : (
              freshTasks.map((task) => (
                <Link key={task.id} href={`/tasks/${task.id}` as Route} className="block border-b border-black/[0.08] px-5 py-4 transition last:border-b-0 hover:bg-black/[0.025]">
                  <p className="line-clamp-1 text-sm font-semibold text-text">{task.title}</p>
                  <p className="mt-1 text-xs text-text/44">Обновлено {formatRelativeDate(task.updatedAt)}</p>
                </Link>
              ))
            )}
          </section>
        </aside>
      </section>
    </div>
  );
}
