"use client";

import Link from "next/link";
import type { Route } from "next";
import type { TaskDto } from "@tracker/types";
import { Badge } from "@tracker/ui";
import { priorityLabels, priorityTone, statusLabels, statusTone } from "@/lib/task-meta";
import { formatRelativeDate } from "@/shared/lib/utils/date";
import { CommentIcon, UserIcon } from "@/shared/ui/tracker-icons";
import { taskKey } from "@/widgets/workspace-shell/lib/task-utils";
import { isTaskStale } from "@/widgets/workspace-shell/lib/workspace-insights";
import { EmptyState } from "@/widgets/workspace-shell/ui/empty-state";

export function TasksTable({ tasks }: { tasks: TaskDto[] }) {
  if (tasks.length === 0) {
    return <EmptyState title="Задач не найдено" description="Попробуйте сбросить фильтры, переключить view или создать новую задачу." />;
  }

  return (
    <section className="overflow-hidden rounded-[30px] border border-black/[0.08] bg-white/82 shadow-[0_18px_38px_rgba(15,23,42,0.05)] backdrop-blur-sm">
      <div className="border-b border-black/[0.08] bg-[#f4f6f8] px-5 py-4">
        <div className="grid gap-4 text-xs font-bold uppercase tracking-[0.16em] text-text/38 xl:grid-cols-[120px_minmax(0,1.5fr)_170px_160px_140px]">
          <span>Задача</span>
          <span>Контекст</span>
          <span>Исполнитель</span>
          <span>Сигналы</span>
          <span>Обновлено</span>
        </div>
      </div>

      <div className="divide-y divide-black/[0.08]">
        {tasks.map((task) => {
          const stale = isTaskStale(task);

          return (
            <Link
              key={task.id}
              href={`/tasks/${task.id}` as Route}
              className="grid gap-4 px-5 py-4 transition hover:bg-black/[0.025] xl:grid-cols-[120px_minmax(0,1.5fr)_170px_160px_140px] xl:items-center"
            >
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-text/40">{taskKey(task)}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge tone={statusTone[task.status]}>{statusLabels[task.status]}</Badge>
                  <Badge tone={priorityTone[task.priority]}>{priorityLabels[task.priority]}</Badge>
                </div>
              </div>

              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-text">{task.title}</p>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-text/50">{task.description || "Описание не заполнено"}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-text/44">
                  <span>Создал {task.creator.name}</span>
                  <span className="inline-flex items-center gap-1.5">
                    <CommentIcon size={14} />
                    {task.commentsCount}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#111827] text-xs font-bold text-white">
                  {(task.assignee?.name ?? "UN")
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((part) => part[0]?.toUpperCase() ?? "")
                    .join("")}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text">{task.assignee?.name ?? "Не назначен"}</p>
                  <p className="mt-1 text-xs text-text/44">Исполнитель</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {stale ? <Badge tone="danger">Нужен сдвиг</Badge> : null}
                {task.status === "REVIEW" ? <Badge tone="warning">Ждёт решения</Badge> : null}
                {!task.assignee ? <Badge tone="neutral">Новый owner</Badge> : null}
              </div>

              <div className="flex items-center gap-2 text-sm text-text/48">
                <UserIcon size={16} />
                <span>{formatRelativeDate(task.updatedAt)}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
