import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { CreateTaskDto, TaskActivityDto, TaskDetailsDto, TaskFiltersDto, TaskListResponseDto, UpdateTaskDto } from "@tracker/types";
import { RedisService } from "../../common/redis/redis.service";
import { ActivityRepository } from "./activity.repository";
import { CommentsRepository } from "./comments.repository";
import { TaskEventsService } from "./events/task-events.service";
import { mapActivity, mapComment, mapTask, mapTaskDetails } from "./task.mapper";
import { TasksRepository } from "./tasks.repository";

@Injectable()
export class TasksService {
  constructor(
    private readonly tasksRepository: TasksRepository,
    private readonly commentsRepository: CommentsRepository,
    private readonly activityRepository: ActivityRepository,
    private readonly redisService: RedisService,
    private readonly taskEventsService: TaskEventsService,
  ) {}

  async list(userId: string, filters: TaskFiltersDto): Promise<TaskListResponseDto> {
    const cacheKey = `tasks:${filters.projectId}:${JSON.stringify(filters)}`;
    const cached = await this.redisService.get<TaskListResponseDto>(cacheKey);

    if (cached) {
      return cached;
    }

    const result = await this.tasksRepository.list(userId, filters);
    const payload: TaskListResponseDto = {
      data: result.data.map(mapTask),
      meta: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / result.pageSize),
      },
    };

    await this.redisService.set(cacheKey, payload, 30);
    return payload;
  }

  async create(projectId: string, userId: string, dto: CreateTaskDto) {
    const project = await this.tasksRepository.findProjectWithAccess(projectId, userId);

    if (!project) {
      throw new ForbiddenException("Access denied to project");
    }

    await this.ensureAssigneeCanAccessProject(projectId, dto.assigneeId);

    const task = await this.tasksRepository.create(projectId, userId, dto);

    await this.taskEventsService.publish({
      type: "task.created",
      projectId,
      taskId: task.id,
      actorId: userId,
      title: task.title,
    });

    return mapTask(task);
  }

  async findById(taskId: string, userId: string): Promise<TaskDetailsDto> {
    const task = await this.tasksRepository.findById(taskId, userId);

    if (!task) {
      throw new NotFoundException("Task not found");
    }

    return mapTaskDetails(task);
  }

  async update(taskId: string, userId: string, dto: UpdateTaskDto): Promise<TaskDetailsDto> {
    const existing = await this.tasksRepository.findById(taskId, userId);

    if (!existing) {
      throw new NotFoundException("Task not found");
    }

    if (dto.assigneeId !== undefined) {
      await this.ensureAssigneeCanAccessProject(existing.projectId, dto.assigneeId);
    }

    const updated = await this.tasksRepository.update(taskId, dto);
    const changes = this.collectChanges(existing, dto);

    await this.taskEventsService.publish({
      type: "task.updated",
      projectId: existing.projectId,
      taskId,
      actorId: userId,
      changes,
    });

    return mapTaskDetails(updated);
  }

  async addComment(taskId: string, userId: string, body: string) {
    const existing = await this.tasksRepository.findById(taskId, userId);

    if (!existing) {
      throw new NotFoundException("Task not found");
    }

    const comment = await this.commentsRepository.create(taskId, userId, body);

    await this.taskEventsService.publish({
      type: "task.commented",
      projectId: existing.projectId,
      taskId,
      actorId: userId,
      body,
    });

    return mapComment(comment);
  }

  async listActivity(taskId: string, userId: string): Promise<TaskActivityDto[]> {
    const existing = await this.tasksRepository.findById(taskId, userId);

    if (!existing) {
      throw new NotFoundException("Task not found");
    }

    const activity = await this.activityRepository.list(taskId);
    return activity.map(mapActivity);
  }

  private collectChanges(
    existing: {
      title: string;
      description: string | null;
      status: string;
      priority: string;
      assigneeId: string | null;
    },
    dto: UpdateTaskDto,
  ) {
    const fields: Array<keyof UpdateTaskDto> = ["title", "description", "status", "priority", "assigneeId"];

    return fields
      .filter((field) => dto[field] !== undefined && dto[field] !== existing[field])
      .map((field) => ({
        field,
        beforeValue: existing[field] ? String(existing[field]) : null,
        afterValue: dto[field] ? String(dto[field]) : null,
      }));
  }

  private async ensureAssigneeCanAccessProject(projectId: string, assigneeId?: string | null) {
    if (!assigneeId) {
      return;
    }

    const project = await this.tasksRepository.userCanAccessProject(projectId, assigneeId);

    if (!project) {
      throw new BadRequestException("Assignee must belong to the project organization");
    }
  }
}
