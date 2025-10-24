import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSubjectDto } from './dto/create-subject-dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { SubjectFindQuery } from './dto/subject.dto';
import { Prisma } from '@prisma/client';
import { AttachmentService } from 'src/common/attachment.service';

@Injectable()
export class SubjectService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly attachmentService: AttachmentService,
  ) {}

  generateFindWhereQuery(query: SubjectFindQuery) {
    const where: Prisma.SubjectWhereInput = {};

    if (query.q) {
      where.name = {
        contains: query.q,
      };
    }

    if (query.color) {
      where.color = query.color;
    }

    return where;
  }

  async findAll(userId: number, query: SubjectFindQuery) {
    const where = this.generateFindWhereQuery(query);

    const subjects = await this.prismaService.subject.findMany({
      where: {
        user_id: userId,
        ...where,
      },
    });

    return subjects;
  }

  async findOne(userId: number, id: number, isAssignment = false) {
    const subject = await this.prismaService.subject.findUnique({
      where: {
        id,
        user_id: userId,
      },
      include: {
        assignments: isAssignment,
      },
    });

    if (!subject) {
      throw new HttpException('Subject not found', 404);
    }

    return subject;
  }

  async create(
    userId: number,
    createSubjectDto: CreateSubjectDto,
    icon?: Express.Multer.File,
  ) {
    const isExist = await this.prismaService.subject.findFirst({
      where: {
        name: {
          equals: createSubjectDto.name,
          mode: 'insensitive',
        },
        user_id: userId,
      },
    });

    if (isExist) {
      throw new HttpException(
        'Subject with name already exist',
        HttpStatus.CONFLICT,
      );
    }

    const created = await this.prismaService.subject.create({
      data: {
        ...createSubjectDto,
        user_id: userId,
      },
    });

    if (icon) {
      await this.attachmentService.uploadAttachent(
        [icon],
        created.id,
        Prisma.ModelName.Subject,
        'subject',
      );
    }

    return created;
  }

  async update(
    userId: number,
    id: number,
    updateSubjectDto: UpdateSubjectDto,
    icon?: Express.Multer.File,
  ) {
    const subject = await this.findOne(userId, id);

    const updated = await this.prismaService.subject.update({
      where: { id: subject.id },
      data: updateSubjectDto,
    });

    if (icon) {
      await this.attachmentService.deleteAttachmentsByModelFromDb(
        [subject.id],
        Prisma.ModelName.Subject,
      );
      await this.attachmentService.uploadAttachent(
        [icon],
        subject.id,
        Prisma.ModelName.Subject,
        'subject',
      );
    }

    return updated;
  }

  async delete(userId: number, id: number) {
    const isExist = await this.findOne(userId, id, true);

    if (isExist.assignments.length) {
      throw new HttpException(
        "Subject already assigned to assignment, So can't delete",
        HttpStatus.FORBIDDEN,
      );
    }

    const deleted = await this.prismaService.subject.delete({
      where: {
        id: isExist.id,
      },
    });

    await this.attachmentService.deleteAttachmentsByModelFromDb(
      [deleted.id],
      Prisma.ModelName.Subject,
    );
  }
}
