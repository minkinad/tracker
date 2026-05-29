"use client";

import { useState } from "react";
import clsx from "clsx";
import { Badge } from "@tracker/ui";
import { BoardFilter } from "@/features/board-filter/ui/board-filter";
import { TaskCreate } from "@/features/task-create/ui/task-create";
import { TaskViewBar } from "@/features/task-view/ui/task-view-bar";
import { priorityLabels, priorityTone, statusLabels, statusTone } from "@/lib/task-meta";
import { SparkIcon, UserIcon } from "@/shared/ui/tracker-icons";
import { TasksTable } from "@/widgets/tasks-table/ui/tasks-table";
import { countByStatus, filterTasksByScope, getCompletion } from "@/widgets/workspace-shell/lib/task-utils";
import { getAttentionCounts, getDeliveryStats, getProjectPulse, getTeamWorkload } from "@/widgets/workspace-shell/lib/workspace-insights";
import { type TaskScope, WorkspacePage } from "@/widgets/workspace-shell/ui/workspace-shell";

const scopes: Array<{ id: TaskScope; label: string }> = [
  { id: "all", label: "Все" },
  { id: "mine", label: "Мои" },
  { id: "unassigned", label: "Без исполнителя" },
  { id: "review", label: "Ревью" },
];

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <article className="rounded-[26px] border border-black/[0.08] bg-white/82 p-5 shadow-[0_16px_34px_rgba(15,23,42,0.05)]">
      <p className="text-xs uppercase tracking-[0.16em] text-text/38">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-text">{value}</p>
      <p className="mt-2 text-sm leading-6 text-text/54">{hint}</p>
    </article>
  );
}

export default function TasksPage() {
  const [scope, setScope] = useState<TaskScope>("all");

  return (
    <WorkspacePage
      title="Задачи"
      description="Plane-подобный control center для triage, очередей, фильтров и сохранённых представлений поверх текущего проекта."
    >
      {(data) => {
        const scopedTasks = filterTasksByScope(data.tasks, scope, data.userId);
        const attention = getAttentionCounts(scopedTasks);
        const delivery = getDeliveryStats(scopedTasks);
        const pulse = getProjectPulse(scopedTasks);
        const workload = getTeamWorkload(scopedTasks, data.members).slice(0, 5);
        const dominantPriority =
          [...scopedTasks]
            .sort((left, right) => {
              const priorityWeight = {
                URGENT: 4,
                HIGH: 3,
                MEDIUM: 2,
                LOW: 1,
              };

              return priorityWeight[right.priority] - priorityWeight[left.priority];
            })
            .at(0)?.priority ?? "MEDIUM";

        return (
          <div className="space-y-5">
            <TaskViewBar userId={data.userId} />

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Пульс проекта" value={pulse.label} hint={pulse.summary} />
              <MetricCard label="Открытые очереди" value={scopedTasks.length - countByStatus(scopedTasks, "DONE")} hint="Все незакрытые задачи в текущем представлении." />
              <MetricCard label="Доля done" value={`${getCompletion(scopedTasks)}%`} hint="Процент закрытия внутри текущей выборки." />
              <MetricCard
                label="Темп 7д"
                value={`${delivery.closed}/${delivery.created}`}
                hint={delivery.closed >= delivery.created ? "Выборка разгружается." : "Новые задачи прибывают быстрее закрытия."}
              />
            </section>

            <BoardFilter users={data.members} />
            {data.selectedProjectId ? <TaskCreate projectId={data.selectedProjectId} users={data.members} /> : null}

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
              <section className="space-y-4">
                <div className="flex flex-wrap items-center gap-2 rounded-[28px] border border-white/70 bg-white/62 p-2 backdrop-blur">
                  {scopes.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setScope(item.id)}
                      className={clsx(
                        "rounded-2xl px-4 py-2.5 text-sm font-semibold transition",
                        scope === item.id ? "bg-[#111827] text-white shadow-sm" : "text-text/56 hover:bg-white hover:text-text",
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <TasksTable tasks={scopedTasks} />
              </section>

              <aside className="space-y-4">
                <section className="rounded-[28px] border border-black/[0.08] bg-[#111827] p-5 text-white shadow-[0_18px_38px_rgba(15,23,42,0.16)]">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/46">Сводка очередей</p>
                  <div className="mt-4 grid gap-3">
                    <div className="rounded-[22px] bg-white/8 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-white/70">На ревью</span>
                        <span className="text-lg font-semibold">{attention.review}</span>
                      </div>
                    </div>
                    <div className="rounded-[22px] bg-white/8 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-white/70">Без исполнителя</span>
                        <span className="text-lg font-semibold">{attention.unassigned}</span>
                      </div>
                    </div>
                    <div className="rounded-[22px] bg-white/8 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-white/70">Застрявшие</span>
                        <span className="text-lg font-semibold">{attention.stale}</span>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-[28px] border border-black/[0.08] bg-white/82 p-5 shadow-[0_16px_34px_rgba(15,23,42,0.05)]">
                  <p className="text-xs uppercase tracking-[0.16em] text-text/38">Текущий фокус</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge tone={statusTone[scope === "review" ? "REVIEW" : "IN_PROGRESS"]}>
                      {scope === "review" ? statusLabels.REVIEW : statusLabels.IN_PROGRESS}
                    </Badge>
                    <Badge tone={priorityTone[dominantPriority]}>{priorityLabels[dominantPriority]}</Badge>
                    <Badge tone={statusTone.DONE}>{countByStatus(scopedTasks, "DONE")} закрыто</Badge>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-text/56">
                    Панель отражает доминирующее состояние текущего view и помогает быстро понять, что сейчас происходит в выборке задач.
                  </p>
                </section>

                <section className="rounded-[28px] border border-black/[0.08] bg-white/82 p-5 shadow-[0_16px_34px_rgba(15,23,42,0.05)]">
                  <div className="flex items-center gap-2">
                    <SparkIcon size={18} className="text-[#20437a]" />
                    <p className="text-sm font-semibold text-text">Нагрузка команды</p>
                  </div>
                  <div className="mt-4 space-y-3">
                    {workload.length === 0 ? (
                      <p className="text-sm leading-6 text-text/54">В текущем проекте ещё нет исполнителей с назначенными задачами.</p>
                    ) : (
                      workload.map(({ member, inFlight, total, urgent }) => (
                        <div key={member.id} className="rounded-[22px] border border-black/[0.08] px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-text">{member.name}</p>
                              <p className="mt-1 text-xs text-text/46">
                                {inFlight} в работе · {total} всего
                              </p>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <UserIcon size={16} className="text-text/36" />
                              <span className={clsx("font-semibold", urgent > 0 ? "text-rose-600" : "text-text")}>{urgent}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </aside>
            </div>
          </div>
        );
      }}
    </WorkspacePage>
  );
}
