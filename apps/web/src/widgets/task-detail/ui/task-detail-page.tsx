"use client";

import Link from "next/link";
import type { Route } from "next";
import { memo, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TaskDto, TaskPriority, TaskStatus, UserSummaryDto } from "@tracker/types";
import { Badge, Button, Card, Input, Select, Textarea } from "@tracker/ui";
import clsx from "clsx";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { priorityLabels, priorityTone, statusAccentClass, statusLabels, statusTone } from "@/lib/task-meta";
import { formatDate, formatDateTime, formatRelativeDate } from "@/shared/lib/utils/date";
import { ActivityIcon, CheckCircleIcon, CommentIcon, LinkIcon, UserIcon } from "@/shared/ui/tracker-icons";
import { getInitials } from "@/shared/lib/utils/string";
import { WorkspacePage, type WorkspaceData } from "@/widgets/workspace-shell/ui/workspace-shell";

type TaskTab = "comments" | "activity" | "related";

const activityLabels: Record<string, string> = {
  "task.created": "Задача создана",
  "task.updated": "Поле обновлено",
  "task.commented": "Добавлен комментарий",
};

const fieldLabels: Record<string, string> = {
  title: "название",
  description: "описание",
  status: "статус",
  priority: "приоритет",
  assigneeId: "исполнитель",
};

function taskKey(taskId: string): string {
  return taskId.slice(-8).toUpperCase();
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-black/[0.08] py-3">
      <span className="text-sm text-text/50">{label}</span>
      <span className="text-right text-sm font-semibold text-text">{value}</span>
    </div>
  );
}

const RelatedTaskLink = memo(function RelatedTaskLink({ task }: { task: TaskDto }) {
  return (
    <Link
      href={`/tasks/${task.id}` as Route}
      className="grid w-full gap-3 border-b border-black/[0.08] py-4 text-left transition hover:bg-black/[0.025] md:grid-cols-[120px_minmax(0,1fr)_120px]"
    >
      <span className="font-mono text-xs font-bold uppercase text-text/40">{taskKey(task.id)}</span>
      <span className="line-clamp-1 font-semibold text-text">{task.title}</span>
      <Badge tone={statusTone[task.status]}>{statusLabels[task.status]}</Badge>
    </Link>
  );
});

function formatActivityLabel(action: string, field: string | null) {
  const base = activityLabels[action] ?? action;

  if (!field) {
    return base;
  }

  return `${base} · ${fieldLabels[field] ?? field}`;
}

function TaskDetailContent({ taskId, data }: { taskId: string; data: WorkspaceData }) {
  const queryClient = useQueryClient();

  const taskQuery = useQuery({
    queryKey: queryKeys.task(taskId),
    queryFn: () => apiClient.getTask(taskId),
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("TODO");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [assigneeId, setAssigneeId] = useState("");
  const [comment, setComment] = useState("");
  const [tab, setTab] = useState<TaskTab>("comments");

  useEffect(() => {
    if (!taskQuery.data) {
      return;
    }

    setTitle(taskQuery.data.title);
    setDescription(taskQuery.data.description ?? "");
    setStatus(taskQuery.data.status);
    setPriority(taskQuery.data.priority);
    setAssigneeId(taskQuery.data.assignee?.id ?? "");
    setTab("comments");
    setComment("");
  }, [taskQuery.data]);

  const updateMutation = useMutation({
    mutationFn: (input?: Record<string, unknown>) =>
      apiClient.updateTask(
        taskId,
        input ?? {
          title: title.trim(),
          description: description.trim() || null,
          status,
          priority,
          assigneeId: assigneeId || null,
        },
      ),
    onSuccess: async (task) => {
      await queryClient.invalidateQueries({ queryKey: ["tasks", task.projectId] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.task(task.id) });
    },
  });

  const commentMutation = useMutation({
    mutationFn: () => apiClient.createComment(taskId, comment.trim()),
    onSuccess: async () => {
      setComment("");
      await queryClient.invalidateQueries({ queryKey: queryKeys.task(taskId) });

      if (data.selectedProjectId) {
        await queryClient.invalidateQueries({ queryKey: ["tasks", data.selectedProjectId] });
      }
    },
  });

  if (taskQuery.error) {
    return (
      <Card className="p-8 text-center">
        <p className="text-xl font-semibold text-text">Не удалось открыть задачу</p>
        <p className="mt-2 text-sm text-text/52">Проверьте доступ к проекту или вернитесь к списку задач.</p>
        <Link
          href="/tasks"
          className="mt-5 inline-flex items-center justify-center rounded-lg bg-[#111827] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#020617]"
        >
          К списку задач
        </Link>
      </Card>
    );
  }

  if (taskQuery.isLoading || !taskQuery.data) {
    return (
      <Card className="p-8 text-center">
        <p className="text-xl font-semibold text-text">Загружаю задачу...</p>
        <p className="mt-2 text-sm text-text/52">Подтягиваем комментарии, историю и текущие поля.</p>
      </Card>
    );
  }

  const task = taskQuery.data;
  const activeProject = data.projects.find((project) => project.id === task.projectId) ?? data.activeProject;
  const users: UserSummaryDto[] = data.members;

  // Dirty-state защищает от лишних PATCH-запросов и явно показывает несохранённые изменения.
  const dirty =
    title !== task.title ||
    description !== (task.description ?? "") ||
    status !== task.status ||
    priority !== task.priority ||
    assigneeId !== (task.assignee?.id ?? "");

  const relatedTasks = data.tasks
    .filter((item) => item.id !== task.id)
    .filter((item) => item.assignee?.id === task.assignee?.id || item.creator.id === task.creator.id || item.status === task.status)
    .slice(0, 6);

  const tabs: Array<{ id: TaskTab; label: string; count: number }> = [
    { id: "comments", label: "Комментарии", count: task.comments.length },
    { id: "activity", label: "История", count: task.activity.length },
    { id: "related", label: "Связанные", count: relatedTasks.length },
  ];
  const nextWorkflowAction =
    task.status === "TODO"
      ? { label: "Взять в работу", status: "IN_PROGRESS" as const }
      : task.status === "IN_PROGRESS"
        ? { label: "Отправить на ревью", status: "REVIEW" as const }
        : task.status === "REVIEW"
          ? { label: "Закрыть задачу", status: "DONE" as const }
          : { label: "Переоткрыть", status: "TODO" as const };
  const me = users.find((user) => user.id === data.userId);
  const resetForm = () => {
    setTitle(task.title);
    setDescription(task.description ?? "");
    setStatus(task.status);
    setPriority(task.priority);
    setAssigneeId(task.assignee?.id ?? "");
  };

  return (
    <div className="grid gap-10 2xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="min-w-0 space-y-8">
        <Card className="overflow-hidden">
          <header className="border-b border-black/[0.08] py-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#111827] px-3 py-1.5 font-mono text-xs font-bold text-white">
                    {activeProject?.key ?? "TASK"}-{taskKey(task.id)}
                  </span>
                  <Badge tone={statusTone[task.status]}>{statusLabels[task.status]}</Badge>
                  <Badge tone={priorityTone[task.priority]}>{priorityLabels[task.priority]}</Badge>
                </div>
                <h2 className="mt-4 text-3xl font-semibold tracking-normal text-text md:text-5xl">{task.title}</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-text/56">
                  Создано {formatDateTime(task.createdAt)} · обновлено {formatRelativeDate(task.updatedAt)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={nextWorkflowAction.status === "DONE" ? "primary" : "secondary"}
                  disabled={updateMutation.isPending}
                  onClick={() => updateMutation.mutate({ status: nextWorkflowAction.status })}
                >
                  <CheckCircleIcon className="mr-2" size={16} />
                  {nextWorkflowAction.label}
                </Button>
                <Button type="button" variant="ghost" className="rounded-xl px-4" onClick={() => navigator.clipboard?.writeText(task.id)}>
                  <LinkIcon className="mr-2" size={18} />
                  ID
                </Button>
                <Link
                  href="/tasks"
                  className="inline-flex items-center justify-center rounded-xl border border-border bg-transparent px-5 py-2 text-sm font-medium transition hover:bg-muted"
                >
                  К списку
                </Link>
              </div>
            </div>
          </header>

          <div className="grid gap-8 py-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-8">
              <Card className="border-none bg-transparent py-5 shadow-none">
                <div className="grid gap-4 lg:grid-cols-2">
                  <label className="text-sm font-semibold text-text">
                    <span className="mb-2 block text-text/50">Название</span>
                    <Input value={title} onChange={(event) => setTitle(event.target.value)} className="rounded-xl bg-transparent py-3" />
                  </label>
                  <label className="text-sm font-semibold text-text">
                    <span className="mb-2 block text-text/50">Исполнитель</span>
                    <Select value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)} className="rounded-xl bg-transparent py-3">
                      <option value="">Без исполнителя</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <label className="text-sm font-semibold text-text">
                    <span className="mb-2 block text-text/50">Статус</span>
                    <Select value={status} onChange={(event) => setStatus(event.target.value as TaskStatus)} className="rounded-xl bg-transparent py-3">
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <label className="text-sm font-semibold text-text">
                    <span className="mb-2 block text-text/50">Приоритет</span>
                    <Select value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)} className="rounded-xl bg-transparent py-3">
                      {Object.entries(priorityLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </label>
                </div>

                <label className="mt-4 block text-sm font-semibold text-text">
                  <span className="mb-2 block text-text/50">Описание и критерии готовности</span>
                  <Textarea
                    rows={9}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    className="rounded-xl bg-transparent px-4 py-3 leading-6"
                    placeholder="Что нужно сделать, какие ограничения и как понять, что задача готова?"
                  />
                </label>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <span className={clsx("rounded-full px-3 py-1.5 text-sm font-semibold", statusAccentClass[status])}>
                    {statusLabels[status]}
                  </span>
                  <span className="text-sm text-text/48">{dirty ? "Есть несохранённые изменения" : "Все изменения сохранены"}</span>
                  {dirty ? (
                    <Button type="button" variant="ghost" disabled={updateMutation.isPending} onClick={resetForm}>
                      Отменить
                    </Button>
                  ) : null}
                  {me && assigneeId !== me.id ? (
                    <Button type="button" variant="secondary" disabled={updateMutation.isPending} onClick={() => setAssigneeId(me.id)}>
                      Назначить мне
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="primary"
                    className="ml-auto rounded-xl bg-[#111827] px-5 py-3 hover:bg-[#020617]"
                    disabled={!dirty || title.trim().length < 3 || updateMutation.isPending}
                    onClick={() => updateMutation.mutate(undefined)}
                  >
                    {updateMutation.isPending ? "Сохраняю..." : "Сохранить"}
                  </Button>
                </div>
              </Card>

              <Card className="border-none bg-transparent shadow-none">
                <div className="flex flex-wrap gap-2 border-b border-black/[0.08] py-3">
                  {tabs.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTab(item.id)}
                      className={clsx(
                        "rounded-xl px-4 py-2.5 text-sm font-semibold transition",
                        tab === item.id ? "bg-[#111827] text-white" : "text-text/56 hover:bg-black/[0.04] hover:text-text",
                      )}
                    >
                      {item.label} {item.count}
                    </button>
                  ))}
                </div>

                {tab === "comments" ? (
                  <div className="space-y-4 py-5">
                    <div className="border-b border-black/[0.08] pb-4">
                      <Textarea
                        rows={5}
                        placeholder="Напишите обновление, решение или вопрос команде"
                        value={comment}
                        onChange={(event) => setComment(event.target.value)}
                        className="rounded-xl bg-transparent px-4 py-3"
                      />
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <p className="text-sm text-text/50">Комментарий попадёт в историю задачи.</p>
                        <Button
                          type="button"
                          variant="primary"
                          className="rounded-xl bg-[#111827] px-5 py-3 hover:bg-[#020617]"
                          disabled={commentMutation.isPending || comment.trim().length === 0}
                          onClick={() => commentMutation.mutate()}
                        >
                          {commentMutation.isPending ? "Отправляю..." : "Отправить"}
                        </Button>
                      </div>
                    </div>

                    {task.comments.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-black/[0.08] px-4 py-8 text-center text-sm text-text/50">
                        Комментариев пока нет. Зафиксируйте первый контекст.
                      </div>
                    ) : (
                      task.comments.map((item) => (
                        <div key={item.id} className="flex gap-3 border-b border-black/[0.08] py-4">
                          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#111827] text-xs font-bold text-white">
                            {getInitials(item.author.name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-text">{item.author.name}</p>
                              <span className="text-xs text-text/42">{formatDateTime(item.createdAt)}</span>
                            </div>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text/72">{item.body}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : null}

                {tab === "activity" ? (
                  <div className="space-y-3 py-5">
                    {task.activity.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-black/[0.08] px-4 py-8 text-center text-sm text-text/50">
                        История появится после изменений задачи.
                      </div>
                    ) : (
                      task.activity.map((item) => (
                        <div key={item.id} className="border-b border-black/[0.08] py-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-text">{item.actor.name}</p>
                              <p className="mt-1 text-sm text-text/52">{formatActivityLabel(item.action, item.field)}</p>
                            </div>
                            <span className="text-xs text-text/42">{formatDateTime(item.createdAt)}</span>
                          </div>
                          {item.beforeValue || item.afterValue ? (
                            <div className="mt-3 grid gap-3 md:grid-cols-2">
                              <DetailRow label="Было" value={item.beforeValue || "Пусто"} />
                              <DetailRow label="Стало" value={item.afterValue || "Пусто"} />
                            </div>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                ) : null}

                {tab === "related" ? (
                  <div className="space-y-3 py-5">
                    {relatedTasks.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-black/[0.08] px-4 py-8 text-center text-sm text-text/50">
                        Связанные задачи появятся по статусу, автору или исполнителю.
                      </div>
                    ) : (
                      relatedTasks.map((item) => <RelatedTaskLink key={item.id} task={item} />)
                    )}
                  </div>
                ) : null}
              </Card>
            </div>

            <aside className="space-y-4">
              <Card className="bg-[#eef1f3] py-5 shadow-none">
                <p className="text-lg font-semibold text-text">Паспорт задачи</p>
                <div className="mt-4 space-y-3">
                  <DetailRow label="Проект" value={activeProject?.name ?? "Текущий проект"} />
                  <DetailRow label="Создана" value={formatDate(task.createdAt)} />
                  <DetailRow label="Обновлена" value={formatRelativeDate(task.updatedAt)} />
                  <DetailRow label="Комментарии" value={String(task.commentsCount)} />
                </div>
              </Card>

              <Card className="rounded-xl border-black/[0.08] bg-[#111827] p-5 text-white shadow-none">
                <div className="flex items-center gap-3">
                  <CheckCircleIcon className="text-emerald-300" />
                  <div>
                    <p className="font-semibold">Workflow</p>
                    <p className="text-sm text-white/46">Текущий статус и следующий шаг.</p>
                  </div>
                </div>
                <div className="mt-5 rounded-xl bg-white/10 p-4">
                  <p className="text-sm text-white/48">Состояние</p>
                  <p className="mt-1 text-2xl font-semibold">{statusLabels[task.status]}</p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-4 w-full border-white/15 bg-white/10 text-white hover:bg-white/15"
                    disabled={updateMutation.isPending}
                    onClick={() => updateMutation.mutate({ status: nextWorkflowAction.status })}
                  >
                    {nextWorkflowAction.label}
                  </Button>
                </div>
              </Card>
            </aside>
          </div>
        </Card>
      </section>

      <aside className="space-y-6">
        <Card className="py-5 shadow-none">
          <div className="flex items-center gap-3">
            <UserIcon className="text-accent" />
            <p className="text-lg font-semibold text-text">Люди</p>
          </div>
          <div className="mt-5 space-y-4">
            <div>
              <p className="text-sm text-text/48">Автор</p>
              <p className="mt-1 font-semibold text-text">{task.creator.name}</p>
              <p className="text-sm text-text/42">{task.creator.email}</p>
            </div>
            <div>
              <p className="text-sm text-text/48">Исполнитель</p>
              <p className="mt-1 font-semibold text-text">{task.assignee?.name ?? "Не назначен"}</p>
              <p className="text-sm text-text/42">{task.assignee?.email ?? "Можно назначить в форме"}</p>
            </div>
          </div>
        </Card>

        <Card className="py-5 shadow-none">
          <div className="flex items-center gap-3">
            <CommentIcon className="text-accent" />
            <p className="text-lg font-semibold text-text">Сводка</p>
          </div>
          <div className="mt-5 grid gap-3">
            <DetailRow label="Активность" value={String(task.activity.length)} />
            <DetailRow label="Связанные" value={String(relatedTasks.length)} />
            <DetailRow label="Приоритет" value={priorityLabels[task.priority]} />
          </div>
        </Card>

        <Card className="py-5 shadow-none">
          <div className="flex items-center gap-3">
            <ActivityIcon className="text-accent" />
            <p className="text-lg font-semibold text-text">Описание</p>
          </div>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-text/62">
            {task.description || "Описание не заполнено. Добавьте контекст в редакторе слева."}
          </p>
        </Card>
      </aside>
    </div>
  );
}

export function TaskDetailPage({ taskId }: { taskId: string }) {
  return (
    <WorkspacePage
      title="Задача"
      description="Полноценная карточка задачи с редактированием, комментариями, историей и связанными задачами."
    >
      {(data) => <TaskDetailContent taskId={taskId} data={data} />}
    </WorkspacePage>
  );
}
