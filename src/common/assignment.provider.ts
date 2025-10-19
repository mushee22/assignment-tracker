import { PrismaService } from 'src/prisma/prisma.service';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { AssignmentStatus, Prisma } from '@prisma/client';

@Injectable()
export class AssignmentProvider {
  constructor(private readonly prismaService: PrismaService) {}
  async findOne(userid: number, id: number, isNote?: boolean) {
    const assignment = await this.prismaService.assignment.findUnique({
      where: {
        id,
        user_id: userid,
      },
      include: {
        user: true,
        notes: isNote,
      },
    });

    if (!assignment) {
      throw new HttpException('Assignment not found', HttpStatus.NOT_FOUND);
    }

    return assignment;
  }

  async findAll(
    userId: number,
    query: Prisma.AssignmentWhereInput,
    orderBy: Prisma.AssignmentOrderByWithRelationInput,
    pagination?: {
      page?: number;
      page_size?: number;
      cursor?: number;
    },
    isNote?: boolean,
    isShared?: boolean,
  ) {
    const assignments = await this.prismaService.assignment.findMany({
      take: pagination?.page_size || 10,
      skip: pagination?.cursor ? 1 : 0,
      where: {
        user_id: userId,
        ...query,
      },
      orderBy: {
        ...orderBy,
      },
      ...(pagination?.cursor
        ? {
            cursor: {
              id: pagination?.cursor,
            },
          }
        : {}),
      include: {
        subject: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        notes: isNote || false,
        assignment_members: isShared || false,
      },
    });

    const nextCursor =
      assignments.length > 0 ? assignments[assignments.length - 1].id : null;

    const hasNext = assignments.length === pagination?.page_size || null;

    return {
      assignments,
      meta: {
        next: nextCursor,
        has_next: hasNext,
      },
    };
  }

  async create(userid: number, data: Prisma.AssignmentCreateManyUserInput) {
    return await this.prismaService.assignment.create({
      data: {
        ...data,
        user_id: userid,
      },
    });
  }

  async update(userid: number, id: number, data: Prisma.AssignmentUpdateInput) {
    return await this.prismaService.assignment.update({
      where: {
        id,
        user_id: userid,
      },
      data,
    });
  }

  async markAsCompleted(userid: number, id: number) {
    return await this.update(userid, id, {
      status: AssignmentStatus.COMPLETED,
      completed_at: new Date().toISOString(),
    });
  }

  async markAsCancelled(userid: number, id: number, reason?: string) {
    return await this.update(userid, id, {
      status: AssignmentStatus.CANCELLED,
      cancelled_at: new Date().toISOString(),
      cancelled_resason: reason,
    });
  }

  async updateProgress(userid: number, id: number, progress: number) {
    return await this.update(userid, id, {
      progress,
    });
  }

  async mapUserToSharedAssignment(email: string, userid: number) {
    try {
      const sharedAssignments =
        await this.prismaService.assignmentMember.findMany({
          where: {
            email: email.toLowerCase(),
            user_id: null,
          },
        });
      if (sharedAssignments.length) {
        const sharedAssignmentIds = sharedAssignments.map((item) => item.id);
        await this.prismaService.assignmentMember.updateMany({
          where: {
            id: {
              in: sharedAssignmentIds,
            },
          },
          data: {
            user_id: userid,
          },
        });
      }
    } catch (_error) {
      throw new HttpException(
        'Failed to map user to shared assignment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
