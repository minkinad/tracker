"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ProjectDto } from "@tracker/types";
import { Badge, Button, Select } from "@tracker/ui";
import clsx from "clsx";
import { SignInForm } from "@/features/auth/ui/sign-in-form";
import { ProjectCreate } from "@/features/project-create/ui/project-create";
import { SkeletonBoard } from "@/shared/ui/skeleton-board";
import { formatRelativeDate } from "@/shared/lib/utils/date";
import {
  ActivityIcon,
  BoardIcon,
  CalendarIcon,
  CheckCircleIcon,
  GoalIcon,
  HistoryIcon,
  ListIcon,
  PlusIcon,
  ProjectsIcon,
  QueueIcon,
  SettingsIcon,
  SparkIcon,
  UserIcon,
} from "@/shared/ui/tracker-icons";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { countByStatus, getCompletion, taskKey } from "@/widgets/workspace-shell/lib/task-utils";
import { getAttentionCounts, getDeliveryStats, getProjectPulse } from "@/widgets/workspace-shell/lib/workspace-insights";
import { useWorkspaceData } from "@/widgets/workspace-shell/model/use-workspace-data";
import type { WorkspaceData } from "@/widgets/workspace-shell/model/types";
import { EmptyState } from "@/widgets/workspace-shell/ui/empty-state";
import { useUiStore } from "@/store/use-ui-store";
import { statusLabels, statusOrder, statusTone } from "@/lib/task-meta";
import { getInitials } from "@/shared/lib/utils/string";

export type { TaskScope, WorkspaceData } from "@/widgets/workspace-shell/model/types";
export { filterTasksByScope } from "@/widgets/workspace-shell/lib/task-utils";

type SidebarPanel = "tasks" | "projects" | "goals" | "queues" | "boards" | "dashboards" | "history" | "settings";

const roleLabels: Record<string, string> = {
  ADMIN: "Администратор",
  USER: "Участник",
  OWNER: "Владелец",
  MEMBER: "Участник",
};

function ProjectSwitcher({
  projects,
  selectedProjectId,
  onSelect,
}: {
  projects: ProjectDto[];
  selectedProjectId: string | null;
  onSelect: (projectId: string) => void;
}) {
  if (projects.length === 0) {
    return <p className="text-sm leading-6 text-text/52">Создайте первый проект ниже.</p>;
  }

  return (
    <div className="space-y-1">
      {projects.map((project) => {
        const active = project.id === selectedProjectId;

        return (
          <button
            key={project.id}
            type="button"
            onClick={() => onSelect(project.id)}
            className={clsx(
              "group w-full rounded-lg px-3 py-2 text-left text-sm transition",
              active ? "bg-[#1f2937] text-white" : "text-text/64 hover:bg-black/[0.04] hover:text-text",
            )}
          >
            <span className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate font-semibold">{project.name}</span>
              <span className={clsx("text-xs", active ? "text-white/54" : "text-text/36")}>{project.key}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function WorkspaceSidebar({
  data,
}: {
  data: WorkspaceData;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [activePanel, setActivePanel] = useState<SidebarPanel | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const queryClient = useQueryClient();
  const clearSession = useUiStore((state) => state.clearSession);
  const setSelectedProjectId = useUiStore((state) => state.setSelectedProjectId);

  const navigateTo = (href: Route): void => {
    router.push(href);
    setActivePanel(null);
  };

  const selectProject = (projectId: string): void => {
    setSelectedProjectId(projectId);
    router.push("/tasks");
    setActivePanel(null);
  };

  const createTaskMutation = useMutation({
    mutationFn: () => {
      if (!data.selectedProjectId) {
        throw new Error("Project is not selected");
      }

      return apiClient.createTask(data.selectedProjectId, {
        title: `Новая задача ${new Date().toLocaleString("ru-RU")}`,
        description: "Создано через кнопку быстрого создания в сайдбаре.",
        priority: "MEDIUM",
      });
    },
    onSuccess: async (task) => {
      await queryClient.invalidateQueries({ queryKey: ["tasks", task.projectId] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.task(task.id) });
      router.push(`/tasks/${task.id}` as Route);
      setActivePanel(null);
    },
    onError: () => {
      setActivePanel("projects");
    },
  });

  const railItems = [
    {
      id: "tasks",
      label: "Задачи",
      icon: ListIcon,
      active: pathname.startsWith("/tasks") || activePanel === "tasks",
      onClick: () => setActivePanel("tasks"),
    },
    {
      id: "projects",
      label: "Проекты и портфели",
      icon: ProjectsIcon,
      active: activePanel === "projects",
      onClick: () => setActivePanel("projects"),
    },
    {
      id: "goals",
      label: "Цели",
      icon: GoalIcon,
      active: activePanel === "goals",
      onClick: () => setActivePanel("goals"),
    },
    {
      id: "queues",
      label: "Очереди",
      icon: QueueIcon,
      active: activePanel === "queues",
      onClick: () => setActivePanel("queues"),
    },
    {
      id: "boards",
      label: "Доски задач",
      icon: BoardIcon,
      active: pathname.startsWith("/boards") || activePanel === "boards",
      onClick: () => setActivePanel("boards"),
    },
    {
      id: "dashboards",
      label: "Дашборды и отчёты",
      icon: ActivityIcon,
      active: pathname.startsWith("/analytics") || activePanel === "dashboards",
      onClick: () => setActivePanel("dashboards"),
    },
    {
      id: "history",
      label: "История",
      icon: HistoryIcon,
      active: activePanel === "history",
      onClick: () => setActivePanel("history"),
    },
  ];

  const teamRole = roleLabels[data.organizationRole ?? data.userRole] ?? data.organizationRole ?? data.userRole;
  const personalTasks = data.tasks.filter((task) => task.assignee?.id === data.userId || task.creator.id === data.userId);
  const mobileRailItems = [
    {
      id: "tasks",
      label: "Задачи",
      icon: ListIcon,
      active: pathname.startsWith("/tasks"),
      onClick: () => navigateTo("/tasks"),
    },
    {
      id: "projects",
      label: "Проекты",
      icon: ProjectsIcon,
      active: activePanel === "projects",
      onClick: () => setActivePanel("projects"),
    },
    {
      id: "boards",
      label: "Доски",
      icon: BoardIcon,
      active: pathname.startsWith("/boards"),
      onClick: () => navigateTo("/boards"),
    },
    {
      id: "analytics",
      label: "Отчёты",
      icon: ActivityIcon,
      active: pathname.startsWith("/analytics"),
      onClick: () => navigateTo("/analytics"),
    },
    {
      id: "settings",
      label: "Настройки",
      icon: SettingsIcon,
      active: activePanel === "settings",
      onClick: () => setActivePanel("settings"),
    },
  ];

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-[72px] shrink-0 flex-col items-center overflow-hidden border-r border-black/[0.08] bg-[#f3f4f6] py-4 lg:flex">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#1f2937]">
          <span className="h-5 w-5 rounded-full border-[5px] border-white" />
        </div>

        <button
          type="button"
          title="Создать задачу"
          aria-label="Создать задачу"
          disabled={createTaskMutation.isPending}
          onClick={() => {
            if (!data.selectedProjectId) {
              setActivePanel("projects");
              return;
            }

            createTaskMutation.mutate();
          }}
          className="mt-7 grid h-10 w-10 place-items-center rounded-lg bg-[#3f76ff] text-white transition hover:bg-[#2f63d9] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <PlusIcon size={22} />
        </button>

        <nav className="mt-4 flex flex-1 flex-col items-center gap-2">
          {railItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                title={item.label}
                aria-label={item.label}
                onClick={item.onClick}
                className={clsx(
                  "grid h-10 w-10 place-items-center rounded-lg transition",
                  item.active ? "bg-white text-[#1f2937] shadow-sm" : "text-[#4b5563] hover:bg-white hover:text-[#111827]",
                )}
              >
                <Icon size={21} />
              </button>
            );
          })}
        </nav>

        <div className="relative flex flex-col items-center gap-2">
          <button
            type="button"
            title="Настройки трекера"
            aria-label="Настройки трекера"
            aria-pressed={activePanel === "settings"}
            onClick={() => {
              setProfileOpen(false);
              setActivePanel("settings");
            }}
            className={clsx(
              "grid h-10 w-10 place-items-center rounded-lg transition",
              activePanel === "settings"
                ? "bg-white text-[#111827] shadow-sm"
                : "text-[#4b5563] hover:bg-white hover:text-[#111827]",
            )}
          >
            <SettingsIcon size={21} />
          </button>

          <button
            type="button"
            title={data.userName}
            aria-label={data.userName}
            onClick={() => setProfileOpen((value) => !value)}
            className={clsx(
              "mt-2 grid h-10 w-10 place-items-center rounded-lg border border-white bg-[#111827] text-white shadow-sm transition",
              profileOpen ? "ring-2 ring-[#3f76ff]/40" : "hover:bg-[#020617]",
            )}
          >
            <UserIcon size={19} />
          </button>

          {profileOpen ? (
            <div className="absolute bottom-0 left-[58px] z-50 w-[320px] rounded-xl border border-black/[0.08] bg-white p-4 text-text shadow-[0_18px_50px_rgba(15,23,42,0.18)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{data.userName}</p>
                  <p className="mt-1 truncate text-xs text-text/44">{data.userEmail}</p>
                  <p className="mt-2 text-xs font-semibold text-text/56">Роль в команде: {teamRole}</p>
                </div>
                <Button type="button" variant="ghost" className="px-3 py-2 text-sm text-rose-600 hover:bg-rose-50" onClick={clearSession}>
                  Выйти
                </Button>
              </div>
              <button
                type="button"
                className="mt-4 w-full rounded-lg border border-black/[0.08] px-4 py-3 text-left text-sm font-semibold text-text transition hover:bg-black/[0.035]"
                onClick={clearSession}
              >
                Добавить пользователя
                <span className="mt-1 block text-xs font-normal text-text/44">Выйти на экран входа и авторизоваться ещё раз.</span>
              </button>
            </div>
          ) : null}
        </div>
      </aside>

      {activePanel ? (
        <div className="fixed inset-0 z-40 lg:left-[72px]">
          <button
            type="button"
            aria-label="Закрыть панель"
            className="absolute inset-0 cursor-default bg-[#111827]/38 backdrop-blur-[1px]"
            onClick={() => setActivePanel(null)}
          />
          <aside className="relative h-full w-full max-w-[420px] overflow-y-auto bg-white px-6 py-7 shadow-[26px_0_70px_rgba(15,23,42,0.22)]">
            <div className="absolute right-4 top-4">
              <button
                type="button"
                className="rounded-xl px-3 py-2 text-sm font-semibold text-text/52 transition hover:bg-black/[0.04] hover:text-text"
                onClick={() => setActivePanel(null)}
              >
                Закрыть
              </button>
            </div>

        {activePanel === "tasks" ? (
          <div>
            <p className="text-xs uppercase text-text/36">Задачи</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal text-text">Мои задачи</h2>
            <div className="mt-6 divide-y divide-black/[0.08] border-y border-black/[0.08]">
              {personalTasks.slice(0, 8).map((task) => (
                <Link key={task.id} href={`/tasks/${task.id}` as Route} className="block py-3 transition hover:bg-black/[0.025]" onClick={() => setActivePanel(null)}>
                  <p className="line-clamp-1 text-sm font-semibold text-text">{task.title}</p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="font-mono text-xs uppercase text-text/36">{taskKey(task)}</span>
                    <Badge tone={statusTone[task.status]}>{statusLabels[task.status]}</Badge>
                  </div>
                </Link>
              ))}
            </div>
            <Button type="button" variant="primary" className="mt-5 w-full rounded-xl bg-[#111827] py-3 hover:bg-[#020617]" onClick={() => navigateTo("/tasks")}>
              Открыть список
            </Button>
          </div>
        ) : null}

        {activePanel === "boards" ? (
          <div>
            <p className="text-xs uppercase text-text/36">Доски</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal text-text">Статусы</h2>
            <div className="mt-6 divide-y divide-black/[0.08] border-y border-black/[0.08]">
              {statusOrder.map((status) => (
                <button key={status} type="button" className="flex w-full items-center justify-between gap-3 py-3 text-left" onClick={() => navigateTo("/boards")}>
                  <Badge tone={statusTone[status]}>{statusLabels[status]}</Badge>
                  <span className="text-sm font-semibold text-text">{countByStatus(data.tasks, status)}</span>
                </button>
              ))}
            </div>
            <Button type="button" variant="primary" className="mt-5 w-full rounded-xl bg-[#111827] py-3 hover:bg-[#020617]" onClick={() => navigateTo("/boards")}>
              Открыть доску
            </Button>
          </div>
        ) : null}

        {activePanel === "projects" ? (
          <div>
            <p className="text-xs uppercase text-text/36">Проекты и портфели</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal text-text">Выбор проекта</h2>
            <p className="mt-2 text-sm leading-6 text-text/52">Выберите проект или портфель, чтобы открыть задачи по нему.</p>
            <div className="mt-6">
              <ProjectSwitcher projects={data.projects} selectedProjectId={data.selectedProjectId} onSelect={selectProject} />
            </div>
            {data.activeOrganizationId ? (
              <div className="mt-6 border-t border-black/[0.08] pt-5">
                <ProjectCreate organizationId={data.activeOrganizationId} />
              </div>
            ) : null}
          </div>
        ) : null}

        {activePanel === "goals" ? (
          <div>
            <p className="text-xs uppercase text-text/36">Цели</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal text-text">Цели команды</h2>
            <div className="mt-6 border-y border-black/[0.08] py-5 text-sm leading-6 text-text/56">
              Цели будут связывать задачи с результатами команды. Сейчас можно использовать задачи с высоким приоритетом как ближайший фокус.
            </div>
            <Button type="button" variant="primary" className="mt-5 w-full rounded-xl bg-[#111827] py-3 hover:bg-[#020617]" onClick={() => navigateTo("/tasks")}>
              Смотреть фокусные задачи
            </Button>
          </div>
        ) : null}

        {activePanel === "queues" ? (
          <div>
            <p className="text-xs uppercase text-text/36">Очереди</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal text-text">Рабочие очереди</h2>
            <div className="mt-6 divide-y divide-black/[0.08] border-y border-black/[0.08]">
              <button type="button" className="flex w-full items-center justify-between gap-3 py-3 text-left" onClick={() => navigateTo("/tasks")}>
                <span className="text-sm font-semibold text-text">Мои задачи</span>
                <span className="text-sm text-text/52">
                  {data.tasks.filter((task) => task.assignee?.id === data.userId || task.creator.id === data.userId).length}
                </span>
              </button>
              <button type="button" className="flex w-full items-center justify-between gap-3 py-3 text-left" onClick={() => navigateTo("/tasks")}>
                <span className="text-sm font-semibold text-text">Без исполнителя</span>
                <span className="text-sm text-text/52">{data.tasks.filter((task) => !task.assignee).length}</span>
              </button>
              <button type="button" className="flex w-full items-center justify-between gap-3 py-3 text-left" onClick={() => navigateTo("/tasks")}>
                <span className="text-sm font-semibold text-text">На ревью</span>
                <span className="text-sm text-text/52">{countByStatus(data.tasks, "REVIEW")}</span>
              </button>
            </div>
          </div>
        ) : null}

        {activePanel === "dashboards" ? (
          <div>
            <p className="text-xs uppercase text-text/36">Дашборд и отчёты</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal text-text">Прогресс</h2>
            <div className="mt-6 border-y border-black/[0.08] py-5">
              <p className="text-6xl font-semibold tracking-normal text-text">{getCompletion(data.tasks)}%</p>
              <p className="mt-3 text-sm leading-6 text-text/56">Готовность по текущей выборке задач проекта.</p>
            </div>
            <Button type="button" variant="primary" className="mt-5 w-full rounded-xl bg-[#111827] py-3 hover:bg-[#020617]" onClick={() => navigateTo("/analytics")}>
              Открыть отчёты
            </Button>
          </div>
        ) : null}

        {activePanel === "history" ? (
          <div>
            <p className="text-xs uppercase text-text/36">История</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal text-text">Последние изменения</h2>
            <div className="mt-5 divide-y divide-black/[0.08] border-y border-black/[0.08]">
              {data.tasks.slice(0, 6).map((task) => (
                <Link key={task.id} href={`/tasks/${task.id}` as Route} className="block py-3 transition hover:bg-black/[0.025]" onClick={() => setActivePanel(null)}>
                  <p className="line-clamp-1 text-sm font-semibold text-text">{task.title}</p>
                  <p className="mt-1 text-xs text-text/42">Обновлено {formatRelativeDate(task.updatedAt)}</p>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {activePanel === "settings" ? (
          <div>
            <p className="text-xs uppercase text-text/36">Настройки</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal text-text">Настройки трекера</h2>
            <p className="mt-2 text-sm leading-6 text-text/52">
              Быстрый доступ к рабочему контексту, проекту и основным разделам без расширения сайдбара.
            </p>
            <div className="mt-6 divide-y divide-black/[0.08] border-y border-black/[0.08]">
              <div className="py-3">
                <p className="text-xs uppercase text-text/36">Пользователь</p>
                <p className="mt-1 text-sm font-semibold text-text">{data.userName}</p>
                <p className="mt-1 text-xs text-text/44">Роль в команде: {teamRole}</p>
              </div>
              <div className="py-3">
                <p className="text-xs uppercase text-text/36">Текущий проект</p>
                <p className="mt-1 text-sm font-semibold text-text">{data.activeProject?.name ?? "Проект не выбран"}</p>
                <p className="mt-1 text-xs text-text/44">
                  {data.activeProject ? `Ключ проекта: ${data.activeProject.key}` : "Выберите проект через раздел проектов и портфелей."}
                </p>
              </div>
              <button type="button" className="flex w-full items-center justify-between gap-3 py-3 text-left" onClick={() => setActivePanel("projects")}>
                <span className="text-sm font-semibold text-text">Управлять проектами</span>
                <span className="text-sm text-text/42">{data.projects.length}</span>
              </button>
            </div>
            <Button type="button" variant="primary" className="mt-5 w-full rounded-xl bg-[#111827] py-3 hover:bg-[#020617]" onClick={() => navigateTo("/pages/my")}>
              Открыть главную
            </Button>
          </div>
        ) : null}
          </aside>
        </div>
      ) : null}

      <div className="border-b border-black/[0.08] bg-[#eef1f3]/96 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#f97316] shadow-sm">
              <span className="h-4 w-4 rounded-full border-4 border-white" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text">{data.activeProject?.name ?? "Проект не выбран"}</p>
              <p className="truncate text-xs text-text/46">{personalTasks.length} моих задач</p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Создать задачу"
            disabled={createTaskMutation.isPending}
            onClick={() => {
              if (!data.selectedProjectId) {
                setActivePanel("projects");
                return;
              }

              createTaskMutation.mutate();
            }}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#111827] text-white shadow-sm disabled:opacity-60"
          >
            <PlusIcon size={18} />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-5 gap-2">
          {mobileRailItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                aria-label={item.label}
                onClick={item.onClick}
                className={clsx(
                  "flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-[11px] font-semibold transition",
                  item.active ? "bg-white text-[#111827] shadow-sm" : "text-text/56 hover:bg-white/70 hover:text-text",
                )}
              >
                <Icon size={18} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

function WorkspaceHeader({
  title,
  description,
  data,
}: {
  title: string;
  description: string;
  data: WorkspaceData;
}) {
  const setSelectedProjectId = useUiStore((state) => state.setSelectedProjectId);
  const attention = getAttentionCounts(data.tasks);
  const delivery = getDeliveryStats(data.tasks);
  const pulse = getProjectPulse(data.tasks);
  const highlights = [
    {
      label: "Готовность",
      value: `${getCompletion(data.tasks)}%`,
      icon: CheckCircleIcon,
    },
    {
      label: "На ревью",
      value: attention.review,
      icon: SparkIcon,
    },
    {
      label: "Без исполнителя",
      value: attention.unassigned,
      icon: UserIcon,
    },
    {
      label: "Delivery 7d",
      value: `${delivery.closed}/${delivery.created}`,
      icon: CalendarIcon,
    },
  ];

  return (
    <header className="tracker-panel rounded-xl">
      <div className="grid gap-4 border-b border-black/[0.08] px-4 py-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center md:px-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase text-text/48">
            <span>{data.activeProject?.key ?? "WORKSPACE"}</span>
            <span className="rounded-md bg-black/[0.05] px-2 py-0.5 text-[11px] text-text/56">
              {data.organizations.find((organization) => organization.id === data.activeOrganizationId)?.name ?? "Organization"}
            </span>
            <span className="rounded-md bg-[#e8f0ff] px-2 py-0.5 text-[11px] text-[#2854b8]">{pulse.label}</span>
          </div>
          <div className="mt-3 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold text-text md:text-3xl">{title}</h1>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-text/58">{description}</p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs text-text/56">
              {data.projects.length > 0 ? (
                <Select
                  aria-label="Текущий проект"
                  value={data.selectedProjectId ?? ""}
                  onChange={(event) => setSelectedProjectId(event.target.value || null)}
                  className="w-[220px] border-black/[0.08] bg-white py-1.5 text-xs font-semibold"
                >
                  {data.projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.key} · {project.name}
                    </option>
                  ))}
                </Select>
              ) : null}
              <span className="rounded-md border border-black/[0.08] bg-[#f8fafc] px-2.5 py-1">Участники: {data.members.length}</span>
              <span className="rounded-md border border-black/[0.08] bg-[#f8fafc] px-2.5 py-1">
                Открытые: {data.tasks.length - countByStatus(data.tasks, "DONE")}
              </span>
              <span className="rounded-md border border-black/[0.08] bg-[#f8fafc] px-2.5 py-1">Пульс: {pulse.score}</span>
            </div>
          </div>
        </div>

        <div className="grid min-w-[280px] gap-2 sm:grid-cols-2 xl:w-[420px]">
          {highlights.map((item) => {
            const Icon = item.icon;

            return (
              <article key={item.label} className="rounded-lg border border-black/[0.08] bg-[#f8fafc] px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium text-text/48">{item.label}</p>
                  <Icon size={15} className="text-text/42" />
                </div>
                <p className="mt-1 text-xl font-semibold text-text">{item.value}</p>
              </article>
            );
          })}
        </div>
      </div>

      <div className="grid gap-2 px-4 py-3 text-sm text-text/56 md:grid-cols-3 md:px-5">
        <div className="rounded-lg bg-[#f8fafc] px-3 py-2">
          <p className="font-semibold text-text">{data.activeProject?.name ?? "Проект не выбран"}</p>
          <p className="mt-1">Контекст для фильтров, досок и аналитики.</p>
        </div>
        <div className="rounded-lg bg-[#f8fafc] px-3 py-2">
          <p className="font-semibold text-text">Роль в пространстве</p>
          <p className="mt-1">{data.organizationRole ?? data.userRole}</p>
        </div>
        <div className="rounded-lg bg-[#f8fafc] px-3 py-2">
          <p className="font-semibold text-text">Темп команды</p>
          <p className="mt-1">
            {delivery.closed >= delivery.created ? "Закрываем быстрее, чем создаём." : "Бэклог растёт быстрее delivery, нужен контроль входящего потока."}
          </p>
        </div>
      </div>
    </header>
  );
}

export function WorkspacePage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: (data: WorkspaceData) => ReactNode;
}) {
  const hydrated = useUiStore((state) => state.hydrated);
  const accessToken = useUiStore((state) => state.accessToken);
  const user = useUiStore((state) => state.user);
  const data = useWorkspaceData();

  if (!hydrated) {
    return (
      <main className="min-h-screen bg-[#f6f7f9] p-5">
        <SkeletonBoard />
      </main>
    );
  }

  if (!accessToken || !user) {
    return <SignInForm />;
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-[#f6f7f9] p-5">
        <SkeletonBoard />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f7f9] text-text">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <WorkspaceSidebar data={data} />
        <section className="min-w-0 flex-1 px-3 py-4 md:px-5 lg:px-7">
          <div className="mx-auto max-w-[1500px] space-y-5">
            <WorkspaceHeader title={title} description={description} data={data} />
            {data.projects.length === 0 ? (
              <EmptyState
                title="Создайте проект"
                description="После создания проекта здесь появятся задачи, доски и рабочая аналитика."
                action="Форма создания проекта находится в левом сайдбаре."
              />
            ) : (
              children(data)
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
