import { Controller, Post, Body } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Public } from 'src/lib/is-public';
import { SocialLoginType } from '@prisma/client';
import { comparePasswords, hashPassword } from 'src/lib/security';
import { AuthUser } from 'src/users/auth-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() signupDto: SignupDto) {
    const token = await this.authService.signUp(signupDto);
    return [token, 'User Registered Successfully'];
  }

  @Public()
  @Post('verify-otp')
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    const token = await this.authService.verifyToken(verifyOtpDto);
    return [token, 'User Verified Successfully'];
  }

  @Public()
  @Post('resend-otp')
  async resendOtp(@Body('token') token: string) {
    const newToken = await this.authService.resendOtp(token);
    return [newToken, 'OTP Resent Successfully'];
  }

  @Public()
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const token = await this.authService.login(loginDto);
    return [token, 'User Loigined Successfully'];
  }

  @Public()
  @Post('forgot-password')
  async forgetPassword(@Body('email') email: string) {
    const token = await this.authService.forgotpassword(email);
    return [token, 'Password Reset Token Sent Successfully'];
  }

  @Public()
  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    const token = await this.authService.resetPassword(resetPasswordDto);
    return [token, 'Password Reset Successfully'];
  }

  @Public()
  @Post('social-login')
  async googleLogin(
    @Body('token') token: string,
    @Body('type') type: SocialLoginType,
  ) {
    const jwtToken = await this.authService.socialLogin(token, type);
    return [jwtToken, 'Token Verified Successfully'];
  }

  @Public()
  @Post('create-hashed-password')
  async googleLoginRegister(@Body('password') password: string) {
    const hashedPassword = await hashPassword(password);
    return [hashedPassword, 'Password Hased Successfully'];
  }

  @Public()
  @Post('verify-password')
  async verifyPassword(
    @Body('hashed_password') hashedPassword: string,
    @Body('password') password: string,
  ) {
    const isPasswordValid = await comparePasswords(password, hashedPassword);
    return [isPasswordValid, 'Password Verified Successfully'];
  }

  @Post('logout')
  async logout(@AuthUser('id') authId: number) {
    await this.authService.logout(authId);
    return [true, 'User Logged Out Successfully'];
  }
}
