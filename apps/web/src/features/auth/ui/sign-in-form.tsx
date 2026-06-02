"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button, Card, Input } from "@tracker/ui";
import { apiClient } from "@/lib/api-client";
import { ActivityIcon, BoardIcon, CheckCircleIcon, SparkIcon } from "@/shared/ui/tracker-icons";
import { useUiStore } from "@/store/use-ui-store";

export function SignInForm() {
  const router = useRouter();
  const setSession = useUiStore((state) => state.setSession);
  const [email, setEmail] = useState("owner@tracker.local");
  const [password, setPassword] = useState("changeme123");

  const mutation = useMutation({
    mutationFn: () => apiClient.login(email, password),
    onSuccess: (session) => {
      setSession({
        accessToken: session.tokens.accessToken,
        refreshToken: session.tokens.refreshToken,
        user: session.user,
      });
      router.replace("/pages/my");
    },
  });

  return (
    <main className="grid min-h-screen place-items-center px-4 py-8">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-xl bg-[#111827] shadow-[0_40px_120px_rgba(15,23,42,0.34)] lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative min-h-[520px] overflow-hidden p-8 text-white md:p-12">
          <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-[#f97316]/25 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-emerald-300/15 blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-3 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white/80">
              <SparkIcon size={18} />
              Production tracker workspace
            </div>
            <h1 className="mt-8 max-w-xl text-5xl font-semibold tracking-normal md:text-7xl">
              Управляйте задачами без операционного тумана.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/62">
              Доска, фокус, список, аналитика и realtime-обновления в одном рабочем контуре. Без demo-слоя, без локального фейкового хранилища.
            </p>
          </div>

          <div className="relative mt-10 grid gap-3 sm:grid-cols-3">
            {[
              { icon: BoardIcon, label: "Kanban" },
              { icon: ActivityIcon, label: "Realtime" },
              { icon: CheckCircleIcon, label: "API-first" },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.label} className="rounded-xl border border-white/10 bg-white/[0.07] p-4">
                  <Icon className="text-emerald-200" />
                  <p className="mt-4 text-sm font-semibold">{item.label}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="bg-white p-6 md:p-10">
          <Card className="h-full border-black/[0.06] p-6 shadow-none md:p-8">
            <p className="text-sm font-bold uppercase text-accent">Tracker Pro</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal text-text">Вход в рабочее пространство</h2>
            <p className="mt-3 text-sm leading-6 text-text/56">
              Демо-доступ уже подставлен, чтобы быстро проверить весь поток от фронтенда до API и базы.
            </p>

            <form
              className="mt-8 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                mutation.mutate();
              }}
            >
              <label className="block text-sm font-semibold text-text">
                <span className="mb-2 block text-text/54">Email</span>
                <Input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="rounded-lg border-[#d7dde8] bg-[#f8fafc] py-3.5"
                />
              </label>

              <label className="block text-sm font-semibold text-text">
                <span className="mb-2 block text-text/54">Пароль</span>
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="rounded-lg border-[#d7dde8] bg-[#f8fafc] py-3.5"
                />
              </label>

              {mutation.error ? (
                <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                  Не удалось войти. Проверьте, что API и seed-данные запущены.
                </p>
              ) : null}

              <Button
                type="submit"
                variant="primary"
                className="w-full rounded-lg bg-[#111827] py-3.5 text-base hover:bg-[#020617]"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? "Входим..." : "Открыть трекер"}
              </Button>
            </form>
          </Card>
        </section>
      </div>
    </main>
  );
}
