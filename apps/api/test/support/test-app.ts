import "reflect-metadata";

import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { hash } from "bcryptjs";
import type {
  CreateTaskDto,
  TaskFiltersDto,
  TaskPriority,
  TaskStatus,
  UpdateTaskDto,
} from "@tracker/types";
import { AppModule } from "../../src/app.module";
import { PrismaService } from "../../src/common/prisma/prisma.service";
import { RedisService } from "../../src/common/redis/redis.service";
import { AuthRepository } from "../../src/modules/auth/auth.repository";
import { ActivityRepository } from "../../src/modules/tasks/activity.repository";
import { CommentsRepository } from "../../src/modules/tasks/comments.repository";
import { TasksRepository } from "../../src/modules/tasks/tasks.repository";
import { UsersRepository } from "../../src/modules/users/users.repository";

type UserRole = "ADMIN" | "USER";
type OrganizationRole = "OWNER" | "ADMIN" | "MEMBER";

interface UserRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: UserRole;
}

interface OrganizationRecord {
  id: string;
  name: string;
  slug: string;
}

interface MembershipRecord {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  createdAt: Date;
}

interface ProjectRecord {
  id: string;
  organizationId: string;
  key: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface TaskRecord {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  creatorId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CommentRecord {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ActivityRecord {
  id: string;
  taskId: string;
  actorId: string;
  action: string;
  field: string | null;
  beforeValue: string | null;
  afterValue: string | null;
  createdAt: Date;
}

interface RefreshTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  revokedAt: Date | null;
}

const STATUS_ORDER: Record<TaskStatus, number> = {
  TODO: 0,
  IN_PROGRESS: 1,
  REVIEW: 2,
  DONE: 3,
};

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  URGENT: 3,
};

export const testIds = {
  ownerId: "user-owner",
  engineerId: "user-engineer",
  outsiderId: "user-outsider",
  organizationId: "org-acme",
  externalOrganizationId: "org-external",
  projectId: "project-core",
};

class InMemoryTrackerStore {
  readonly users: UserRecord[];
  readonly organizations: OrganizationRecord[];
  readonly memberships: MembershipRecord[];
  readonly projects: ProjectRecord[];
  readonly tasks: TaskRecord[] = [];
  readonly comments: CommentRecord[] = [];
  readonly activities: ActivityRecord[] = [];
  readonly refreshTokens: RefreshTokenRecord[] = [];
  private nextSequence = 1;

  constructor(passwordHash: string) {
    const now = new Date();

    this.users = [
      {
        id: testIds.ownerId,
        email: "owner@tracker.local",
        name: "Tracker Owner",
        passwordHash,
        role: "ADMIN",
      },
      {
        id: testIds.engineerId,
        email: "engineer@tracker.local",
        name: "Nina Engineer",
        passwordHash,
        role: "USER",
      },
      {
        id: testIds.outsiderId,
        email: "outsider@tracker.local",
        name: "External User",
        passwordHash,
        role: "USER",
      },
    ];

    this.organizations = [
      {
        id: testIds.organizationId,
        name: "Acme Platform",
        slug: "acme-platform",
      },
      {
        id: testIds.externalOrganizationId,
        name: "External Studio",
        slug: "external-studio",
      },
    ];

    this.memberships = [
      {
        id: "membership-owner",
        organizationId: testIds.organizationId,
        userId: testIds.ownerId,
        role: "OWNER",
        createdAt: now,
      },
      {
        id: "membership-engineer",
        organizationId: testIds.organizationId,
        userId: testIds.engineerId,
        role: "MEMBER",
        createdAt: now,
      },
      {
        id: "membership-outsider",
        organizationId: testIds.externalOrganizationId,
        userId: testIds.outsiderId,
        role: "MEMBER",
        createdAt: now,
      },
    ];

    this.projects = [
      {
        id: testIds.projectId,
        organizationId: testIds.organizationId,
        key: "CORE",
        name: "Core Platform",
        description: "Realtime task orchestration for the platform team.",
        createdAt: now,
        updatedAt: now,
      },
    ];
  }

  nextId(prefix: string) {
    const id = `${prefix}-${this.nextSequence}`;
    this.nextSequence += 1;
    return id;
  }

  findUser(userId: string) {
    return this.users.find((user) => user.id === userId) ?? null;
  }

  findOrganization(organizationId: string) {
    return this.organizations.find((organization) => organization.id === organizationId) ?? null;
  }

  findProject(projectId: string) {
    return this.projects.find((project) => project.id === projectId) ?? null;
  }

  hasProjectAccess(userId: string, projectId: string) {
    const project = this.findProject(projectId);
    if (!project) {
      return false;
    }

    return this.memberships.some(
      (membership) =>
        membership.userId === userId && membership.organizationId === project.organizationId,
    );
  }

  serializeTask(task: TaskRecord) {
    const assignee = task.assigneeId ? this.findUser(task.assigneeId) : null;
    const creator = this.findUser(task.creatorId);

    if (!creator) {
      throw new Error(`Missing creator ${task.creatorId}`);
    }

    return {
      ...task,
      assignee,
      creator,
      comments: this.comments
        .filter((comment) => comment.taskId === task.id)
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
        .map((comment) => {
          const author = this.findUser(comment.authorId);

          if (!author) {
            throw new Error(`Missing author ${comment.authorId}`);
          }

          return {
            ...comment,
            author,
          };
        }),
      activities: this.activities
        .filter((activity) => activity.taskId === task.id)
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
        .map((activity) => {
          const actor = this.findUser(activity.actorId);

          if (!actor) {
            throw new Error(`Missing actor ${activity.actorId}`);
          }

          return {
            ...activity,
            actor,
          };
        }),
      _count: {
        comments: this.comments.filter((comment) => comment.taskId === task.id).length,
      },
    };
  }
}

function createUsersRepository(store: InMemoryTrackerStore): UsersRepository {
  return {
    findByEmail(email: string) {
      return Promise.resolve(store.users.find((user) => user.email === email) ?? null);
    },
    findById(id: string) {
      return Promise.resolve(store.findUser(id));
    },
    listOrganizations(userId: string) {
      const memberships = store.memberships
        .filter((membership) => membership.userId === userId)
        .sort((left, right) => {
          const leftOrganization = store.findOrganization(left.organizationId);
          const rightOrganization = store.findOrganization(right.organizationId);

          return (leftOrganization?.name ?? "").localeCompare(rightOrganization?.name ?? "");
        })
        .map((membership) => ({
          ...membership,
          organization: store.findOrganization(membership.organizationId)!,
        }));

      return Promise.resolve(memberships);
    },
    listUsersByOrganization(organizationId: string) {
      const memberships = store.memberships
        .filter((membership) => membership.organizationId === organizationId)
        .sort((left, right) => {
          const leftUser = store.findUser(left.userId);
          const rightUser = store.findUser(right.userId);

          return (leftUser?.name ?? "").localeCompare(rightUser?.name ?? "");
        })
        .map((membership) => ({
          ...membership,
          user: store.findUser(membership.userId)!,
        }));

      return Promise.resolve(memberships);
    },
    listUsersByUserScope(userId: string) {
      const visibleOrganizationIds = new Set(
        store.memberships
          .filter((membership) => membership.userId === userId)
          .map((membership) => membership.organizationId),
      );

      const users = store.users
        .filter((user) =>
          store.memberships.some(
            (membership) =>
              membership.userId === user.id &&
              visibleOrganizationIds.has(membership.organizationId),
          ),
        )
        .sort((left, right) => left.name.localeCompare(right.name));

      return Promise.resolve(users);
    },
  } as UsersRepository;
}

function createAuthRepository(store: InMemoryTrackerStore): AuthRepository {
  return {
    async createRefreshToken(userId: string, tokenHash: string, expiresAt: Date) {
      const record: RefreshTokenRecord = {
        id: store.nextId("refresh"),
        userId,
        tokenHash,
        expiresAt,
        createdAt: new Date(),
        revokedAt: null,
      };

      store.refreshTokens.push(record);
      return record;
    },
    async findValidRefreshTokens(userId: string) {
      return store.refreshTokens
        .filter(
          (token) =>
            token.userId === userId &&
            token.revokedAt === null &&
            token.expiresAt.getTime() > Date.now(),
        )
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
        .map((token) => ({
          id: token.id,
          tokenHash: token.tokenHash,
        }));
    },
    async revokeRefreshToken(tokenId: string) {
      const token = store.refreshTokens.find((record) => record.id === tokenId);

      if (!token) {
        throw new Error(`Refresh token ${tokenId} not found`);
      }

      token.revokedAt = new Date();
      return token;
    },
  } as AuthRepository;
}

function createTasksRepository(store: InMemoryTrackerStore): TasksRepository {
  return {
    async list(userId: string, filters: TaskFiltersDto) {
      const page = filters.page ?? 1;
      const pageSize = filters.pageSize ?? 20;

      const filtered = store.tasks
        .filter((task) => task.projectId === filters.projectId)
        .filter((task) => store.hasProjectAccess(userId, task.projectId))
        .filter((task) =>
          filters.search
            ? [task.title, task.description ?? ""]
                .join(" ")
                .toLowerCase()
                .includes(filters.search.toLowerCase())
            : true,
        )
        .filter((task) => (filters.status ? task.status === filters.status : true))
        .filter((task) => (filters.priority ? task.priority === filters.priority : true))
        .filter((task) => {
          if (!filters.assigneeId) {
            return true;
          }

          if (filters.assigneeId === "unassigned") {
            return task.assigneeId === null;
          }

          return task.assigneeId === filters.assigneeId;
        })
        .sort((left, right) => {
          const statusDelta = STATUS_ORDER[left.status] - STATUS_ORDER[right.status];
          if (statusDelta !== 0) {
            return statusDelta;
          }

          const priorityDelta = PRIORITY_ORDER[right.priority] - PRIORITY_ORDER[left.priority];
          if (priorityDelta !== 0) {
            return priorityDelta;
          }

          return right.updatedAt.getTime() - left.updatedAt.getTime();
        });

      const data = filtered
        .slice((page - 1) * pageSize, page * pageSize)
        .map((task) => store.serializeTask(task));

      return {
        data,
        total: filtered.length,
        page,
        pageSize,
      };
    },
    findProjectWithAccess(projectId: string, userId: string) {
      const project = store.findProject(projectId);

      if (!project || !store.hasProjectAccess(userId, projectId)) {
        return Promise.resolve(null);
      }

      return Promise.resolve(project);
    },
    userCanAccessProject(projectId: string, userId: string) {
      if (!store.hasProjectAccess(userId, projectId)) {
        return Promise.resolve(null);
      }

      return Promise.resolve({ id: projectId });
    },
    async create(projectId: string, actorId: string, data: CreateTaskDto) {
      const now = new Date();
      const task: TaskRecord = {
        id: store.nextId("task"),
        projectId,
        creatorId: actorId,
        title: data.title,
        description: data.description ?? null,
        status: data.status ?? "TODO",
        priority: data.priority ?? "MEDIUM",
        assigneeId: data.assigneeId ?? null,
        createdAt: now,
        updatedAt: now,
      };

      store.tasks.push(task);

      return store.serializeTask(task);
    },
    findById(taskId: string, userId: string) {
      const task = store.tasks.find((item) => item.id === taskId) ?? null;

      if (!task || !store.hasProjectAccess(userId, task.projectId)) {
        return Promise.resolve(null);
      }

      return Promise.resolve(store.serializeTask(task));
    },
    async update(taskId: string, data: UpdateTaskDto) {
      const task = store.tasks.find((item) => item.id === taskId);

      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }

      if (data.title !== undefined) {
        task.title = data.title;
      }

      if (data.description !== undefined) {
        task.description = data.description;
      }

      if (data.status !== undefined) {
        task.status = data.status;
      }

      if (data.priority !== undefined) {
        task.priority = data.priority;
      }

      if (data.assigneeId !== undefined) {
        task.assigneeId = data.assigneeId;
      }

      task.updatedAt = new Date();

      return store.serializeTask(task);
    },
  } as unknown as TasksRepository;
}

function createCommentsRepository(store: InMemoryTrackerStore): CommentsRepository {
  return {
    async create(taskId: string, authorId: string, body: string) {
      const now = new Date();
      const comment: CommentRecord = {
        id: store.nextId("comment"),
        taskId,
        authorId,
        body,
        createdAt: now,
        updatedAt: now,
      };

      store.comments.push(comment);

      return {
        ...comment,
        author: store.findUser(authorId)!,
      };
    },
  } as CommentsRepository;
}

function createActivityRepository(store: InMemoryTrackerStore): ActivityRepository {
  return {
    async create(input: {
      taskId: string;
      actorId: string;
      action: string;
      field?: string | null;
      beforeValue?: string | null;
      afterValue?: string | null;
    }) {
      const activity: ActivityRecord = {
        id: store.nextId("activity"),
        taskId: input.taskId,
        actorId: input.actorId,
        action: input.action,
        field: input.field ?? null,
        beforeValue: input.beforeValue ?? null,
        afterValue: input.afterValue ?? null,
        createdAt: new Date(),
      };

      store.activities.push(activity);

      return {
        ...activity,
        actor: store.findUser(input.actorId)!,
      };
    },
    async list(taskId: string) {
      return store.activities
        .filter((activity) => activity.taskId === taskId)
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
        .map((activity) => ({
          ...activity,
          actor: store.findUser(activity.actorId)!,
        }));
    },
  } as ActivityRepository;
}

function createRedisService(): RedisService {
  const cache = new Map<string, unknown>();

  return {
    async get<T>(key: string): Promise<T | null> {
      return (cache.get(key) as T | undefined) ?? null;
    },
    async set(key: string, value: unknown) {
      cache.set(key, value);
    },
    async deleteByPrefix(prefix: string) {
      for (const key of cache.keys()) {
        if (key.startsWith(prefix)) {
          cache.delete(key);
        }
      }
    },
    async onModuleDestroy() {
      cache.clear();
    },
  } as unknown as RedisService;
}

export interface TestAppContext {
  app: INestApplication;
  baseUrl: string;
  store: InMemoryTrackerStore;
}

export async function createTestApp(): Promise<TestAppContext> {
  process.env.JWT_ACCESS_SECRET = "test-access-secret";
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
  process.env.JWT_ACCESS_TTL = "15m";
  process.env.JWT_REFRESH_TTL = "7d";
  process.env.CORS_ORIGIN = "http://127.0.0.1";

  const passwordHash = await hash("changeme123", 10);
  const store = new InMemoryTrackerStore(passwordHash);

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaService)
    .useValue({})
    .overrideProvider(RedisService)
    .useValue(createRedisService())
    .overrideProvider(UsersRepository)
    .useValue(createUsersRepository(store))
    .overrideProvider(AuthRepository)
    .useValue(createAuthRepository(store))
    .overrideProvider(TasksRepository)
    .useValue(createTasksRepository(store))
    .overrideProvider(CommentsRepository)
    .useValue(createCommentsRepository(store))
    .overrideProvider(ActivityRepository)
    .useValue(createActivityRepository(store))
    .compile();

  const app = moduleRef.createNestApplication();

  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(0, "127.0.0.1");

  const address = app.getHttpServer().address();

  if (!address || typeof address === "string") {
    throw new Error("Unable to resolve test server address");
  }

  return {
    app,
    baseUrl: `http://127.0.0.1:${address.port}`,
    store,
  };
}
