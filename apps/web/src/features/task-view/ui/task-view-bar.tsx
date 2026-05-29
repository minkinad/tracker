"use client";

import { useMemo, useState } from "react";
import type { TaskPriority, TaskStatus } from "@tracker/types";
import { Button, Input } from "@tracker/ui";
import clsx from "clsx";
import { useUiStore } from "@/store/use-ui-store";

type TaskViewFilters = {
  search: string;
  status: TaskStatus | "ALL";
  priority: TaskPriority | "ALL";
  assigneeId: string | "ALL";
};

function areFiltersEqual(left: TaskViewFilters, right: TaskViewFilters) {
  return left.search === right.search && left.status === right.status && left.priority === right.priority && left.assigneeId === right.assigneeId;
}

export function TaskViewBar({ userId }: { userId: string }) {
  const [isComposing, setIsComposing] = useState(false);
  const [name, setName] = useState("");
  const search = useUiStore((state) => state.search);
  const status = useUiStore((state) => state.status);
  const priority = useUiStore((state) => state.priority);
  const assigneeId = useUiStore((state) => state.assigneeId);
  const savedTaskViews = useUiStore((state) => state.savedTaskViews);
  const applyTaskView = useUiStore((state) => state.applyTaskView);
  const deleteTaskView = useUiStore((state) => state.deleteTaskView);
  const saveCurrentTaskView = useUiStore((state) => state.saveCurrentTaskView);

  const currentFilters = useMemo(
    () => ({
      search,
      status,
      priority,
      assigneeId,
    }),
    [assigneeId, priority, search, status],
  );

  const presets = useMemo(
    () => [
      {
        id: "all",
        label: "Все задачи",
        filters: { search: "", status: "ALL" as const, priority: "ALL" as const, assigneeId: "ALL" as const },
      },
      {
        id: "mine",
        label: "Моя очередь",
        filters: { search: "", status: "ALL" as const, priority: "ALL" as const, assigneeId: userId },
      },
      {
        id: "review",
        label: "На ревью",
        filters: { search: "", status: "REVIEW" as const, priority: "ALL" as const, assigneeId: "ALL" as const },
      },
      {
        id: "triage",
        label: "Нужен triage",
        filters: { search: "", status: "TODO" as const, priority: "ALL" as const, assigneeId: "unassigned" },
      },
    ],
    [userId],
  );

  const activePresetId = presets.find((preset) => areFiltersEqual(preset.filters, currentFilters))?.id ?? null;
  const activeSavedViewId = savedTaskViews.find((view) => areFiltersEqual(view, currentFilters))?.id ?? null;
  const customDisabled =
    currentFilters.search.trim().length === 0 &&
    currentFilters.status === "ALL" &&
    currentFilters.priority === "ALL" &&
    currentFilters.assigneeId === "ALL";

  return (
    <section className="rounded-[28px] border border-black/[0.08] bg-white/78 p-4 shadow-[0_16px_32px_rgba(15,23,42,0.05)] backdrop-blur-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.18em] text-text/38">Представления</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyTaskView(preset.filters)}
                className={clsx(
                  "rounded-2xl border px-4 py-2 text-sm font-semibold transition",
                  activePresetId === preset.id
                    ? "border-[#111827] bg-[#111827] text-white shadow-[0_10px_22px_rgba(15,23,42,0.15)]"
                    : "border-black/[0.08] bg-white/80 text-text/68 hover:border-black/[0.16] hover:text-text",
                )}
              >
                {preset.label}
              </button>
            ))}

            {savedTaskViews.map((view) => (
              <div key={view.id} className="group inline-flex items-center rounded-2xl border border-black/[0.08] bg-[#f3f5f7] pr-1">
                <button
                  type="button"
                  onClick={() => applyTaskView(view)}
                  className={clsx(
                    "rounded-2xl px-4 py-2 text-sm font-semibold transition",
                    activeSavedViewId === view.id ? "bg-[#dce7ff] text-[#20437a]" : "text-text/68 hover:text-text",
                  )}
                >
                  {view.name}
                </button>
                <button
                  type="button"
                  aria-label={`Удалить view ${view.name}`}
                  onClick={() => deleteTaskView(view.id)}
                  className="rounded-xl px-2 py-1.5 text-xs font-bold text-text/34 transition hover:bg-black/[0.06] hover:text-text"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-[280px] max-w-full rounded-[22px] border border-black/[0.08] bg-[#f4f6f8] p-3">
          {isComposing ? (
            <form
              className="flex flex-col gap-2 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();

                if (name.trim().length < 2) {
                  return;
                }

                saveCurrentTaskView(name);
                setName("");
                setIsComposing(false);
              }}
            >
              <Input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Название view" className="bg-white" />
              <div className="flex gap-2">
                <Button type="submit" variant="primary" className="px-4">
                  Сохранить
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="px-4"
                  onClick={() => {
                    setName("");
                    setIsComposing(false);
                  }}
                >
                  Отмена
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-text">Текущее представление</p>
                <p className="mt-1 text-sm text-text/52">
                  {activeSavedViewId
                    ? "Вы работаете в сохранённой кастомной выборке."
                    : activePresetId
                      ? "Активен системный view для быстрого переключения контекста."
                      : "Сейчас открыт несохранённый фильтр. Его можно закрепить как view."}
                </p>
              </div>
              <Button type="button" variant="secondary" disabled={customDisabled} onClick={() => setIsComposing(true)}>
                Сохранить текущее представление
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
