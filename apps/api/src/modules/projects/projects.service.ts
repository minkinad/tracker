import { ForbiddenException, Injectable } from "@nestjs/common";
import type { CreateProjectDto, ProjectDto } from "@tracker/types";
import { OrganizationsService } from "../organizations/organizations.service";
import { ProjectsRepository } from "./projects.repository";

@Injectable()
export class ProjectsService {
  constructor(
    private readonly projectsRepository: ProjectsRepository,
    private readonly organizationsService: OrganizationsService,
  ) {}

  async list(userId: string, organizationId: string): Promise<ProjectDto[]> {
    const hasAccess = await this.projectsRepository.canAccessOrganization(userId, organizationId);

    if (!hasAccess) {
      throw new ForbiddenException("Access denied to organization projects");
    }

    const projects = await this.projectsRepository.listForUser(userId, organizationId);

    return projects.map((project) => ({
      id: project.id,
      organizationId: project.organizationId,
      key: project.key,
      name: project.name,
      description: project.description,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      taskCount: project._count.tasks,
    }));
  }

  async create(userId: string, dto: CreateProjectDto): Promise<ProjectDto> {
    await this.organizationsService.requirePermission(
      userId,
      dto.organizationId,
      "project:create",
    );

    const project = await this.projectsRepository.create(dto);

    return {
      id: project.id,
      organizationId: project.organizationId,
      key: project.key,
      name: project.name,
      description: project.description,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      taskCount: project._count.tasks,
    };
  }
}
