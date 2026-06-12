import { createHash, randomBytes } from "node:crypto";
import {
	ConflictException,
	Injectable,
	UnauthorizedException,
} from "@nestjs/common";
import { hash } from "bcryptjs";
import type { OrganizationRole } from "@tracker/types";
import { OrganizationsService } from "../organizations/organizations.service";
import type { AcceptInvitationBodyDto } from "./dto/accept-invitation.dto";
import type { CreateInvitationBodyDto } from "./dto/create-invitation.dto";
import { InvitationsRepository } from "./invitations.repository";

const INVITATION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function hashToken(token: string): string {
	return createHash("sha256").update(token).digest("hex");
}

@Injectable()
export class InvitationsService {
	constructor(
		private readonly invitationsRepository: InvitationsRepository,
		private readonly organizationsService: OrganizationsService,
	) {}

	async createInvitation(
		organizationId: string,
		invitedById: string,
		dto: CreateInvitationBodyDto,
	) {
		await this.organizationsService.requireRole(
			invitedById,
			organizationId,
			["OWNER", "ADMIN"],
		);

		const email = dto.email.trim().toLowerCase();
		const token = randomBytes(32).toString("base64url");
		const tokenHash = hashToken(token);
		const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);

		const invitation = 
			await this.invitationsRepository.upsertInvitation({
				organizationId,
				email,
				role: dto.role,
				tokenHash,
				expiresAt,
				invitedById,
			});

		return {
			id: invitation.id,
			email: invitation.email,
			role: invitation.role,
			expiresAt: invitation.expiresAt,
			token,
		};

	}

	async acceptInvitation(dto: AcceptInvitationBodyDto) {
		const tokenHash = hashToken(dto.token);

		const invitation = 
			await this.invitationsRepository.findActiveByTokenHash(
				tokenHash,
			);

		if (!invitation) {
			throw new UnauthorizedException(
				"Invitation is invalid or expired",
			);
		}

		const passwordHash = await hash(dto.password, 10);

		const result = 
			await this.invitationsRepository.acceptInvitation({
				invitationId: invitation.id,
				organizationId: invitation.organizationId,
				email: invitation.email,
				role: invitation.role as OrganizationRole,
				name: dto.name.trim(),
				passwordHash,
			});

		if (!result) {
			throw new ConflictException(
				"Invitation has already been accepted",
			);
		}

		return {
			user: {
				id: result.user.id,
				email: result.user.email,
				name: result.user.name,
			},
			organizationId: result.membership.organizationId,
			role: result.membership.role,
		};
	}
}
