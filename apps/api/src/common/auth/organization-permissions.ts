import type { OrganizationRole } from "@tracker/types";

export const ORGANIZATION_PERMISSIONS = [
	"organization:read",
	"member:list",
	"member:invite",
	"project:list",
	"project:create",
	"task:read",
	"task:create",
	"task:update",
	"task:comment",
	"task:activity:read",
] as const;

export type OrganizationPermission = (typeof ORGANIZATION_PERMISSIONS) [number];

export const ROLE_PERMISSIONS: Record<OrganizationRole,readonly OrganizationPermission[] > = {
	OWNER: ORGANIZATION_PERMISSIONS,

	ADMIN: [
		"organization:read",
		"member:list",
		"member:invite",
		"project:list",
		"project:create",
		"task:read",
		"task:create",
		"task:update",
		"task:comment",
		"task:activity:read",
	],

	MEMBER: [
		"organization:read",
		"member:list",
		"project:list",
		"task:read",
		"task:create",
		"task:update",
		"task:comment",
		"task:activity:read",
	],
};

export function roleHasPermission(
	role: OrganizationRole,
	permission: OrganizationPermission,
): boolean {
	return ROLE_PERMISSIONS[role].includes(permission);
}