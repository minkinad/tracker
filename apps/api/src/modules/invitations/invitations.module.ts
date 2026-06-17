import { Module } from "@nestjs/common";
import { OrganizationsModule } from "../organizations/organizations.module";
import { InvitationsController } from "./invitations.controller";
import { InvitationsRepository } from "./invitations.repository";
import { InvitationsService } from "./invitations.service";

@Module({
	imports: [OrganizationsModule],
	controllers: [InvitationsController],
	providers: [InvitationsService, InvitationsRepository],
})
export class InvitationsModule {}