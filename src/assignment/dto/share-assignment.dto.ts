import { IsNotEmpty, IsString } from 'class-validator';

export class ShareAssignmentDto {
  @IsNotEmpty()
  @IsString()
  email: string[];
}
