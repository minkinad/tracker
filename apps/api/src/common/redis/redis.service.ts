import { Inject, Injectable, OnModuleDestroy, Optional } from "@nestjs/common";
import Redis from "ioredis";

interface RedisClientLike {
  connect(): Promise<unknown>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode: "EX", ttlSeconds: number): Promise<unknown>;
  scan(cursor: string | number, ...args: unknown[]): Promise<[string, string[]]>;
  del(...keys: string[]): Promise<number>;
  quit(): Promise<unknown>;
}

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: RedisClientLike;

  constructor(@Optional() @Inject("REDIS_CLIENT") client?: RedisClientLike) {
    this.client =
      client ??
      new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

    // Redis не должен валить старт API: кеш прогреется, когда сервис станет доступен.
    void this.client.connect().catch(() => undefined);
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number) {
    try {
      await this.client.set(key, JSON.stringify(value), "EX", ttlSeconds);
    } catch {
      // Кеш опционален: ошибки Redis не должны пробрасываться в request path.
    }
  }

  async deleteByPrefix(prefix: string) {
    try {
      let cursor = "0";

      do {
        const [nextCursor, keys] = await this.client.scan(cursor, "MATCH", `${prefix}*`, "COUNT", "100");

        if (keys.length > 0) {
          await this.client.del(...keys);
        }

        cursor = nextCursor;
      } while (cursor !== "0");
    } catch {
      // Инвалидация кеша best-effort: бизнес-операция уже завершилась успешно.
    }
  }

  async onModuleDestroy() {
    await this.client.quit().catch(() => undefined);
  }
}
