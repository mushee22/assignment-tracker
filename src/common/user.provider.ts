import { HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

export class UserProvider {
  constructor(private readonly prismaService: PrismaService) {}

  async findOneById(id: number) {
    const user = await this.prismaService.user.findUnique({
      where: {
        id,
      },
      include: {
        profile: true,
      },
    });

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    return user;
  }

  async findOneByEmail(email: string) {
    const user = await this.prismaService.user.findFirst({
      where: {
        email,
      },
      include: {
        profile: true,
      },
    });
    return user;
  }

  async getUserTokens(userId: number) {
    const tokens = await this.prismaService.deviceToken.findMany({
      where: {
        user_id: userId,
      },
    });
    return tokens;
  }
}
