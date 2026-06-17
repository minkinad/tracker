import { Module } from "@nestjs/common";
import { OrganizationsModule } from "../organizations/organizations.module";
import { RealtimeModule } from "../realtime/realtime.module";
import { ActivityRepository } from "./activity.repository";
import { CommentsRepository } from "./comments.repository";
import { TaskActivityEventHandler } from "./events/task-activity-event.handler";
import { TaskCacheEventHandler } from "./events/task-cache-event.handler";
import {
  TASK_DOMAIN_EVENT_HANDLERS,
  type TaskDomainEventHandler,
} from "./events/task-domain-event-handler";
import { TaskEventsService } from "./events/task-events.service";
import { TaskRealtimeEventHandler } from "./events/task-realtime-event.handler";
import { TasksController } from "./tasks.controller";
import { TasksRepository } from "./tasks.repository";
import { TasksService } from "./tasks.service";

@Module({
  imports: [RealtimeModule, OrganizationsModule],
  controllers: [TasksController],
  providers: [
    TasksService,
    TasksRepository,
    CommentsRepository,
    ActivityRepository,
    TaskEventsService,
    TaskActivityEventHandler,
    TaskCacheEventHandler,
    TaskRealtimeEventHandler,
    {
      provide: TASK_DOMAIN_EVENT_HANDLERS,
      useFactory: (
        activityHandler: TaskActivityEventHandler,
        cacheHandler: TaskCacheEventHandler,
        realtimeHandler: TaskRealtimeEventHandler,
      ): TaskDomainEventHandler[] => [activityHandler, cacheHandler, realtimeHandler],
      inject: [TaskActivityEventHandler, TaskCacheEventHandler, TaskRealtimeEventHandler],
    },
  ],
})
export class TasksModule {}
