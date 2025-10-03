import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class SignupDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  phone: string;

  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
