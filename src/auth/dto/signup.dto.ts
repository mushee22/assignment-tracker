import { IsEmail, IsNotEmpty, IsOptional, MinLength } from 'class-validator';

export class SignupDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  name: string;

  @IsOptional()
  phone: string;

  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
