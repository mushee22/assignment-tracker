export class VerifyOtpDto {
  otp: number;
  token: string;
  type: 'register' | 'reset-password';
}
