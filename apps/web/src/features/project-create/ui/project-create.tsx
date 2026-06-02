"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Input, Textarea } from "@tracker/ui";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export function ProjectCreate({ organizationId }: { organizationId: string }) {
  const [keyValue, setKeyValue] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [expanded, setExpanded] = useState(true);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      apiClient.createProject({
        organizationId,
        key: keyValue.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim() || undefined,
      }),
    onSuccess: async () => {
      setKeyValue("");
      setName("");
      setDescription("");
      setExpanded(false);
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects(organizationId) });
    },
  });

  return (
    <div className="rounded-xl border border-black/[0.08] bg-[#eef1f3] p-4 text-text">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase text-text/36">Новый проект</p>
          <p className="mt-1 text-sm font-medium text-text/82">Добавить рабочую область</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="rounded-lg"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "Скрыть" : "Открыть"}
        </Button>
      </div>

      {expanded ? (
        <div className="mt-4 grid gap-3">
          <Input
            placeholder="Ключ"
            value={keyValue}
            onChange={(event) => setKeyValue(event.target.value)}
            className="bg-white"
          />
          <Input
            placeholder="Название проекта"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="bg-white"
          />
          <Textarea
            rows={3}
            placeholder="Короткое описание"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="bg-white"
          />
          <Button
            type="button"
            variant="primary"
            className="rounded-lg"
            disabled={mutation.isPending || !keyValue.trim() || !name.trim()}
            onClick={() => {
              mutation.mutate();
            }}
          >
            {mutation.isPending ? "Создаю..." : "Создать проект"}
          </Button>
        </div>
      ) : null}

      {mutation.error ? (
        <p className="mt-3 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">Не удалось создать проект. Проверь уникальность ключа.</p>
      ) : null}
    </div>
  );
}
