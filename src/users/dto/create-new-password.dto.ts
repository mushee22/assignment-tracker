import { IsNotEmpty, MinLength } from 'class-validator';

export class CreateNewPasswordDto {
  @IsNotEmpty()
  @MinLength(6)
  old_password: string;

  @IsNotEmpty()
  @MinLength(6)
  new_password: string;
}
