import { HttpException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSubjectDto } from './dto/create-subject-dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { SubjectFindQuery } from './dto/subject.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class SubjectService {
  constructor(private readonly prismaService: PrismaService) {}

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

  async findOne(userId: number, id: number) {
    const subject = await this.prismaService.subject.findUnique({
      where: {
        id,
        user_id: userId,
      },
    });

    if (!subject) {
      throw new HttpException('Subject not found', 404);
    }

    return subject;
  }

  async create(userId: number, createSubjectDto: CreateSubjectDto) {
    const created = await this.prismaService.subject.create({
      data: {
        ...createSubjectDto,
        user_id: userId,
      },
    });

    return created;
  }

  async update(userId: number, id: number, updateSubjectDto: UpdateSubjectDto) {
    const subject = await this.findOne(userId, id);

    return this.prismaService.subject.update({
      where: { id: subject.id },
      data: updateSubjectDto,
    });
  }

  async delete(userId: number, id: number) {
    const isExist = await this.findOne(userId, id);

    return this.prismaService.subject.delete({
      where: {
        id: isExist.id,
      },
    });
  }
}
