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
import { assignment_reminder_schedules } from 'src/constant';
import { UpdateUserNotifcationSetttingsDto } from './dto/update-notifcation-service.dto';
import { ReminderService } from 'src/reminder/reminder.service';
import { UpdateReminderScheduleDto } from './dto/update-reminder-schedule.dto';
import { AssignmentProvider } from 'src/common/assignment.provider';
import { UserProvider } from 'src/common/user.provider';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private awsS3Service: AwsS3Service,
    @Inject(forwardRef(() => ReminderService))
    private reminderService: ReminderService,
    private assignmentProvider: AssignmentProvider,
    private userProvider: UserProvider,
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
    // const user = await this.prisma.user.findUnique({
    //   where: {
    //     id,
    //   },
    //   include: {
    //     profile: true,
    //   },
    // });

    // if (!user) {
    //   throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    // }

    // return user;
  }

  private setDefaultReiminderSchedule() {
    const defaultSchedule = assignment_reminder_schedules;
    const defaultPreference = {};
    for (const schedule in defaultSchedule) {
      defaultPreference[schedule] = true;
    }
    return defaultPreference;
  }

  async createUserProfile(userId: number) {
    await this.prisma.profile.create({
      data: {
        user_id: userId,
        notification_preference: {
          assignment_reminder: true,
          push_notification: true,
          email_notification: true,
          // notification: true,
          // reminder: true,
          reminder_schedules: {
            ...this.setDefaultReiminderSchedule(),
          },
        },
      },
    });
  }

  async updateReminderSchedule(
    userId: number,
    data: UpdateReminderScheduleDto,
  ) {
    try {
      const user = await this.findOneById(userId);
      const notificationPreference = user?.profile
        ?.notification_preference as Prisma.JsonObject;

      if (!notificationPreference) {
        throw new HttpException(
          'Notification preference not found',
          HttpStatus.NOT_FOUND,
        );
      }

      const schedule = notificationPreference.reminder_schedules;

      if (!schedule) {
        throw new HttpException(
          'Reminder schedule not found',
          HttpStatus.NOT_FOUND,
        );
      }

      schedule[data.schedule] = data.status;

      await this.prisma.profile.update({
        where: {
          id: userId,
        },
        data: {
          notification_preference: notificationPreference,
        },
      });

      await this.reminderService.reValidateUserAssignmentReminders(userId);
    } catch (error) {
      throw new HttpException(
        'Failed to update reminder schedule status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      console.log(error);
    }
  }

  async updateUserNotifcationSetttings(
    userId: number,
    data: UpdateUserNotifcationSetttingsDto,
  ) {
    const user = await this.findOneById(userId);

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
    } catch (error) {
      console.log(error);
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
          device_type: deviceInfo.device_type ?? '',
          device_id: deviceInfo.device_id,
          device_model: deviceInfo.device_model,
        },
      });

      return true;
    } catch (error) {
      throw new HttpException(
        'Failed to save device token',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      console.log(error);
    }
  }

  async invalidateTokens(tokens: string[]) {
    try {
      await this.prisma.deviceToken.updateMany({
        where: {
          token: {
            in: tokens,
          },
        },
        data: {
          is_active: false,
        },
      });
    } catch (error) {
      throw new HttpException(
        'Failed to invalidate tokens',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      console.log(error);
    }
  }

  async createNewPassword(userId: number, data: CreateNewPasswordDto) {
    try {
      const user = await this.findOneById(userId);

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
    } catch (error) {
      throw new HttpException(
        'Failed to update password',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      console.log(error);
    }
  }

  private async deleteIfuUserhaveProfilePicture(userId: number) {
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
    } catch (error) {
      throw new HttpException(
        'Failed to delete profile picture',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      console.log(error);
    }
  }

  async updateProfilePicture(userId: number, file: Express.Multer.File) {
    try {
      const user = await this.findOneById(userId);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      const uploadedFiles = await this.awsS3Service.uploadFiles(
        [file],
        'profile-pictures',
      );
      await this.deleteIfuUserhaveProfilePicture(user.id);
      await this.prisma.attachment.createMany({
        data: uploadedFiles.map((file) => ({
          reference_id: user.id,
          reference_model: Prisma.ModelName.User,
          file_name: file.file_name,
          file_type: file.file_type,
          file_size: file.file_size,
          storage_type: file.storage_type,
          file_url: (process.env.AWS_S3_BUCKET_URL ?? '') + file.storage_key,
          storage_key: file.storage_key,
        })),
      });
      const updatedUser = await this.prisma.profile.update({
        where: {
          user_id: userId,
        },
        data: {
          profile_picture: uploadedFiles[0].storage_key,
        },
      });
      return updatedUser;
    } catch (error) {
      throw new HttpException(
        'Failed to update profile picture',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      console.log(error);
    }
  }
}
