import { PrismaService } from 'src/prisma/prisma.service';
import { HttpException, HttpStatus } from '@nestjs/common';

export class AssignmentProvider {
  constructor(private readonly prismaService: PrismaService) {}
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
}
