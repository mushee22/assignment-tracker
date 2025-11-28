import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
  Assignment,
  AssignmentStatus,
  NotificationType,
  Priority,
  Prisma,
  ReminderType,
  Schedule,
  User,
} from '@prisma/client';
import { UploadResult } from 'src/aws-s3/interface/upload-interface';
import { AssignmentNoteProvider } from 'src/common/assignment-note.provider';
import { AssignmentProvider } from 'src/common/assignment.provider';
import { AttachmentService } from 'src/common/attachment.service';
import { ExpoService } from 'src/common/expo.service';
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
import { MailService } from 'src/mail/mail.service';
import {
  CreateAssignmentScheduleDto,
  UpdateAssignmentScheduleDto,
} from './dto/assignment-schecdule.dto';
import { ScheduleService } from 'src/common/schedule.service';

@Injectable()
export class AssignmentService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly reminderService: ReminderService,
    private readonly userProvider: UserProvider,
    private readonly tokenService: TokenService,
    private readonly expoService: ExpoService,
    private readonly mailerService: MailService,
    private readonly attachmentService: AttachmentService,
    private readonly assignmentProvider: AssignmentProvider,
    private readonly notificationService: NotificationService,
    private readonly assignmentNoteProvider: AssignmentNoteProvider,
    private readonly scheduleService: ScheduleService,
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
      const { notes, due_date, subject_id, ...rest } = createAssignmentDto;

      const user = await this.userProvider.findOneById(userId);

      const subject = await this.prismaService.subject.findFirst({
        where: {
          id: subject_id,
          user_id: userId,
        },
      });

      if (!subject) {
        throw new HttpException('Subject not found', HttpStatus.NOT_FOUND);
      }

      const notificationPreference = user.profile
        ?.notification_preference as Prisma.JsonObject;
      let isPushNotification =
        notificationPreference?.push_notification === true;
      let isEmailNotification =
        notificationPreference?.email_notification === true;

      const isReminder =
        createAssignmentDto.is_reminder?.trim() === 'true' ? true : false;

      if (createAssignmentDto.is_reminder) {
        isPushNotification = isReminder;
        isEmailNotification = isReminder;
      }

      const dueDateString = new Date(due_date).toISOString();

      const created = await this.assignmentProvider.create(userId, {
        ...rest,
        subject_id: subject_id,
        due_date: dueDateString,
        priority_index: PriorityIndex[createAssignmentDto.priority as Priority],
        is_push_notification: isPushNotification,
        is_email_notification: isEmailNotification,
        is_reminder: isReminder ?? false,
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

    const { priority, due_date, ...rest } = updateAssignmentDto;

    const priorityIndex = priority
      ? PriorityIndex[priority]
      : assignment.priority_index;

    let dueDate = '';
    if (due_date) {
      dueDate = new Date(due_date).toISOString();
    }

    const updated = await this.assignmentProvider.update(
      userId,
      assignment.id,
      {
        ...rest,
        ...(dueDate ? { due_date: dueDate } : {}),
        priority_index: priorityIndex,
        priority: priority ?? assignment.priority,
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
      throw new HttpException(
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
          assignment: {
            include: {
              subject: true,
              user: true,
            },
          },
          user: true,
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
          assignment_id: id,
        },
        include: {
          assignment: {
            include: {
              subject: true,
              notes: true,
              user: true,
            },
          },
          user: true,
        },
      });

    if (!sharedAssignment) {
      throw new HttpException('Assignment not found', HttpStatus.NOT_FOUND);
    }

    const attachments = await this.attachmentService.getAttachmentByReferanceId(
      sharedAssignment.assignment_id,
      Prisma.ModelName.Assignment,
    );

    if (userId) {
      if (sharedAssignment.user_id !== userId) {
        throw new HttpException('Assignment not found', HttpStatus.NOT_FOUND);
      }
      if (!sharedAssignment.is_accepted) {
        await this.acceptSharedAssignment(id);
      }

      return {
        assignment: sharedAssignment.assignment,
        attachments,
      };
    }

    if (!data.token) {
      throw new HttpException(
        'Token is required to see shared assignment',
        HttpStatus.BAD_REQUEST,
      );
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

    return {
      assignment: sharedAssignment.assignment,
      attachments,
    };
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
    try {
      const assignment = await this.findOne(userId, assignmentId);
      if (!assignment) {
        throw new HttpException('Assignment not found', HttpStatus.NOT_FOUND);
      }
      const owner = assignment.user;
      const { email: sharedUsersEmail } = shareAssignmentDto;

      const user = await this.userProvider.findOneByEmail(sharedUsersEmail);

      if (user && owner.id == user.id) {
        throw new HttpException(
          'You cannot share assignment with yourself',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (user && user.id) {
        await this.shareAssignmentToSystemUser(
          assignment as AssignmentWithUser,
          user,
        );
        return 'Assignment shared with system user successfully';
      }

      await this.shareAssignmentToGuestUsers(assignment, sharedUsersEmail);
      return 'Assignment shared with guest users successfully';
    } catch (error) {
      console.log(error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to share assignment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async removeAccessToTheAssignment(
    userId: number,
    assignmentId: number,
    email: string,
  ) {
    const assignment = await this.findOne(userId, assignmentId);
    if (assignment) {
      await this.prismaService.assignmentMember.deleteMany({
        where: {
          email: email,
          assignment_id: assignment.id,
        },
      });
    }
  }

  async getAssignmentSchedules(
    userId: number,
    assignmentId: number,
    isGlobal: boolean = false,
  ) {
    const schedules: Schedule[] = [];

    const assignmentSchedules = await this.scheduleService.getSchedules(
      userId,
      false,
      assignmentId,
      false,
    );

    schedules.push(...assignmentSchedules);

    if (isGlobal) {
      const globalSchedules = await this.scheduleService.getSchedules(
        userId,
        true,
        undefined,
        true,
      );
      schedules.push(...globalSchedules);
    }
    return schedules;
  }

  async addNewAssignmentSchedule(
    userId: number,
    assignmentId: number,
    createAssignmentScheduleDto: CreateAssignmentScheduleDto,
  ) {
    const assignment = await this.findOne(userId, assignmentId);
    if (!assignment) {
      throw new HttpException('Assignment not found', HttpStatus.NOT_FOUND);
    }

    const isExist = await this.scheduleService.getScheduleBySchedule(
      userId,
      createAssignmentScheduleDto.schedule,
      assignment.id,
      createAssignmentScheduleDto.type,
    );

    if (isExist && isExist.is_enabled) {
      throw new HttpException(
        'Schedule already exists',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (isExist && !isExist.is_enabled) {
      await this.scheduleService.updateSchedule(isExist.id, {
        is_enabled: true,
      });
      return isExist;
    }

    const created = await this.scheduleService.createSchedule({
      assignment_id: assignment.id,
      user_id: userId,
      schedule: createAssignmentScheduleDto.schedule,
      type: createAssignmentScheduleDto.type,
      is_default: false,
      is_enabled: true,
      is_global: false,
    });
    return created;
  }

  async updateAssignmentSchedule(
    userId: number,
    scheduleId: number,
    assignmentId: number,
    updateAssignmentScheduleDto: UpdateAssignmentScheduleDto,
  ) {
    const isExist = await this.scheduleService.getScheduleById(scheduleId);

    if (!isExist) {
      throw new HttpException('Schedule not found', HttpStatus.NOT_FOUND);
    }

    if (isExist.assignment_id != assignmentId || isExist.user_id != userId) {
      throw new HttpException(
        'You are not authorized to update this schedule',
        HttpStatus.FORBIDDEN,
      );
    }

    const updated = await this.scheduleService.updateSchedule(scheduleId, {
      is_enabled: updateAssignmentScheduleDto.status,
      type: updateAssignmentScheduleDto.type as 'BEFORE' | 'AFTER',
      schedule: updateAssignmentScheduleDto.schedule,
    });
    return updated;
  }

  async removeAssignmentSchedule(
    userId: number,
    scheduleId: number,
    assignmentId: number,
  ) {
    const isExist = await this.scheduleService.getScheduleById(scheduleId);

    if (!isExist) {
      throw new HttpException('Schedule not found', HttpStatus.NOT_FOUND);
    }

    if (isExist.assignment_id != assignmentId || isExist.user_id != userId) {
      throw new HttpException(
        'You are not authorized to delete this schedule',
        HttpStatus.FORBIDDEN,
      );
    }

    await this.scheduleService.deleteSchedule(scheduleId);
    return isExist;
  }

  private async shareAssignmentToSystemUser(
    assignment: AssignmentWithUser,
    user: User,
  ) {
    try {
      const isAlreadyShared =
        await this.prismaService.assignmentMember.findFirst({
          where: {
            assignment_id: assignment.id,
            user_id: user.id,
          },
        });

      if (isAlreadyShared) {
        await this.notifyUserAssignmentShare(
          assignment,
          assignment.user,
          true,
          user.email,
        );
        return;
      }

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

      const isAlreadyShared =
        await this.prismaService.assignmentMember.findFirst({
          where: {
            assignment_id: assignment.id,
            email: email,
          },
        });

      if (isAlreadyShared) {
        await this.notifyUserAssignmentShare(
          assignment,
          assignment.user,
          false,
          email,
          token,
        );
        return;
      }
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
      throw error;
    }
  }

  private async notifyUserAssignmentShare(
    assignment: Assignment,
    owner: User,
    isSystemUser: boolean,
    email: string,
    token?: string,
  ) {
    try {
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
    } catch (error) {
      console.log(error);
      throw error;
    }
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
      const URL = token
        ? `${process.env.FRONTEND_URL}/assignment-details?id=${assignment.id}&access_token=${token}&shared=true`
        : `${process.env.FRONTEND_URL}/assignment-details?id=${assignment.id}&shared=true`;

      await this.mailerService.sendAssignemntShareMail(
        email,
        owner?.name ?? 'Unknown',
        `You have been shared an assignment by ${owner?.name ?? 'System'}`,
        `Assignment Shared: ${assignment.title}`,
        `${URL}`,
      );
    } catch (error) {
      console.log(error);
      throw error;
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
