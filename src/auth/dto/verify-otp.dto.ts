import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';
export class VerifyOtpDto {
  @IsNotEmpty()
  @MinLength(4)
  otp: number;

  @IsNotEmpty()
  token: string;

  @IsNotEmpty()
  type: 'register' | 'reset-password';
}
