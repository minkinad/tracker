import { IsEmail, IsIn } from "class-validator";
import type { OrganizationRole } from "@tracker/types";

export class CreateInvitationBodyDto {
	@IsEmail()
	email!: string;

	@IsIn(["ADMIN", "MEMBER"])
	role!: Exclude<OrganizationRole, "OWNER">;
}