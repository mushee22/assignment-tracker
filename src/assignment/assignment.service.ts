import { MailerService } from '@nestjs-modules/mailer';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
  Assignment,
  AssignmentStatus,
  NotificationType,
  Priority,
  Prisma,
  ReminderType,
  User,
} from '@prisma/client';
import { UploadResult } from 'src/aws-s3/interface/upload-interface';
import { AssignmentNoteProvider } from 'src/common/assignment-note.provider';
import { AssignmentProvider } from 'src/common/assignment.provider';
import { AttachmentService } from 'src/common/attachment.service';
import { ExpoService } from 'src/common/expo.service';
import { FirebaseService } from 'src/common/firebase.service';
import { UserProvider } from 'src/common/user.provider';
import { PriorityIndex } from 'src/constant';
import {
  generateFindOrderByQuery,
  generateFindWhereQuery,
} from 'src/lib/helper';
import { NotificationService } from 'src/notification/notification.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ReminderService } from 'src/reminder/reminder.service';
import { TokenService } from 'src/token/token.service';
import { AssignmentWithUser, NotificationData } from 'src/type';
import { AssigneFindQuery } from './dto/assignment.dto';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { ShareAssignmentDto } from './dto/share-assignment.dto';
import { UpdateAssignmentNotificationStatusDto } from './dto/update-assignment-notification-status.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { SharedAssignmentQuery } from './interface';

@Injectable()
export class AssignmentService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly reminderService: ReminderService,
    private readonly userProvider: UserProvider,
    private readonly tokenService: TokenService,
    private readonly fcmService: FirebaseService,
    private readonly expoService: ExpoService,
    private readonly mailerService: MailerService,
    private readonly attachmentService: AttachmentService,
    private readonly assignmentProvider: AssignmentProvider,
    private readonly notificationService: NotificationService,
    private readonly assignmentNoteProvider: AssignmentNoteProvider,
  ) {}

  async findAll(userId: number, query: AssigneFindQuery) {
    const whereQuery = generateFindWhereQuery(query);
    const orderByQuery = generateFindOrderByQuery(query);

    const assignments = await this.assignmentProvider.findAll(
      userId,
      whereQuery,
      orderByQuery,
      {
        page: query.page,
        page_size: query.page_size,
        cursor: query.cursor,
      },
    );

    return assignments;
  }

  async getAssignmentDetails(userId: number, id: number) {
    const assignment = await this.findOne(userId, id);
    const attachments = await this.attachmentService.getAttachmentByReferanceId(
      id,
      Prisma.ModelName.Assignment,
    );

    return {
      assignment,
      attachement: attachments,
    };
  }

  async getUserAssignmentStatistics(userId: number) {
    const totalAssignments =
      await this.assignmentProvider.getTotalUserAssignments(userId, true);
    const completedAssignments =
      await this.assignmentProvider.getUserCompletedAssignments(userId, true);
    const pendingAssignments =
      await this.assignmentProvider.getUserPendingAssignments(userId, true);
    const overdueAssignments =
      await this.assignmentProvider.getUserOverdueAssignments(userId, true);

    return {
      total: totalAssignments,
      completed: completedAssignments,
      pending: pendingAssignments,
      overdue: overdueAssignments,
    };
  }

  async findOne(userId: number, id: number) {
    const assignment = await this.assignmentProvider.findOne(userId, id);

    if (!assignment) {
      throw new HttpException('Assignment not found', HttpStatus.NOT_FOUND);
    }

    return assignment;
  }

  async create(
    userId: number,
    createAssignmentDto: CreateAssignmentDto,
    attachments: Array<Express.Multer.File>,
  ) {
    try {
      const user = await this.userProvider.findOneById(userId);
      const notificationPreference = user.profile
        ?.notification_preference as Prisma.JsonObject;
      const isPushNotification =
        notificationPreference?.is_push_notification === 'true';
      const isEmailNotification =
        notificationPreference?.is_email_notification === 'true';

      const { notes, due_date, ...rest } = createAssignmentDto;

      const dueDateString = new Date(due_date).toISOString();

      const created = await this.assignmentProvider.create(userId, {
        ...rest,
        due_date: dueDateString,
        priority_index: PriorityIndex[createAssignmentDto.priority as Priority],
        is_push_notification: createAssignmentDto.is_reminder
          ? true
          : isPushNotification,
        is_email_notification: createAssignmentDto.is_reminder
          ? true
          : isEmailNotification,
        is_reminder: createAssignmentDto.is_reminder,
      });

      if (attachments) {
        await this.attachmentService.uploadAttachent(
          attachments,
          created.id,
          Prisma.ModelName.Assignment,
          'assignments',
        );
      }

      if (notes && notes.length > 0) {
        await this.assignmentNoteProvider.createAssignmentNote(
          created.id,
          notes,
        );
      }

      await this.reminderService.createAssignmentReminder(userId, created.id);

      return created;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw error;
    }
  }

  async update(
    userId: number,
    id: number,
    updateAssignmentDto: UpdateAssignmentDto,
  ) {
    const assignment = await this.findOne(userId, id);

    if (!assignment) {
      throw new HttpException('Assignment not found', HttpStatus.BAD_REQUEST);
    }

    const priorityIndex = updateAssignmentDto.priority
      ? PriorityIndex[updateAssignmentDto.priority]
      : assignment.priority_index;

    const updated = await this.assignmentProvider.update(
      userId,
      assignment.id,
      {
        ...updateAssignmentDto,
        priority_index: priorityIndex,
      },
    );
    await this.reminderService.updateAssignmentReminder(userId, updated.id);

    return updated;
  }

  async markAsDone(userId: number, id: number) {
    const assignment = await this.findOne(userId, id);

    if (assignment.status === AssignmentStatus.COMPLETED) {
      return assignment;
    }

    const updated = await this.assignmentProvider.markAsCompleted(userId, id);

    return updated;
  }

  async markAsCancelled(userId: number, id: number, reason?: string) {
    const assignment = await this.findOne(userId, id);

    if (assignment.status === AssignmentStatus.CANCELLED) {
      return assignment;
    }

    const updated = await this.assignmentProvider.markAsCancelled(
      userId,
      id,
      reason,
    );

    return updated;
  }

  async updateProgress(userId: number, id: number, progress: number) {
    const assignment = await this.findOne(userId, id);

    if (assignment.status !== AssignmentStatus.PENDING) {
      throw new HttpException(
        'Only pending assignments can be updated',
        HttpStatus.BAD_REQUEST,
      );
    }

    const isCompleted = progress >= 100;
    const completedAt = isCompleted ? new Date().toISOString() : undefined;

    const updated = await this.assignmentProvider.update(userId, id, {
      progress,
      status: isCompleted ? AssignmentStatus.COMPLETED : assignment.status,
      completed_at: completedAt,
    });

    return updated;
  }

  async delete(userid: number, id: number) {
    const assignment = await this.findOne(userid, id);
    await this.deleteAttacheMentByAssimentId(assignment.id);
    const deleted = await this.prismaService.assignment.delete({
      where: {
        id: assignment.id,
      },
    });

    await this.reminderService.deleteAssignmentReminder(
      assignment.user_id,
      deleted.id,
      [ReminderType.AUTO, ReminderType.CUSTOM],
    );
    await this.assignmentNoteProvider.deleteAllAssignmentNotes(deleted.id);
  }

  async getAssignmentNotes(userId: number, assignmentId: number) {
    return await this.assignmentNoteProvider.getAssignmentNotes(
      userId,
      assignmentId,
    );
  }

  async addNewAssignmentNote(
    userId: number,
    assignmentId: number,
    note: string,
  ) {
    return await this.assignmentNoteProvider.addAssignmentNotes(
      userId,
      assignmentId,
      note,
    );
  }

  async deleteAssignmentNote(
    userId: number,
    assignmentId: number,
    noteId: number,
  ) {
    return await this.assignmentNoteProvider.deleteAssignmentNotes(
      userId,
      assignmentId,
      noteId,
    );
  }

  async saveUploadedFilesInDb(
    uploadedFiles: UploadResult[],
    assignmentId: number,
  ) {
    return await this.prismaService.attachment.createMany({
      data: uploadedFiles.map((file) => ({
        reference_id: assignmentId,
        reference_model: Prisma.ModelName.Assignment,
        file_name: file.file_name,
        file_type: file.file_type,
        file_size: file.file_size,
        storage_type: file.storage_type,
        file_url: (process.env.AWS_S3_BUCKET_URL ?? '') + file.storage_key,
        storage_key: file.storage_key,
      })),
    });
  }

  async updatedNewAssignmentAttachMents(
    userId: number,
    newAttachments: Array<Express.Multer.File>,
    assignmentId: number,
  ) {
    try {
      if (!newAttachments || newAttachments.length === 0) {
        throw new HttpException(
          'New attachment is required',
          HttpStatus.BAD_REQUEST,
        );
      }
      const assignment = await this.findOne(userId, assignmentId);

      if (!assignment) {
        throw new HttpException('Assignment not found', HttpStatus.BAD_REQUEST);
      }

      if (assignment) {
        await this.attachmentService.uploadAttachent(
          newAttachments,
          assignmentId,
          Prisma.ModelName.Assignment,
          'assignments',
        );
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      new HttpException(
        'Failed to update new attachment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async toggleAssignmentNotificationStatus(
    userId: number,
    assignmentId: number,
    data: UpdateAssignmentNotificationStatusDto,
  ) {
    const assignment = await this.findOne(userId, assignmentId);
    const { is_push_notification, is_email_notification } = data;
    const updated = await this.prismaService.assignment.update({
      where: {
        id: assignment.id,
        user_id: assignment.user_id,
      },
      data: {
        is_push_notification,
        is_email_notification,
      },
    });
    return updated;
  }

  async deleteAssigmentAttachement(
    userId: number,
    assignmentId: number,
    attachmentIds: number[],
  ) {
    try {
      const assignment = await this.findOne(userId, assignmentId);
      const assignmentAttachments =
        await this.attachmentService.getAttachmentByReferanceId(
          assignment.id,
          Prisma.ModelName.Assignment,
        );
      if (assignmentAttachments && assignmentAttachments.length > 0) {
        const filteredAttachments = assignmentAttachments.filter((attachment) =>
          attachmentIds.includes(attachment.id),
        );
        if (filteredAttachments && filteredAttachments.length > 0) {
          await this.attachmentService.deleteAttachementByIds(
            filteredAttachments.map((item) => item.id),
          );
        }
      }
    } catch (error) {
      console.log(error);
    }
  }

  async getAssignmentSharedUsers(userId: number, assignmentId: number) {
    const sharedAssignments =
      await this.prismaService.assignmentMember.findMany({
        where: {
          assignment_id: assignmentId,
          assignment: {
            user_id: userId,
          },
        },
        include: {
          user: true,
        },
      });
    return sharedAssignments;
  }

  async findUserSharedAssignments(userId: number) {
    const sharedAssignments =
      await this.prismaService.assignmentMember.findMany({
        where: {
          user_id: userId,
        },
        include: {
          assignment: true,
        },
      });
    const sharedAssignmentsList = sharedAssignments.map(
      (item) => item.assignment,
    );
    return sharedAssignmentsList;
  }

  async findSharedAssignment(
    id: number,
    data: SharedAssignmentQuery,
    userId?: number,
  ) {
    const sharedAssignment =
      await this.prismaService.assignmentMember.findFirst({
        where: {
          id: id,
        },
        include: {
          assignment: true,
        },
      });

    if (!sharedAssignment) {
      throw new HttpException('Assignment not found', HttpStatus.NOT_FOUND);
    }

    if (userId) {
      if (sharedAssignment.user_id !== userId) {
        throw new HttpException('Assignment not found', HttpStatus.NOT_FOUND);
      }
      if (!sharedAssignment.is_accepted) {
        await this.acceptSharedAssignment(id);
      }
      return sharedAssignment.assignment;
    }

    if (!data.token) {
      throw new HttpException('Token is required', HttpStatus.BAD_REQUEST);
    }

    const token = this.tokenService.verifyToken(data.token);

    const email = token.email;

    if (sharedAssignment.email !== email) {
      throw new HttpException('Assignment not found', HttpStatus.NOT_FOUND);
    }

    if (
      sharedAssignment?.guest_access_token_expires_at &&
      sharedAssignment.guest_access_token_expires_at < new Date() &&
      !sharedAssignment.is_accepted
    ) {
      throw new HttpException('Token is expired', HttpStatus.BAD_REQUEST);
    }

    if (!sharedAssignment.is_accepted) {
      await this.acceptSharedAssignment(id);
    }

    return sharedAssignment.assignment;
  }

  private async acceptSharedAssignment(id: number) {
    await this.prismaService.assignmentMember.update({
      where: {
        id: id,
      },
      data: {
        is_accepted: true,
      },
    });
  }

  async shareAssignment(
    userId: number,
    assignmentId: number,
    shareAssignmentDto: ShareAssignmentDto,
  ) {
    const assignment = await this.findOne(userId, assignmentId);
    if (!assignment) {
      throw new HttpException('Assignment not found', HttpStatus.NOT_FOUND);
    }
    const owner = assignment.user;
    const { email: sharedUsersEmail } = shareAssignmentDto;
    for (const email of sharedUsersEmail) {
      const user = await this.userProvider.findOneByEmail(email);
      if (user) {
        if (owner.id == user.id) {
          continue;
        }
        await this.shareAssignmentToSystemUser(
          assignment as AssignmentWithUser,
          user,
        );
        continue;
      }
      await this.shareAssignmentToGuestUsers(assignment, email);
    }
  }

  async removeAccessToTheAssignment(
    userId: number,
    assignmentId: number,
    emails: string[],
  ) {
    const assignment = await this.findOne(userId, assignmentId);
    if (assignment) {
      await this.prismaService.assignmentMember.deleteMany({
        where: {
          email: {
            in: emails,
          },
          assignment_id: assignment.id,
        },
      });
    }
  }

  private async shareAssignmentToSystemUser(
    assignment: AssignmentWithUser,
    user: User,
  ) {
    try {
      await this.prismaService.assignmentMember.create({
        data: {
          assignment_id: assignment.id,
          user_id: user?.id,
          email: user.email,
          is_system: true,
        },
      });
      await this.notifyUserAssignmentShare(
        assignment,
        assignment.user,
        true,
        user.email,
      );
    } catch (error) {
      console.log(error);
    }
  }

  private async shareAssignmentToGuestUsers(
    assignment: AssignmentWithUser,
    email: string,
  ) {
    try {
      const token = this.tokenService.createToken(
        { email, userId: 0 },
        { expiresIn: '2d' },
      );
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);
      await this.prismaService.assignmentMember.create({
        data: {
          assignment_id: assignment.id,
          email: email,
          is_system: false,
          guest_access_token: token,
          guest_access_token_expires_at: expiresAt.toISOString(),
        },
      });
      await this.notifyUserAssignmentShare(
        assignment,
        assignment.user,
        false,
        email,
        token,
      );
    } catch (error) {
      console.log(error);
    }
  }

  private async notifyUserAssignmentShare(
    assignment: Assignment,
    owner: User,
    isSystemUser: boolean,
    email: string,
    token?: string,
  ) {
    if (isSystemUser) {
      const message =
        await this.sendPushNotificationToUserToNotifyTheAssignmentIsShared(
          assignment,
          owner,
        );
      await this.notificationService.saveNotificationsToDB([
        {
          user_id: owner.id,
          title: message?.title ?? '',
          message: message?.body,
          reference_id: assignment.id,
          reference_model: Prisma.ModelName.Assignment,
          data: JSON.stringify({
            id: assignment.id,
            type: message?.type,
          }),
        },
      ]);
    }
    await this.sendMailNotificationToNotifyAssignmentShare(
      assignment,
      email,
      owner,
      token,
    );
  }

  private async sendPushNotificationToUserToNotifyTheAssignmentIsShared(
    assignment: Assignment,
    owner: User,
  ) {
    try {
      const message: NotificationData = {
        title: `Assignment Shared: ${assignment.title}`,
        body: `You have been shared an assignment by ${owner?.name ?? 'System'}`,
        type: NotificationType.OTHER,
        id: assignment.id,
      };
      const tokens = await this.userProvider.getUserTokens(owner.id);
      const expoPushNotificationMessageTo: Map<string, NotificationData> =
        new Map();
      for (const token of tokens) {
        expoPushNotificationMessageTo.set(token.token, message);
      }
      if (expoPushNotificationMessageTo.size > 0) {
        await this.expoService.sendPushNotification(
          expoPushNotificationMessageTo,
        );
      }
      return message;
    } catch (error) {
      console.log(error);
    }
  }

  private async sendMailNotificationToNotifyAssignmentShare(
    assignment: Assignment,
    email: string,
    owner?: User,
    token?: string,
  ) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: `Assignment Shared: ${assignment.title}`,
        text: `You have been shared an assignment by ${owner?.name ?? 'System'}, ${process.env.FRONTEND_URL}/assignments/${assignment.id}?access_token=${token}`,
      });
    } catch (error) {
      console.log(error);
    }
  }

  private async deleteAttacheMentByAssimentId(assignmentId: number) {
    try {
      await this.attachmentService.deleteAttachmentsByModelFromDb(
        [assignmentId],
        Prisma.ModelName.Assignment,
      );
    } catch (error) {
      console.log(error);
    }
  }
}
