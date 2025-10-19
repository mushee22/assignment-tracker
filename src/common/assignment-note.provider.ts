import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AssignmentProvider } from './assignment.provider';

@Injectable()
export class AssignmentNoteProvider {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly assignmentProvider: AssignmentProvider,
  ) {}

  async getAssignmentNotes(userId: number, assignmentId: number) {
    const assignment = await this.assignmentProvider.findOne(
      userId,
      assignmentId,
    );
    if (!assignment) {
      throw new HttpException('Assignment not found', HttpStatus.NOT_FOUND);
    }
    const notes = await this.prismaService.assignmentNotes.findMany({
      where: {
        assignment_id: assignmentId,
      },
    });
    return notes;
  }

  async addAssignmentNotes(
    userId: number,
    assignmentId: number,
    notes: string,
  ) {
    const assignment = await this.assignmentProvider.findOne(
      userId,
      assignmentId,
    );
    if (!assignment) {
      throw new HttpException('Assignment not found', HttpStatus.NOT_FOUND);
    }
    await this.createAssignmentNote(assignmentId, [notes]);
  }

  async deleteAssignmentNotes(userId: number, id: number) {
    await this.prismaService.assignmentNotes.deleteMany({
      where: {
        id: id,
        assignment: {
          user_id: userId,
        },
      },
    });
  }

  async createAssignmentNote(assignmentId: number, notes: string[]) {
    const data = notes.map((note) => ({
      assignment_id: assignmentId,
      content: note,
    }));
    if (!data || data.length === 0) {
      return;
    }
    const createdNotes = await this.prismaService.assignmentNotes.createMany({
      data: data,
    });
    return createdNotes;
  }

  async deleteAllAssignmentNotes(assignmentId: number) {
    await this.prismaService.assignmentNotes.deleteMany({
      where: {
        assignment_id: assignmentId,
      },
    });
  }
}
