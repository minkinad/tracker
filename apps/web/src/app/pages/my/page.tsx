"use client";

import Link from "next/link";
import { ActivityIcon, BoardIcon, CheckCircleIcon, ListIcon, ProjectsIcon, QueueIcon } from "@/shared/ui/tracker-icons";
import { WorkspacePage } from "@/widgets/workspace-shell/ui/workspace-shell";

const trackerSections = [
  {
    icon: ListIcon,
    title: "Задачи",
    description: "Личный и командный список для triage, поиска, фильтрации и быстрого перехода в карточку.",
  },
  {
    icon: ProjectsIcon,
    title: "Проекты и портфели",
    description: "Контекст работы команды: выбранный проект управляет задачами, досками и отчётами.",
  },
  {
    icon: QueueIcon,
    title: "Очереди",
    description: "Фокусные подборки: мои задачи, без исполнителя, ревью и другие рабочие потоки.",
  },
  {
    icon: BoardIcon,
    title: "Доски задач",
    description: "Kanban с drag-and-drop сменой статусов и синхронизацией через API.",
  },
  {
    icon: ActivityIcon,
    title: "Дашборды и отчёты",
    description: "Сводка прогресса, распределение по статусам и нагрузка команды.",
  },
  {
    icon: CheckCircleIcon,
    title: "История",
    description: "Изменения задач и активность проекта помогают быстро восстановить контекст.",
  },
];

export default function MyPage() {
  return (
    <WorkspacePage
      title="Мой трекер"
      description="Стартовая страница рабочего пространства: что есть в системе и куда перейти дальше."
    >
      {(data) => (
        <div className="space-y-10">
          <section className="grid gap-8 rounded-xl border border-black/[0.08] bg-white/82 p-6 shadow-sm xl:grid-cols-[minmax(0,1fr)_360px]">
            <div>
              <p className="text-xs uppercase text-text/40">Tracker Pro</p>
              <h2 className="mt-3 max-w-3xl text-4xl font-semibold tracking-normal text-text md:text-6xl">
                Рабочий контур для задач, досок и решений команды.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-text/60">
                Здесь собраны маршруты трекера, проектный контекст и быстрый вход в рабочие сценарии. После входа вы всегда попадаете сюда,
                чтобы выбрать следующий шаг без лишнего шума.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/tasks"
                  className="inline-flex items-center justify-center rounded-xl bg-[#111827] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#020617]"
                >
                  Перейти к задачам
                </Link>
                <Link
                  href="/boards"
                  className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-5 py-3 text-sm font-medium transition hover:bg-muted"
                >
                  Открыть доску
                </Link>
              </div>
            </div>

            <aside className="rounded-xl border border-black/[0.08] bg-[#eef1f3] p-5 xl:self-start">
              <p className="text-sm text-text/48">Текущий проект</p>
              <p className="mt-2 text-2xl font-semibold tracking-normal text-text">{data.activeProject?.name ?? "Не выбран"}</p>
              <div className="mt-5 grid grid-cols-2 gap-4 border-t border-black/[0.08] pt-5">
                <div>
                  <p className="text-xs uppercase text-text/36">Задачи</p>
                  <p className="mt-2 text-3xl font-semibold text-text">{data.tasks.length}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-text/36">Команда</p>
                  <p className="mt-2 text-3xl font-semibold text-text">{data.members.length}</p>
                </div>
              </div>
            </aside>
          </section>

          <section>
            <p className="text-xs uppercase text-text/40">Возможности</p>
            <div className="mt-5 grid gap-x-8 gap-y-6 md:grid-cols-2 xl:grid-cols-3">
              {trackerSections.map((section) => {
                const Icon = section.icon;

                return (
                  <article key={section.title} className="rounded-xl border border-black/[0.08] bg-white/78 p-5 shadow-sm">
                    <div className="grid h-11 w-11 place-items-center rounded-lg bg-[#eef1f3] text-accent">
                      <Icon size={22} />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-text">{section.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-text/56">{section.description}</p>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </WorkspacePage>
  );
}
