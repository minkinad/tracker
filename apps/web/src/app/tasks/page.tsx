"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Badge, Button } from "@tracker/ui";
import { BoardFilter } from "@/features/board-filter/ui/board-filter";
import { TaskCreate } from "@/features/task-create/ui/task-create";
import { TaskViewBar } from "@/features/task-view/ui/task-view-bar";
import { apiClient } from "@/lib/api-client";
import { priorityLabels, priorityTone, statusLabels, statusTone } from "@/lib/task-meta";
import { BoardIcon, PlusIcon, SparkIcon, UserIcon } from "@/shared/ui/tracker-icons";
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
    <article className="tracker-panel rounded-xl p-4">
      <p className="text-xs font-semibold uppercase text-text/38">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-text">{value}</p>
      <p className="mt-1 text-sm leading-5 text-text/54">{hint}</p>
    </article>
  );
}

function ProjectStarter({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async () => {
      const templates = [
        {
          title: "Разобрать входящие задачи",
          description: "Соберите новые запросы, назначьте владельцев и переведите готовые элементы в работу.",
          priority: "HIGH",
        },
        {
          title: "Описать критерии готовности",
          description: "Добавьте ожидаемый результат, ограничения и ссылки, чтобы задачу можно было принять без уточнений.",
          priority: "MEDIUM",
        },
        {
          title: "Проверить задачу на ревью",
          description: "Пример review-очереди: задача ждёт решения или подтверждения результата.",
          status: "REVIEW",
          priority: "MEDIUM",
        },
        {
          title: "Закрыть первый результат",
          description: "Пример закрытой задачи для проверки аналитики и прогресса проекта.",
          status: "DONE",
          priority: "LOW",
        },
      ];

      await Promise.all(templates.map((task) => apiClient.createTask(projectId, task)));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
    },
  });

  return (
    <section className="tracker-panel rounded-xl p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-text">Проект пустой</p>
          <p className="mt-1 text-sm text-text/56">Создайте первую задачу вручную или добавьте стартовый рабочий набор.</p>
        </div>
        <Button type="button" variant="primary" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
          <PlusIcon className="mr-2" size={16} />
          {mutation.isPending ? "Создаю..." : "Добавить стартовые задачи"}
        </Button>
      </div>
    </section>
  );
}

export default function TasksPage() {
  const [scope, setScope] = useState<TaskScope>("all");

  return (
    <WorkspacePage
      title="Задачи"
      description="Рабочие очереди, фильтры и сохранённые views поверх текущего проекта."
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

            <section className="tracker-panel rounded-xl p-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <p className="text-sm font-semibold text-text">Рабочий поток</p>
                  <p className="mt-1 text-sm text-text/56">
                    Triage: {attention.unassigned} · В работе: {countByStatus(scopedTasks, "IN_PROGRESS")} · Ревью: {attention.review} · Закрыто:{" "}
                    {countByStatus(scopedTasks, "DONE")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={attention.unassigned > 0 ? "warning" : "success"}>{attention.unassigned} без owner</Badge>
                  <Badge tone={attention.stale > 0 ? "danger" : "neutral"}>{attention.stale} застряли</Badge>
                  <a
                    href="/boards"
                    className="inline-flex items-center justify-center rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-sm font-semibold transition hover:bg-[#f8fafc]"
                  >
                    <BoardIcon className="mr-2" size={16} />
                    Доска
                  </a>
                </div>
              </div>
            </section>

            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
            {data.selectedProjectId && data.tasks.length === 0 ? <ProjectStarter projectId={data.selectedProjectId} /> : null}

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <section className="space-y-3">
                <div className="tracker-panel flex flex-wrap items-center gap-2 rounded-xl p-2">
                  {scopes.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setScope(item.id)}
                      className={clsx(
                        "rounded-lg px-3 py-2 text-sm font-semibold transition",
                        scope === item.id ? "bg-[#1f2937] text-white shadow-sm" : "text-text/56 hover:bg-[#f8fafc] hover:text-text",
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <TasksTable tasks={scopedTasks} users={data.members} />
              </section>

              <aside className="space-y-4">
                <section className="rounded-xl border border-black/[0.08] bg-[#1f2937] p-4 text-white shadow-sm">
                  <p className="text-xs font-semibold uppercase text-white/46">Сводка очередей</p>
                  <div className="mt-3 grid gap-2">
                    <div className="rounded-lg bg-white/8 px-3 py-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-white/70">На ревью</span>
                        <span className="text-lg font-semibold">{attention.review}</span>
                      </div>
                    </div>
                    <div className="rounded-lg bg-white/8 px-3 py-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-white/70">Без исполнителя</span>
                        <span className="text-lg font-semibold">{attention.unassigned}</span>
                      </div>
                    </div>
                    <div className="rounded-lg bg-white/8 px-3 py-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-white/70">Застрявшие</span>
                        <span className="text-lg font-semibold">{attention.stale}</span>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="tracker-panel rounded-xl p-4">
                  <p className="text-xs font-semibold uppercase text-text/38">Текущий фокус</p>
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

                <section className="tracker-panel rounded-xl p-4">
                  <div className="flex items-center gap-2">
                    <SparkIcon size={18} className="text-[#20437a]" />
                    <p className="text-sm font-semibold text-text">Нагрузка команды</p>
                  </div>
                  <div className="mt-4 space-y-3">
                    {workload.length === 0 ? (
                      <p className="text-sm leading-6 text-text/54">В текущем проекте ещё нет исполнителей с назначенными задачами.</p>
                    ) : (
                      workload.map(({ member, inFlight, total, urgent }) => (
                        <div key={member.id} className="rounded-lg border border-black/[0.08] px-3 py-2.5">
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
