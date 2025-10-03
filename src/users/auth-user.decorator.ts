import {
  createParamDecorator,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { Request } from 'express';

export const AuthUser = createParamDecorator(
  (data: keyof User, ctx: ExecutionContext) => {
    const request: Request = ctx.switchToHttp().getRequest();
    const user = request['user'] as User;
    if (!user) {
      throw new HttpException('User not found', HttpStatus.UNAUTHORIZED);
    }
    return data ? user[data] : user;
  },
);
