import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendOTPMail(to: string, name: string, OTP: number) {
    try {
      await this.mailerService.sendMail({
        to,
        subject: 'Your OTP Code - Verify Your Account',
        template: './otp',
        context: {
          name,
          otp: OTP,
          year: new Date().getFullYear(),
        },
      });
    } catch (_error) {
      console.log(_error);
      throw new HttpException(
        'Failed to send email',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async sendReminder(to: string, name: string, message: string, title: string) {
    try {
      await this.mailerService.sendMail({
        to,
        subject: 'Reminder',
        template: './reminder',
        context: {
          name,
          message,
          title,
          year: new Date().getFullYear(),
        },
      });
    } catch (_error) {
      console.log(_error);
      throw new HttpException(
        'Failed to send email',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async sendAssignmentReminderMail(
    to: string,
    name: string,
    message: string,
    title: string,
    assignmentId: number,
  ) {
    try {
      await this.mailerService.sendMail({
        to,
        subject: 'Assignment Reminder',
        template: './assignment-reminder',
        context: {
          name,
          message,
          link: `${process.env.FRONTEND_URL}/assignment-details?id=${assignmentId}`,
          title,
          year: new Date().getFullYear(),
        },
      });
    } catch (_error) {
      console.log(_error);
      throw new HttpException(
        'Failed to send email',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async sendAssignemntShareMail(
    to: string,
    name: string,
    message: string,
    title: string,
    link: string,
  ) {
    try {
      await this.mailerService.sendMail({
        to,
        subject: 'Assignment Shared',
        template: './assignment-share',
        context: {
          name,
          message,
          link,
          title,
          year: new Date().getFullYear(),
        },
      });
    } catch (_error) {
      console.log(_error);
      throw new HttpException(
        'Failed to send email',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
