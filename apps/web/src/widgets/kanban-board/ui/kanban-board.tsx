"use client";

import { memo } from "react";
import {
  DndContext,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { TaskDto, TaskStatus } from "@tracker/types";
import { Badge } from "@tracker/ui";
import clsx from "clsx";
import { motion } from "framer-motion";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { priorityLabels, priorityTone, statusLabels, statusOrder, statusTone } from "@/lib/task-meta";
import { formatRelativeDate } from "@/shared/lib/utils/date";
import { getInitials } from "@/shared/lib/utils/string";
import { CommentIcon, UserIcon } from "@/shared/ui/tracker-icons";
import { useUiStore } from "@/store/use-ui-store";

const TaskCard = memo(function TaskCard({ task, onOpen }: { task: TaskDto; onOpen: (taskId: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { status: task.status },
  });

  return (
    <motion.article
      layout
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      animate={{ opacity: isDragging ? 0.58 : 1, scale: isDragging ? 1.015 : 1 }}
      transition={{ duration: 0.16 }}
      className={clsx(
        "group border-b border-black/[0.08] py-4 text-left transition",
        isDragging ? "z-20 cursor-grabbing bg-white/70 ring-2 ring-accent/30" : "hover:bg-black/[0.025]",
      )}
    >
      <button
        type="button"
        className="block w-full text-left"
        onClick={() => {
          if (!isDragging) {
            onOpen(task.id);
          }
        }}
        {...listeners}
        {...attributes}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-text/38">
              {task.id.slice(-8).toUpperCase()}
            </p>
            <h3 className="mt-2 line-clamp-2 text-base font-semibold leading-6 text-text">{task.title}</h3>
          </div>
          <Badge tone={priorityTone[task.priority]}>{priorityLabels[task.priority]}</Badge>
        </div>

        <p className="mt-3 line-clamp-3 text-sm leading-6 text-text/56">{task.description || "Описание не заполнено"}</p>

        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#111827] text-[11px] font-bold text-white">
              {getInitials(task.assignee?.name ?? "UN")}
            </div>
            <span className="truncate text-xs font-medium text-text/60">{task.assignee?.name ?? "Не назначен"}</span>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs text-text/44">
            <CommentIcon size={14} />
            {task.commentsCount}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-text/44">
          <span>{formatRelativeDate(task.updatedAt)}</span>
          <span className="inline-flex items-center gap-1.5">
            <UserIcon size={14} />
            {task.creator.name}
          </span>
        </div>
      </button>
    </motion.article>
  );
});

function BoardColumn({
  status,
  tasks,
  onOpen,
  isUpdating,
}: {
  status: TaskStatus;
  tasks: TaskDto[];
  onOpen: (taskId: string) => void;
  isUpdating: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <section
      ref={setNodeRef}
      className={clsx(
        "min-h-[320px] rounded-[28px] border border-black/[0.08] bg-white/82 p-4 shadow-[0_18px_38px_rgba(15,23,42,0.05)] transition xl:min-h-[520px]",
        isOver ? "bg-[#eef4ff] ring-2 ring-[#3f7cf4]/20" : "bg-white/82",
      )}
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <Badge tone={statusTone[status]}>{statusLabels[status]}</Badge>
          <p className="mt-3 text-sm leading-6 text-text/52">
            {status === "TODO" ? "Новые и ожидающие triage" : null}
            {status === "IN_PROGRESS" ? "Активная работа команды" : null}
            {status === "REVIEW" ? "Проверка и приёмка результата" : null}
            {status === "DONE" ? "Закрытые и доставленные задачи" : null}
          </p>
        </div>
        <span className="text-sm font-bold text-text">{tasks.length}</span>
      </header>

      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/[0.08] px-4 py-10 text-center text-sm leading-6 text-text/44">
            Перетащите задачу сюда, чтобы сменить статус.
          </div>
        ) : (
          tasks.map((task) => <TaskCard key={task.id} task={task} onOpen={onOpen} />)
        )}
      </div>

      {isUpdating ? <p className="mt-4 text-center text-xs font-semibold text-accent">Синхронизирую статус...</p> : null}
    </section>
  );
}

export function KanbanBoard({ tasks, onOpenTask }: { tasks: TaskDto[]; onOpenTask: (taskId: string) => void }) {
  const queryClient = useQueryClient();
  const selectedProjectId = useUiStore((state) => state.selectedProjectId);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const mutation = useMutation({
    // Перетаскивание сразу сохраняет статус в API, а realtime разнесёт изменение другим клиентам.
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) => apiClient.updateTask(taskId, { status }),
    onSuccess: (task) => {
      void queryClient.invalidateQueries({ queryKey: ["tasks", task.projectId] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.task(task.id) });
    },
  });

  const handleDragEnd = ({ active, over }: DragEndEvent): void => {
    if (!over || !selectedProjectId) {
      return;
    }

    const taskId = String(active.id);
    const currentStatus = active.data.current?.status as TaskStatus | undefined;
    const nextStatus = String(over.id) as TaskStatus;

    if (!statusOrder.includes(nextStatus) || currentStatus === nextStatus) {
      return;
    }

    mutation.mutate({ taskId, status: nextStatus });
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-4">
        {statusOrder.map((status) => (
          <BoardColumn
            key={status}
            status={status}
            tasks={tasks.filter((task) => task.status === status)}
            onOpen={onOpenTask}
            isUpdating={mutation.isPending}
          />
        ))}
      </div>
    </DndContext>
  );
}
