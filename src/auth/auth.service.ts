import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Role, SocialLoginType, User } from '@prisma/client';
import { SocialLoginService } from 'src/common/social-login.service';
import { comparePasswords, hashPassword } from 'src/lib/security';
import { MailService } from 'src/mail/mail.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { TokenService } from 'src/token/token.service';
import { UsersService } from 'src/users/users.service';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SignupDto } from './dto/signup.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private prisma: PrismaService,
    private mailService: MailService,
    private tokenService: TokenService,
    private socialLoginService: SocialLoginService,
  ) {}

  async login(data: LoginDto) {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          email: {
            mode: 'insensitive',
            equals: data.email,
          },
        },
        select: {
          id: true,
          email: true,
          name: true,
          hashed_password: true,
          is_verified: true,
        },
      });

      if (!user || !user.is_verified) {
        throw new HttpException('User not found', HttpStatus.BAD_REQUEST);
      }

      const isPasswordValid = await comparePasswords(
        data.password,
        user.hashed_password ?? '',
      );

      if (!isPasswordValid) {
        throw new HttpException('Invalid credentials', HttpStatus.BAD_REQUEST);
      }

      const createdToken = this.tokenService.createToken({ userId: user.id });
      return createdToken;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
    }
  }

  async signUp(data: SignupDto) {
    let createdUser: User | null = null;
    try {
      const user = await this.usersService.findByEmail(data.email);
      if (user && user.is_verified) {
        throw new HttpException('User already exists', HttpStatus.BAD_REQUEST);
      }

      if (user && !user.is_verified) {
        const hashedPassword = await hashPassword(data.password);

        await this.usersService.updatedUser(user.id, {
          name: data.name,
          phone: data.phone,
          hashed_password: hashedPassword,
        });

        const otp = this.generateOtp();
        const otpId = await this.sendOtp(user.id, data.email, data.name, otp);

        const token = this.tokenService.createToken({
          userId: user.id,
          otpId: otpId,
        });
        return token;
      }

      const hashedPassword = await hashPassword(data.password);

      createdUser = await this.usersService.createUser({
        email: data.email,
        hashed_password: hashedPassword,
        name: data.name,
        phone: data.phone,
        role: Role.USER,
        is_verified: false,
      });

      const otp = this.generateOtp();

      const otpId = await this.sendOtp(
        createdUser.id,
        data.email,
        data.name,
        otp,
      );

      const token = this.tokenService.createToken({
        userId: createdUser.id,
        otpId: otpId,
      });
      return token;
    } catch (_error) {
      console.log(_error);
      if (createdUser) {
        await this.usersService.deleteUserById(createdUser.id);
      }
      throw _error;
    }
  }

  async forgotpassword(email: string) {
    try {
      const user = await this.usersService.findByEmail(email);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      const otp = this.generateOtp();
      const otpId = await this.sendOtp(user.id, email, user.name, otp);
      const token = this.tokenService.createToken({
        userId: user.id,
        email: user.email,
        otpId: otpId,
      });
      return token;
    } catch (_error) {
      throw new HttpException(
        'Failed to send OTP',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    try {
      const payload = this.tokenService.verifyToken(resetPasswordDto.token);
      const user = await this.usersService.findOneById(payload.userId);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      const hashedPassword = await hashPassword(resetPasswordDto.password);
      await this.usersService.updatedUser(user.id, {
        hashed_password: hashedPassword,
      });
    } catch (_error) {
      throw new HttpException(
        'Failed to update password',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async verifyToken(data: VerifyOtpDto) {
    try {
      const payload = this.tokenService.verifyToken(data.token);
      const user = await this.usersService.findOneById(payload.userId);

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      const isVerified = user.is_verified;

      if (data.type == 'reset-password' && !isVerified) {
        throw new HttpException('User not verified', HttpStatus.BAD_REQUEST);
      }

      if (data.type == 'register' && isVerified) {
        throw new HttpException(
          'User already verified',
          HttpStatus.BAD_REQUEST,
        );
      }

      const isOTPVerified = await this.verifyOTP(
        payload.otpId!,
        user.id,
        data.otp,
      );

      if (!isOTPVerified) {
        throw new HttpException('Invalid OTP', HttpStatus.BAD_REQUEST);
      }

      if (data.type == 'register') {
        await this.usersService.verifyUser(user.id);
      }

      const createdToken = this.tokenService.createToken(
        {
          userId: user.id,
          email: user.email,
        },
        {
          expiresIn: data.type == 'register' ? '2y' : '10m',
        },
      );

      return createdToken;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to verify OTP',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async resendOtp(token: string) {
    try {
      const payload = this.tokenService.verifyToken(token);
      if (!payload.userId) {
        throw new HttpException('Invalid token', HttpStatus.UNAUTHORIZED);
      }
      const user = await this.usersService.findOneById(payload.userId);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      const otp = this.generateOtp();
      const otpId = await this.sendOtp(user.id, user.email, user.name, otp);
      const newToken = this.tokenService.createToken({
        userId: user.id,
        otpId: otpId,
      });
      return newToken;
    } catch (_error) {
      if (_error instanceof HttpException) {
        throw _error;
      }
      console.log(_error);

      throw new HttpException(
        'Failed to resend OTP',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async socialLogin(token: string, type: SocialLoginType) {
    switch (type) {
      case 'APPLE':
        return await this.appleSignIn(token);
      case 'GOOGLE':
        return await this.googleSignIn(token);
      default:
        throw new HttpException('type is not found', HttpStatus.BAD_REQUEST);
    }
  }

  async logout(userId: number) {
    const user = await this.usersService.findOneById(userId);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    await this.usersService.updateUserTokens(user.id, false);
  }

  async deleteAccount(data: LoginDto) {
    const user = await this.usersService.findByEmail(data.email);

    if (!user) {
      throw new HttpException('user is not found', HttpStatus.BAD_REQUEST);
    }

    const isPasswordValid = await comparePasswords(
      data.password,
      user.hashed_password ?? '',
    );

    if (!isPasswordValid) {
      throw new HttpException('user is not found', HttpStatus.BAD_REQUEST);
    }

    return {
      message:
        'Your account deletion request has been received. We will process it within 15 days.',
      ticket_id: `DEL-${user.id}`,
    };
  }

  private async googleSignIn(token: string) {
    try {
      const payload = await this.socialLoginService.verifyGoogleToken(token);
      if (!payload || !payload.email) {
        throw new HttpException('Invalid token', HttpStatus.UNAUTHORIZED);
      }
      let user = await this.usersService.findByEmail(payload.email);
      if (!user) {
        user = await this.usersService.createUser({
          email: payload.email,
          name: payload.name ?? '',
          role: Role.USER,
          is_verified: true,
        });
      }
      await this.updateSocialLoginData(user.id, 'GOOGLE', payload.sub);
      const authToken = this.tokenService.createToken({ userId: user.id });
      return authToken;
    } catch (_error) {
      throw new HttpException('Invalid token', HttpStatus.UNAUTHORIZED);
    }
  }

  private async appleSignIn(token: string) {
    try {
      const payload = await this.socialLoginService.verifyAppleToken(token);
      if (!payload || typeof payload == 'string') {
        throw new HttpException('Invalid token', HttpStatus.UNAUTHORIZED);
      }
      let user = await this.usersService.findByEmail(payload.email as string);
      if (!user) {
        user = await this.usersService.createUser({
          email: payload.email as string,
          name: '',
          role: Role.USER,
          is_verified: true,
        });
      }
      await this.updateSocialLoginData(user.id, 'APPLE', payload.sub as string);
      const authToken = this.tokenService.createToken({ userId: user.id });
      return authToken;
    } catch (_error) {
      throw new HttpException('Invalid token', HttpStatus.UNAUTHORIZED);
    }
  }

  private async updateSocialLoginData(
    userId: number,
    type: string,
    id: string,
  ) {
    const user = await this.usersService.findOneById(userId);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const socialLoginData = user?.social_login_data as string | undefined;
    const parsedSocialLoginData = (
      socialLoginData ? JSON.parse(socialLoginData) : {}
    ) as Record<string, string>;
    parsedSocialLoginData[type] = id;
    await this.usersService.updatedUser(userId, {
      social_login_data: JSON.stringify(parsedSocialLoginData),
    });
  }

  private generateOtp(): number {
    if (process.env.NODE_ENV === 'development') {
      return 1234;
    }
    return Math.floor(1000 + Math.random() * 9000);
  }

  private async sendOtp(
    userId: number,
    email: string,
    name: string,
    otp: number,
  ) {
    await this.mailService.sendOTPMail(email, name, otp);
    return await this.saveOTP(userId, otp);
  }

  private async verifyOTP(otpId: number, userId: number, otp: number) {
    try {
      const otpRecord = await this.prisma.oTP.findFirst({
        where: {
          id: otpId,
          user_id: userId,
          otp: `${otp}`,
        },
      });

      if (!otpRecord) {
        throw new HttpException('Invalid OTP', HttpStatus.BAD_REQUEST);
      }

      const isExpired = new Date(otpRecord.expires_at) < new Date();

      if (isExpired) {
        throw new HttpException('OTP expired', HttpStatus.BAD_REQUEST);
      }

      await this.prisma.oTP.delete({
        where: {
          id: otpRecord.id,
        },
      });

      return true;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  private async saveOTP(userId: number, otp: number) {
    try {
      const expiredAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      const createdOTP = await this.prisma.oTP.create({
        data: {
          user_id: userId,
          otp: `${otp}`,
          expires_at: expiredAt,
        },
      });
      return createdOTP.id;
    } catch (_error) {
      throw new HttpException(
        'Failed to save OTP',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
