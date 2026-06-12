import { IsString, MaxLength, MinLength } from "class-validator";

export class AcceptInvitationBodyDto {
	@IsString()
	@MinLength(32)
	token!: string;

	@IsString()
	@MinLength(2)
	@MaxLength(100)
	name!: string;

	@IsString()
	@MinLength(8)
	password!: string;
}