import {
	Body,
	Controller,
	Param,
	Post,
	UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import type { RequestUser } from "../../common/auth/request-user";
import { AcceptInvitationBodyDto } from "./dto/accept-invitation.dto";
import { CreateInvitationBodyDto } from "./dto/create-invitation.dto";
import { InvitationsService } from "./invitations.service";

@Controller()
export class InvitationsController {
	constructor(
		private readonly invitationsService: InvitationsService,
	) {}

	@UseGuards(JwtAuthGuard)
	@Post("organizations/:organizationId/invitations")
	createInvitation(
		@CurrentUser() user: RequestUser,
		@Param("organizationId") organizationId: string,
		@Body() dto: CreateInvitationBodyDto,
	) {
		return this.invitationsService.createInvitation(
			organizationId,
			user.userId,
			dto,
		);
	}

	@Post("auth/invitations/accept")
	acceptInvitation(@Body() dto: AcceptInvitationBodyDto) {
		return this.invitationsService.acceptInvitation(dto);
	}
	
}