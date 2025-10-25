import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { AssignmentStatus, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AssignmentProvider {
  constructor(private readonly prismaService: PrismaService) {}
  async findOne(userid: number, id: number) {
    const assignment = await this.prismaService.assignment.findUnique({
      where: {
        id,
        user_id: userid,
      },
      include: {
        user: true,
        subject: true,
        notes: true,
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
    const currentPage = pagination?.page || 1;
    const pageSize = pagination?.page_size || 10;
    const skip = (currentPage - 1) * pageSize;
    const assignments = await this.prismaService.assignment.findMany({
      take: pageSize,
      skip: skip,
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

    const hasNext = assignments.length === pageSize || false;

    return {
      assignments,
      meta: {
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
    const updatedAssignment = await this.prismaService.assignment.update({
      where: {
        id,
        user_id: userid,
      },
      data,
    });
    return updatedAssignment;
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

  async getTotalUserAssignments(userId: number, isCount = false) {
    if (!isCount) {
      return await this.prismaService.assignment.findMany({
        where: {
          user_id: userId,
        },
      });
    }

    return await this.prismaService.assignment.count({
      where: {
        user_id: userId,
      },
    });
  }

  async getUserCompletedAssignments(userId: number, isCount = false) {
    if (!isCount) {
      return await this.prismaService.assignment.findMany({
        where: {
          user_id: userId,
          status: AssignmentStatus.COMPLETED,
        },
      });
    }

    return await this.prismaService.assignment.count({
      where: {
        user_id: userId,
        status: AssignmentStatus.COMPLETED,
      },
    });
  }

  async getUserPendingAssignments(userId: number, isCount = false) {
    if (!isCount) {
      return await this.prismaService.assignment.findMany({
        where: {
          user_id: userId,
          status: AssignmentStatus.PENDING,
        },
      });
    }

    return await this.prismaService.assignment.count({
      where: {
        user_id: userId,
        status: AssignmentStatus.PENDING,
      },
    });
  }

  async getUserOverdueAssignments(userId: number, isCount = false) {
    if (!isCount) {
      return await this.prismaService.assignment.findMany({
        where: {
          user_id: userId,
          status: AssignmentStatus.PENDING,
          due_date: {
            lt: new Date().toISOString(),
          },
        },
      });
    }

    return await this.prismaService.assignment.count({
      where: {
        user_id: userId,
        status: AssignmentStatus.PENDING,
        due_date: {
          lt: new Date().toISOString(),
        },
      },
    });
  }
}
