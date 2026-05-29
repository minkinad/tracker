"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { BoardFilter } from "@/features/board-filter/ui/board-filter";
import { TaskCreate } from "@/features/task-create/ui/task-create";
import { TaskViewBar } from "@/features/task-view/ui/task-view-bar";
import { KanbanBoard } from "@/widgets/kanban-board/ui/kanban-board";
import { countByStatus } from "@/widgets/workspace-shell/lib/task-utils";
import { getAttentionCounts, getProjectPulse } from "@/widgets/workspace-shell/lib/workspace-insights";
import { WorkspacePage } from "@/widgets/workspace-shell/ui/workspace-shell";

function BoardMetric({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <article className="rounded-[26px] border border-black/[0.08] bg-white/82 p-5 shadow-[0_16px_34px_rgba(15,23,42,0.05)]">
      <p className="text-xs uppercase tracking-[0.16em] text-text/38">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-text">{value}</p>
      <p className="mt-2 text-sm leading-6 text-text/54">{hint}</p>
    </article>
  );
}

export default function BoardsPage() {
  const router = useRouter();

  return (
    <WorkspacePage
      title="Доски"
      description="Канбан-режим с Plane-подобным обзором: сохранённые views, triage-сигналы и плотная status-driven работа."
    >
      {(data) => {
        const attention = getAttentionCounts(data.tasks);
        const pulse = getProjectPulse(data.tasks);

        return (
          <div className="space-y-5">
            <TaskViewBar userId={data.userId} />

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <BoardMetric label="Пульс проекта" value={pulse.label} hint={pulse.summary} />
              <BoardMetric label="Backlog" value={countByStatus(data.tasks, "TODO")} hint="Новые задачи, ожидающие triage или старта." />
              <BoardMetric label="In progress" value={countByStatus(data.tasks, "IN_PROGRESS")} hint="Активная работа команды." />
              <BoardMetric label="Review queue" value={attention.review} hint="Элементы, которые ждут решения или приёмки." />
            </section>

            <BoardFilter users={data.members} />
            {data.selectedProjectId ? <TaskCreate projectId={data.selectedProjectId} users={data.members} /> : null}
            <KanbanBoard tasks={data.tasks} onOpenTask={(taskId) => router.push(`/tasks/${taskId}` as Route)} />
          </div>
        );
      }}
    </WorkspacePage>
  );
}
