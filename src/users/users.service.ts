import {
  HttpException,
  HttpStatus,
  Injectable,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserCreateDto } from './dto/user.dto';
import { Prisma, User } from '@prisma/client';
import { SaveDeviceTokenDto } from './dto/save-device-token.dto';
import { CreateNewPasswordDto } from './dto/create-new-password.dto';
import { comparePasswords, hashPassword } from 'src/lib/security';
import { AwsS3Service } from 'src/aws-s3/aws-s3.service';
import { assignment_reminder_schedules, deviceTokenTypes } from 'src/constant';
import { UpdateUserNotifcationSetttingsDto } from './dto/update-notifcation-service.dto';
import { ReminderService } from 'src/reminder/reminder.service';
import { UpdateReminderScheduleDto } from './dto/update-reminder-schedule.dto';
import { AssignmentProvider } from 'src/common/assignment.provider';
import { UserProvider } from 'src/common/user.provider';
import { AttachmentService } from 'src/common/attachment.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private awsS3Service: AwsS3Service,
    @Inject(forwardRef(() => ReminderService))
    private reminderService: ReminderService,
    private assignmentProvider: AssignmentProvider,
    private userProvider: UserProvider,
    private attachmentService: AttachmentService,
  ) {}

  async findByEmail(email: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: {
          mode: 'insensitive',
          equals: email,
        },
      },
    });
    return user;
  }

  async findOneById(id: number) {
    return await this.userProvider.findOneById(id);
  }

  async getUserDetais(id: number) {
    const user = await this.userProvider.findOneById(id);
    const userAssignments = await this.prisma.assignment.groupBy({
      where: {
        user_id: id,
      },
      by: ['status'],
      _count: true,
    });
    return {
      user,
      statistics: userAssignments,
    };
  }

  async createUserProfile(userId: number) {
    await this.prisma.profile.create({
      data: {
        user_id: userId,
        notification_preference: {
          assignment_reminder: true,
          push_notification: true,
          email_notification: true,
        },
      },
    });
  }

  async updateReminderSchedule(
    userId: number,
    data: UpdateReminderScheduleDto,
  ) {
    try {
      const user = await this.userProvider.findOneById(userId);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      const isExist = await this.userProvider.getUserScheduleBySchedule(
        userId,
        data.schedule,
      );

      if (isExist) {
        const updatedSchedule = await this.updateSchedule(
          userId,
          isExist.id,
          data.status,
        );
        return updatedSchedule;
      }

      const createdSchedule = await this.createCustomeSchedule(
        userId,
        data.schedule,
        data.status,
      );

      await this.reminderService.reValidateUserAssignmentReminders(userId);
      return createdSchedule;
    } catch (_error) {
      throw new HttpException(
        'Failed to update reminder schedule status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async removeReminderReminderSchedule(userId: number, schedule: string) {
    const user = await this.userProvider.findOneById(userId);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const scheduleExist = await this.prisma.schedule.findFirst({
      where: {
        user_id: userId,
        schedule,
      },
    });

    if (!scheduleExist) {
      throw new HttpException(
        'Reminder schedule not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (scheduleExist.is_default) {
      throw new HttpException(
        'Default schedule cannot be removed',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.prisma.schedule.delete({
      where: {
        id: scheduleExist.id,
      },
    });
  }

  async updateUserNotifcationSetttings(
    userId: number,
    data: UpdateUserNotifcationSetttingsDto,
  ) {
    const user = await this.userProvider.findOneById(userId);

    const notificationPreference = user?.profile
      ?.notification_preference as Prisma.JsonObject;

    if (!notificationPreference) {
      throw new HttpException(
        'Notification preference not found',
        HttpStatus.NOT_FOUND,
      );
    }

    notificationPreference.assignment_reminder =
      data.assignment_reminder ?? notificationPreference.assignment_reminder;
    notificationPreference.push_notification =
      data.push_notification ?? notificationPreference.push_notification;
    notificationPreference.email_notification =
      data.email_notification ?? notificationPreference.email_notification;

    await this.prisma.profile.update({
      where: {
        id: userId,
      },
      data: {
        notification_preference: notificationPreference,
      },
    });

    // await this.reminderService.reValidateUserAssignmentReminders(userId);
  }

  async updatedUser(
    id: number,
    data: Partial<Omit<User, 'id' | 'notification_preference'>>,
  ) {
    try {
      const updatedUser = await this.prisma.user.update({
        where: {
          id,
        },
        data,
      });

      return updatedUser;
    } catch (_error) {
      throw new HttpException(
        'Failed to update user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createUser(data: UserCreateDto) {
    const createdUser = await this.prisma.user.create({
      data,
    });
    await this.createUserProfile(createdUser.id);
    await this.setDefaultReiminderSchedule(createdUser.id);
    return createdUser;
  }

  async verifyUser(userId: number) {
    try {
      const user = await this.prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          is_verified: true,
        },
      });
      await this.assignmentProvider.mapUserToSharedAssignment(
        user.email,
        user.id,
      );
    } catch (_error) {
      throw new HttpException(
        'Failed to verify user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteUserById(id: number) {
    try {
      await this.prisma.user.delete({
        where: {
          id,
        },
      });
    } catch (_error) {
      throw new Error('User deletion failed');
    }
  }

  async saveUserDeviceToken(userId: number, deviceInfo: SaveDeviceTokenDto) {
    try {
      const isAlreadyExist = await this.prisma.deviceToken.findFirst({
        where: {
          user_id: userId,
          token: deviceInfo.token,
        },
      });

      if (isAlreadyExist && isAlreadyExist.is_active) {
        return true;
      }

      if (isAlreadyExist && !isAlreadyExist.is_active) {
        await this.prisma.deviceToken.update({
          where: {
            id: isAlreadyExist.id,
          },
          data: {
            is_active: true,
          },
        });
      }

      await this.prisma.deviceToken.create({
        data: {
          user_id: userId,
          token: deviceInfo.token,
          device_type: deviceInfo.device_type
            ? deviceTokenTypes[
                deviceInfo.device_type as keyof typeof deviceTokenTypes
              ]
            : deviceTokenTypes.none,
          device_id: deviceInfo.device_id,
          device_model: deviceInfo.device_model,
        },
      });

      return true;
    } catch (_error) {
      throw new HttpException(
        'Failed to save device token',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createNewPassword(userId: number, data: CreateNewPasswordDto) {
    try {
      const user = await this.userProvider.findUserWithPassword(userId);

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      const isSame = await comparePasswords(
        data.old_password,
        user.hashed_password ?? '',
      );

      if (!isSame) {
        throw new HttpException(
          'Old password does not match',
          HttpStatus.BAD_REQUEST,
        );
      }

      const hashedPassword = await hashPassword(data.new_password);

      const updatedUser = await this.updatedUser(userId, {
        hashed_password: hashedPassword,
      });

      return updatedUser;
    } catch (_error) {
      throw new HttpException(
        'Failed to update password',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateProfilePicture(userId: number, file: Express.Multer.File) {
    try {
      const user = await this.userProvider.findOneById(userId);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      await this.deleteIfUserhaveProfilePicture(user.id);

      const uploadedFiles = await this.attachmentService.uploadAttachent(
        [file],
        user.id,
        Prisma.ModelName.User,
        'profile-pictures',
      );
      const updatedUser = await this.prisma.profile.update({
        where: {
          user_id: userId,
        },
        data: {
          profile_picture: uploadedFiles?.[0].storage_key
            ? (process.env.AWS_S3_BUCKET_URL ?? '') +
              uploadedFiles?.[0].storage_key
            : '',
        },
      });
      return updatedUser;
    } catch (_error) {
      console.log(_error);
      throw new HttpException(
        'Failed to update profile picture',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateUserTokens(userId: number, isActive?: boolean, token?: string) {
    try {
      await this.prisma.deviceToken.updateMany({
        where: {
          user_id: userId,
          ...(token ? { token } : {}),
        },
        data: {
          is_active: isActive ?? false,
        },
      });
    } catch (_error) {
      throw new HttpException(
        'Failed to deactivate user tokens',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async deleteIfUserhaveProfilePicture(userId: number) {
    try {
      const attachment = await this.prisma.attachment.findFirst({
        where: {
          reference_id: userId,
          reference_model: Prisma.ModelName.User,
        },
      });
      if (attachment) {
        this.awsS3Service.deleteFile([attachment.storage_key!]);
        await this.prisma.attachment.delete({
          where: {
            id: attachment.id,
          },
        });
      }
    } catch (_error) {
      throw new HttpException(
        'Failed to delete profile picture',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async createCustomeSchedule(
    userId: number,
    schedule: string,
    isEnabled: boolean,
  ) {
    await this.prisma.schedule.create({
      data: {
        user_id: userId,
        schedule,
        is_enabled: isEnabled,
        is_default: false,
      },
    });
  }

  private async updateSchedule(
    userId: number,
    scheduleId: number,
    isEnabled: boolean,
  ) {
    await this.prisma.schedule.update({
      where: {
        user_id: userId,
        id: scheduleId,
      },
      data: {
        is_enabled: isEnabled,
      },
    });
  }

  private async setDefaultReiminderSchedule(userId: number) {
    const defaultSchedule = assignment_reminder_schedules;
    await this.prisma.schedule.createMany({
      data: defaultSchedule.map((schedule) => ({
        user_id: userId,
        schedule,
        is_enabled: true,
        is_default: true,
      })),
    });
  }
}
