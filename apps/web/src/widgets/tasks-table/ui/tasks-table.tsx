"use client";

import Link from "next/link";
import type { Route } from "next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { TaskDto, TaskPriority, TaskStatus, UserSummaryDto } from "@tracker/types";
import { Badge, Button, Select } from "@tracker/ui";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { priorityLabels, priorityTone, statusLabels, statusOrder, statusTone } from "@/lib/task-meta";
import { formatRelativeDate } from "@/shared/lib/utils/date";
import { CommentIcon, UserIcon } from "@/shared/ui/tracker-icons";
import { taskKey } from "@/widgets/workspace-shell/lib/task-utils";
import { isTaskStale } from "@/widgets/workspace-shell/lib/workspace-insights";
import { EmptyState } from "@/widgets/workspace-shell/ui/empty-state";

function getNextStatus(status: TaskStatus): TaskStatus | null {
  const currentIndex = statusOrder.indexOf(status);
  return statusOrder[currentIndex + 1] ?? null;
}

export function TasksTable({ tasks, users }: { tasks: TaskDto[]; users: UserSummaryDto[] }) {
  const queryClient = useQueryClient();
  const updateMutation = useMutation({
    mutationFn: ({ task, input }: { task: TaskDto; input: Partial<{ status: TaskStatus; priority: TaskPriority; assigneeId: string | null }> }) =>
      apiClient.updateTask(task.id, input),
    onSuccess: async (task) => {
      await queryClient.invalidateQueries({ queryKey: ["tasks", task.projectId] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.task(task.id) });
    },
  });

  const updateTask = (task: TaskDto, input: Partial<{ status: TaskStatus; priority: TaskPriority; assigneeId: string | null }>) => {
    updateMutation.mutate({ task, input });
  };

  if (tasks.length === 0) {
    return <EmptyState title="Задач не найдено" description="Попробуйте сбросить фильтры, переключить view или создать новую задачу." />;
  }

  return (
    <section className="tracker-panel overflow-hidden rounded-xl">
      <div className="border-b border-black/[0.08] bg-[#f8fafc] px-4 py-2.5">
        <div className="grid gap-3 text-xs font-semibold uppercase text-text/38 xl:grid-cols-[112px_minmax(0,1.5fr)_180px_180px_150px_132px]">
          <span>Задача</span>
          <span>Контекст</span>
          <span>Исполнитель</span>
          <span>Сигналы</span>
          <span>Действие</span>
          <span>Обновлено</span>
        </div>
      </div>

      <div className="divide-y divide-black/[0.08]">
        {tasks.map((task) => {
          const stale = isTaskStale(task);
          const nextStatus = getNextStatus(task.status);

          return (
            <article
              key={task.id}
              className="grid gap-3 px-4 py-3 transition hover:bg-[#f8fafc] xl:grid-cols-[112px_minmax(0,1.5fr)_180px_180px_150px_132px] xl:items-center"
            >
              <div>
                <p className="font-mono text-xs font-bold uppercase text-text/40">{taskKey(task)}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge tone={statusTone[task.status]}>{statusLabels[task.status]}</Badge>
                  <Badge tone={priorityTone[task.priority]}>{priorityLabels[task.priority]}</Badge>
                </div>
              </div>

              <div className="min-w-0">
                <Link href={`/tasks/${task.id}` as Route} className="truncate text-sm font-semibold text-text hover:text-accent">
                  {task.title}
                </Link>
                <p className="mt-1 line-clamp-1 text-sm text-text/50">{task.description || "Описание не заполнено"}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-text/44">
                  <span>Создал {task.creator.name}</span>
                  <span className="inline-flex items-center gap-1.5">
                    <CommentIcon size={14} />
                    {task.commentsCount}
                  </span>
                </div>
              </div>

              <div className="grid gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#1f2937] text-[11px] font-bold text-white">
                  {(task.assignee?.name ?? "UN")
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((part) => part[0]?.toUpperCase() ?? "")
                    .join("")}
                </div>
                <Select
                  aria-label={`Исполнитель задачи ${task.title}`}
                  value={task.assignee?.id ?? ""}
                  disabled={updateMutation.isPending}
                  onChange={(event) => updateTask(task, { assigneeId: event.target.value || null })}
                  className="py-1.5 text-xs"
                >
                  <option value="">Не назначен</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid gap-2">
                <Select
                  aria-label={`Статус задачи ${task.title}`}
                  value={task.status}
                  disabled={updateMutation.isPending}
                  onChange={(event) => updateTask(task, { status: event.target.value as TaskStatus })}
                  className="py-1.5 text-xs"
                >
                  {statusOrder.map((status) => (
                    <option key={status} value={status}>
                      {statusLabels[status]}
                    </option>
                  ))}
                </Select>
                <Select
                  aria-label={`Приоритет задачи ${task.title}`}
                  value={task.priority}
                  disabled={updateMutation.isPending}
                  onChange={(event) => updateTask(task, { priority: event.target.value as TaskPriority })}
                  className="py-1.5 text-xs"
                >
                  {Object.entries(priorityLabels).map(([priority, label]) => (
                    <option key={priority} value={priority}>
                      {label}
                    </option>
                  ))}
                </Select>
                <div className="flex flex-wrap gap-1">
                  {stale ? <Badge tone="danger">Нужен сдвиг</Badge> : null}
                  {task.status === "REVIEW" ? <Badge tone="warning">Ждёт решения</Badge> : null}
                  {!task.assignee ? <Badge tone="neutral">Новый owner</Badge> : null}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {nextStatus ? (
                  <Button
                    type="button"
                    variant={nextStatus === "DONE" ? "primary" : "secondary"}
                    disabled={updateMutation.isPending}
                    onClick={() => updateTask(task, { status: nextStatus })}
                    className="px-3 py-1.5 text-xs"
                  >
                    {nextStatus === "IN_PROGRESS" ? "Взять в работу" : null}
                    {nextStatus === "REVIEW" ? "На ревью" : null}
                    {nextStatus === "DONE" ? "Закрыть" : null}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={updateMutation.isPending}
                    onClick={() => updateTask(task, { status: "TODO" })}
                    className="px-3 py-1.5 text-xs"
                  >
                    Переоткрыть
                  </Button>
                )}
                <Link
                  href={`/tasks/${task.id}` as Route}
                  className="inline-flex items-center justify-center rounded-lg border border-black/[0.08] bg-white px-3 py-1.5 text-xs font-semibold transition hover:bg-[#f8fafc]"
                >
                  Открыть
                </Link>
              </div>

              <div className="flex items-center gap-2 text-sm text-text/48">
                <UserIcon size={16} />
                <span>{formatRelativeDate(task.updatedAt)}</span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
