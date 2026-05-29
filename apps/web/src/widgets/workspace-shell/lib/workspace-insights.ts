import type { TaskDto, TaskPriority, TaskStatus, UserSummaryDto } from "@tracker/types";
import { formatDayKey } from "@/shared/lib/utils/date";
import { countByStatus, getCompletion, sortByFreshness } from "@/widgets/workspace-shell/lib/task-utils";

const DAY_MS = 24 * 60 * 60 * 1000;

export function isTaskStale(task: TaskDto, thresholdDays = 3): boolean {
  if (task.status === "DONE") {
    return false;
  }

  return Date.now() - new Date(task.updatedAt).getTime() > thresholdDays * DAY_MS;
}

export function getAttentionCounts(tasks: TaskDto[]) {
  return {
    urgent: tasks.filter((task) => task.priority === "URGENT").length,
    review: countByStatus(tasks, "REVIEW"),
    unassigned: tasks.filter((task) => !task.assignee).length,
    stale: tasks.filter((task) => isTaskStale(task)).length,
  };
}

export function getDeliveryStats(tasks: TaskDto[], windowDays = 7) {
  const threshold = Date.now() - windowDays * DAY_MS;

  const created = tasks.filter((task) => new Date(task.createdAt).getTime() >= threshold).length;
  const closed = tasks.filter((task) => task.status === "DONE" && new Date(task.updatedAt).getTime() >= threshold).length;

  return {
    created,
    closed,
    delta: closed - created,
  };
}

export function getProjectPulse(tasks: TaskDto[]) {
  const completion = getCompletion(tasks);
  const attention = getAttentionCounts(tasks);

  if (tasks.length === 0) {
    return {
      label: "Пусто",
      tone: "neutral" as const,
      summary: "Пока нет задач. Можно настроить первый поток работы.",
      score: 0,
    };
  }

  if (attention.urgent > 2 || attention.stale > 3) {
    return {
      label: "Риск",
      tone: "danger" as const,
      summary: "Есть критичные или застрявшие задачи. Нужен triage.",
      score: Math.max(28, completion),
    };
  }

  if (attention.review > 0 || attention.unassigned > 0) {
    return {
      label: "Контроль",
      tone: "warning" as const,
      summary: "Проект движется, но есть очередь на разбор и приёмку.",
      score: Math.max(40, completion),
    };
  }

  return {
    label: "Норма",
    tone: "success" as const,
    summary: "Поток задач сбалансирован, критичных блокеров не видно.",
    score: Math.max(58, completion),
  };
}

export function getTimeline(tasks: TaskDto[], days = 7) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const points = Array.from({ length: days }, (_, index) => {
    const date = new Date(start.getTime() - (days - index - 1) * DAY_MS);
    const dayStart = date.getTime();
    const dayEnd = dayStart + DAY_MS;

    return {
      label: formatDayKey(date.toISOString()),
      created: tasks.filter((task) => {
        const createdAt = new Date(task.createdAt).getTime();
        return createdAt >= dayStart && createdAt < dayEnd;
      }).length,
      touched: tasks.filter((task) => {
        const updatedAt = new Date(task.updatedAt).getTime();
        return updatedAt >= dayStart && updatedAt < dayEnd;
      }).length,
      closed: tasks.filter((task) => {
        const updatedAt = new Date(task.updatedAt).getTime();
        return task.status === "DONE" && updatedAt >= dayStart && updatedAt < dayEnd;
      }).length,
    };
  });

  return points;
}

export function getTeamWorkload(tasks: TaskDto[], members: UserSummaryDto[]) {
  return members
    .map((member) => {
      const assigned = tasks.filter((task) => task.assignee?.id === member.id);
      const inFlight = assigned.filter((task) => task.status !== "DONE").length;

      return {
        member,
        total: assigned.length,
        inFlight,
        done: assigned.filter((task) => task.status === "DONE").length,
        urgent: assigned.filter((task) => task.priority === "URGENT").length,
      };
    })
    .sort((left, right) => right.inFlight - left.inFlight || right.total - left.total || left.member.name.localeCompare(right.member.name, "ru"));
}

export function getPriorityMix(tasks: TaskDto[]) {
  const priorities: TaskPriority[] = ["URGENT", "HIGH", "MEDIUM", "LOW"];

  return priorities.map((priority) => ({
    priority,
    count: tasks.filter((task) => task.priority === priority).length,
  }));
}

export function getRecentUpdates(tasks: TaskDto[], limit = 6) {
  return sortByFreshness(tasks).slice(0, limit);
}

export function getStatusBreakdown(tasks: TaskDto[]) {
  const statuses: TaskStatus[] = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"];

  return statuses.map((status) => ({
    status,
    count: countByStatus(tasks, status),
  }));
}
