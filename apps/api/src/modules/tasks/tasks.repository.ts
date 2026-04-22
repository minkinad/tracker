import { Injectable } from "@nestjs/common";
import { Prisma } from "@tracker/db";
import type { TaskFiltersDto } from "@tracker/types";
import { PrismaService } from "../../common/prisma/prisma.service";

@Injectable()
export class TasksRepository {
  constructor(private readonly prisma: PrismaService) {}

  private buildWhere(userId: string, filters: TaskFiltersDto): Prisma.TaskWhereInput {
    return {
      projectId: filters.projectId,
      project: {
        organization: {
          memberships: {
            some: { userId },
          },
        },
      },
      ...(filters.search
        ? {
            OR: [
              {
                title: {
                  contains: filters.search,
                  mode: "insensitive",
                },
              },
              {
                description: {
                  contains: filters.search,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.priority ? { priority: filters.priority } : {}),
      ...(filters.assigneeId === "unassigned"
        ? { assigneeId: null }
        : filters.assigneeId
          ? { assigneeId: filters.assigneeId }
          : {}),
    };
  }

  async list(userId: string, filters: TaskFiltersDto) {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const where = this.buildWhere(userId, filters);

    const [data, total] = await this.prisma.$transaction([
      this.prisma.task.findMany({
        where,
        include: {
          assignee: true,
          creator: true,
          _count: {
            select: {
              comments: true,
            },
          },
        },
        orderBy: [
          { status: "asc" },
          { priority: "desc" },
          { updatedAt: "desc" },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.task.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  findProjectWithAccess(projectId: string, userId: string) {
    return this.prisma.project.findFirst({
      where: {
        id: projectId,
        organization: {
          memberships: {
            some: { userId },
          },
        },
      },
    });
  }

  userCanAccessProject(projectId: string, userId: string) {
    return this.prisma.project.findFirst({
      where: {
        id: projectId,
        organization: {
          memberships: {
            some: { userId },
          },
        },
      },
      select: {
        id: true,
      },
    });
  }

  create(projectId: string, actorId: string, data: { title: string; description?: string; status?: string; priority?: string; assigneeId?: string | null }) {
    return this.prisma.task.create({
      data: {
        projectId,
        creatorId: actorId,
        title: data.title,
        description: data.description ?? null,
        status: data.status as never,
        priority: data.priority as never,
        assigneeId: data.assigneeId ?? null,
      },
      include: {
        assignee: true,
        creator: true,
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });
  }

  findById(taskId: string, userId: string) {
    return this.prisma.task.findFirst({
      where: {
        id: taskId,
        project: {
          organization: {
            memberships: {
              some: { userId },
            },
          },
        },
      },
      include: {
        assignee: true,
        creator: true,
        comments: {
          include: {
            author: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        activities: {
          include: {
            actor: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });
  }

  update(taskId: string, data: { title?: string; description?: string | null; status?: string; priority?: string; assigneeId?: string | null }) {
    return this.prisma.task.update({
      where: { id: taskId },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.status !== undefined ? { status: data.status as never } : {}),
        ...(data.priority !== undefined ? { priority: data.priority as never } : {}),
        ...(data.assigneeId !== undefined ? { assigneeId: data.assigneeId } : {}),
      },
      include: {
        assignee: true,
        creator: true,
        comments: {
          include: {
            author: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        activities: {
          include: {
            actor: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });
  }
}
