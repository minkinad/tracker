import { ForbiddenException, Injectable } from "@nestjs/common";
import type { OrganizationDto, OrganizationRole } from "@tracker/types";
import {
  roleHasPermission,
  type OrganizationPermission,
} from "../../common/auth/organization-permissions";
import { OrganizationsRepository } from "./organizations.repository";

@Injectable()
export class OrganizationsService {
  constructor(private readonly organizationsRepository: OrganizationsRepository) {}

  async listForUser(userId: string): Promise<OrganizationDto[]> {
    const memberships = await this.organizationsRepository.listForUser(userId);

    return memberships.map((membership) => ({
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
      role: membership.role,
    }));
  }

  async requireRole(
    userId: string,
    organizationId: string,
    allowedRoles: readonly OrganizationRole[],
  ) {
    const membership = await this.organizationsRepository.findMembership(
      userId,
      organizationId,
    );

    if (!membership || !allowedRoles.includes(membership.role)) {
      throw new ForbiddenException("Insufficient organization permissions");
    }

    return membership;
  }

  async requirePermission(
    userId: string,
    organizationId: string,
    permission: OrganizationPermission,
  ) {
    const membership = await this.organizationsRepository.findMembership(
      userId,
      organizationId,
    );

    if (!membership || !roleHasPermission(membership.role, permission)) {
      throw new ForbiddenException("Insufficient organization permissions");
    }

    return membership;
  }
}
