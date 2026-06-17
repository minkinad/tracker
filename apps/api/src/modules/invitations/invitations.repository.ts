import { Injectable } from "@nestjs/common";
import type { OrganizationRole } from "@tracker/types";
import { PrismaService } from "../../common/prisma/prisma.service";

interface UpsertInvitationInput {
	organizationId: string;
	email: string;
	role: Exclude<OrganizationRole, "OWNER">;
	tokenHash: string;
	expiresAt: Date;
	invitedById: string;
}

interface AcceptInvitationInput {
	invitationId: string;
	organizationId: string;
	email: string;
	role: OrganizationRole;
	name: string;
	passwordHash: string;
}

@Injectable()
export class InvitationsRepository {
	constructor(private readonly prisma: PrismaService) {}

	upsertInvitation(input: UpsertInvitationInput) {
		return this.prisma.organizationInvitation.upsert({
			where: {
				organizationId_email: {
					organizationId: input.organizationId,
					email: input.email,
				},
			},
			update: {
				role: input.role,
				tokenHash: input.tokenHash,
				expiresAt: input.expiresAt,
				invitedById: input.invitedById,
				acceptedAt: null,
				revokedAt: null,
			},
			create: input,
		});
	}
	
	findActiveByTokenHash(tokenHash: string) {
		return this.prisma.organizationInvitation.findFirst({
			where: {
				tokenHash,
				acceptedAt: null,
				revokedAt: null,
				expiresAt: {
					gt: new Date(),
				},
			},
		});
	}

	acceptInvitation(input: AcceptInvitationInput) {
		return this.prisma.$transaction(async (transaction) => {
			const claimedInvitation = 
				await transaction.organizationInvitation.updateMany({
					where: {
						id: input.invitationId,
						acceptedAt: null,
						revokedAt: null,
						expiresAt: {
							gt: new Date(),
						},
					},
					data: {
						acceptedAt: new Date(),
					},
				});
			
			if (claimedInvitation.count !== 1) {
				return null;
			}

			const user = await transaction.user.upsert({
				where: {
					email: input.email,
				},
				update: {},
				create: {
					email: input.email,
					name: input.name,
					passwordHash: input.passwordHash,
				},
			});

			const membership = await transaction.organizationMembership.upsert({
				where: {
					organizationId_userId: {
						organizationId: input.organizationId,
						userId: user.id,
					},
				},
				update: {
					role: input.role,
				},
				create: {
					organizationId: input.organizationId,
					userId: user.id,
					role: input.role,
				},
			});
		
			return {
				user,
				membership,
			};
		});		
	}
}