"use client";

import type { TaskPriority, TaskStatus, UserSummaryDto } from "@tracker/types";
import { Button, Input, Select } from "@tracker/ui";
import { TASK_PRIORITY_OPTIONS, TASK_STATUS_OPTIONS } from "@/shared/config/task-options";
import { SearchIcon } from "@/shared/ui/tracker-icons";
import { useUiStore } from "@/store/use-ui-store";

export function BoardFilter({ users }: { users: UserSummaryDto[] }) {
  const search = useUiStore((state) => state.search);
  const status = useUiStore((state) => state.status);
  const priority = useUiStore((state) => state.priority);
  const assigneeId = useUiStore((state) => state.assigneeId);
  const setSearch = useUiStore((state) => state.setSearch);
  const setStatus = useUiStore((state) => state.setStatus);
  const setPriority = useUiStore((state) => state.setPriority);
  const setAssigneeId = useUiStore((state) => state.setAssigneeId);

  const hasFilters = search.trim().length > 0 || status !== "ALL" || priority !== "ALL" || assigneeId !== "ALL";

  return (
    <div className="tracker-panel grid gap-2 rounded-xl p-3 xl:grid-cols-[minmax(260px,1fr)_170px_170px_210px_auto]">
      <label className="relative block">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-text/38" size={18} />
        <Input
          placeholder="Поиск по названию и описанию"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="border-black/[0.08] bg-[#f8fafc] py-2.5 pl-11 text-sm"
        />
      </label>

      <Select
        value={status}
        onChange={(event) => setStatus(event.target.value as TaskStatus | "ALL")}
        className="border-black/[0.08] bg-[#f8fafc] py-2.5 text-sm"
      >
        {TASK_STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>

      <Select
        value={priority}
        onChange={(event) => setPriority(event.target.value as TaskPriority | "ALL")}
        className="border-black/[0.08] bg-[#f8fafc] py-2.5 text-sm"
      >
        {TASK_PRIORITY_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>

      <Select
        value={assigneeId}
        onChange={(event) => setAssigneeId(event.target.value)}
        className="border-black/[0.08] bg-[#f8fafc] py-2.5 text-sm"
      >
        <option value="ALL">Все исполнители</option>
        <option value="unassigned">Без исполнителя</option>
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name}
          </option>
        ))}
      </Select>

      <Button
        type="button"
        variant="ghost"
        className="px-3 py-2.5 text-sm"
        disabled={!hasFilters}
        onClick={() => {
          setSearch("");
          setStatus("ALL");
          setPriority("ALL");
          setAssigneeId("ALL");
        }}
      >
        Сбросить
      </Button>
    </div>
  );
}
