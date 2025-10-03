import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { AssigneFindQuery } from './dto/assignment.dto';
import { AssignmentStatus, Attachment, Prisma } from '@prisma/client';
import { AwsS3Service } from 'src/aws-s3/aws-s3.service';
import { UploadResult } from 'src/aws-s3/interface/upload-interface';
import { ReminderService } from 'src/reminder/reminder.service';

@Injectable()
export class AssignmentService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly awsS3Service: AwsS3Service,
    private readonly reminderService: ReminderService,
  ) {}

  generateFindWhereQuery(query: AssigneFindQuery) {
    const where: Prisma.AssignmentWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.subject_id) {
      where.subject_id = query.subject_id;
    }

    if (query.q) {
      where.OR = [
        {
          title: {
            contains: query.q,
          },
        },
        {
          description: {
            contains: query.q,
          },
        },
      ];
    }

    if (query.start) {
      where.created_at = {
        gte: new Date(query.start),
      };
    }

    if (query.end) {
      where.created_at = {
        lte: new Date(query.end),
      };
    }

    if (query.date) {
      where.created_at = {
        gte: new Date(query.date),
        lte: new Date(query.date + ' 23:59:59'),
      };
    }

    return where;
  }

  async findAll(userId: number, query: AssigneFindQuery) {
    const whereQuery = this.generateFindWhereQuery(query);

    const assignments = await this.prismaService.assignment.findMany({
      where: {
        user_id: userId,
        ...whereQuery,
      },
      orderBy: {
        id: 'desc',
      },
    });

    return assignments;
  }

  async findOne(userid: number, id: number) {
    const assignment = await this.prismaService.assignment.findUnique({
      where: {
        id,
        user_id: userid,
      },
    });

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
    const created = await this.prismaService.assignment.create({
      data: {
        user_id: userId,
        ...createAssignmentDto,
      },
    });

    if (attachments.length > 0) {
      await this.uploadAttachent(attachments, created.id);
    }

    await this.reminderService.createAssignmentReminder(userId, created.id);

    return created;
  }

  async update(
    userId: number,
    id: number,
    updateAssignmentDto: UpdateAssignmentDto,
  ) {
    const assignment = await this.findOne(userId, id);

    const updated = await this.prismaService.assignment.update({
      where: {
        id: assignment.id,
      },
      data: updateAssignmentDto,
    });
    await this.reminderService.updateAssignmentReminder(userId, updated.id);

    return updated;
  }

  async markAsDone(userId: number, id: number) {
    const assignment = await this.findOne(userId, id);

    if (assignment.status === AssignmentStatus.COMPLETED) {
      return assignment;
    }

    const updated = await this.prismaService.assignment.update({
      where: {
        id: assignment.id,
        user_id: userId,
      },
      data: {
        status: AssignmentStatus.COMPLETED,
        completed_at: new Date(),
      },
    });

    await this.reminderService.updateAssignmentReminder(userId, assignment.id);

    return updated;
  }

  async markAsCancelled(userId: number, id: number, reason?: string) {
    const assignment = await this.findOne(userId, id);

    if (assignment.status === AssignmentStatus.CANCELLED) {
      return assignment;
    }

    const updated = await this.prismaService.assignment.update({
      where: {
        id: assignment.id,
        user_id: userId,
      },
      data: {
        status: AssignmentStatus.CANCELLED,
        cancelled_at: new Date(),
        cancelled_resason: reason,
      },
    });

    await this.reminderService.updateAssignmentReminder(userId, assignment.id);

    return updated;
  }

  async delete(userid: number, id: number) {
    const assignment = await this.findOne(userid, id);
    const deleted = await this.prismaService.assignment.delete({
      where: {
        id: assignment.id,
      },
    });
    await this.reminderService.deleteAssignmentReminder(
      assignment.user_id,
      deleted.id,
    );
    if (deleted) {
      await this.deleteAttacheMentByAssimentId(deleted.id);
    }
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
      const assignment = await this.findOne(userId, assignmentId);
      if (assignment) {
        await this.uploadAttachent(newAttachments, assignmentId);
      }
    } catch (error) {
      console.log(error);
    }
  }

  async deleteAssigmentAttachement(
    userId: number,
    assignmentId: number,
    attachmentIds: number[],
  ) {
    try {
      const assignment = await this.findOne(userId, assignmentId);
      const assignmentAttachments = await this.findAssigmentAttachments(
        assignment.id,
      );
      if (assignmentAttachments && assignmentAttachments.length > 0) {
        const filteredAttachments = assignmentAttachments.filter((attachment) =>
          attachmentIds.includes(attachment.id),
        );
        if (filteredAttachments && filteredAttachments.length > 0) {
          const deletedIds = this.deleteAttacmentFromS3(filteredAttachments);
          await this.deleteAttachmentsFromDb(deletedIds ?? []);
        }
      }
    } catch (error) {
      console.log(error);
    }
  }

  private async uploadAttachent(
    file: Express.Multer.File[],
    assignmentId: number,
  ) {
    try {
      const uploadedFiles = await this.awsS3Service.uploadFiles(
        file,
        'assignments',
      );
      await this.saveUploadedFilesInDb(uploadedFiles, assignmentId);
    } catch (error) {
      console.log(error);
    }
  }

  private deleteAttacmentFromS3(attachemnts: Attachment[]) {
    try {
      const storageKeys = attachemnts
        .map((attachment) => attachment.storage_key)
        .filter((key) => key !== null);
      this.awsS3Service.deleteFile(storageKeys);
      const deletedIds = attachemnts.map((attachment) => attachment.id);
      return deletedIds;
    } catch (error) {
      console.log(error);
    }
  }

  private async findAssigmentAttachments(assignmentId: number) {
    try {
      const attachments = await this.prismaService.attachment.findMany({
        where: {
          reference_id: assignmentId,
          reference_model: Prisma.ModelName.Assignment,
        },
      });
      return attachments;
    } catch (error) {
      console.log(error);
    }
  }

  private async deleteAttacheMentByAssimentId(assignmentId: number) {
    try {
      const attachmentIds = await this.findAssigmentAttachments(assignmentId);
      if (attachmentIds && attachmentIds.length > 0) {
        const deletedIds = this.deleteAttacmentFromS3(attachmentIds);
        await this.deleteAttachmentsFromDb(deletedIds ?? []);
      }
    } catch (error) {
      console.log(error);
    }
  }

  private async deleteAttachmentsFromDb(attachementIds: number[]) {
    try {
      const deleted = await this.prismaService.attachment.deleteMany({
        where: {
          id: {
            in: attachementIds,
          },
        },
      });
      return deleted.count;
    } catch (error) {
      console.log(error);
    }
  }
}
