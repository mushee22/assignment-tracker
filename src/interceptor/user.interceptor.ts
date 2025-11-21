import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { HttpException, HttpStatus } from '@nestjs/common';
import { TokenService } from '../token/token.service';
import { Request } from 'express';

@Injectable()
export class UserInterceptor implements NestInterceptor {
  constructor(private readonly tokenService: TokenService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request: Request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      return next.handle();
    }

    try {
      const payload = this.tokenService.verifyToken(token);
      if (!payload) {
        throw new HttpException('Unautherized user', HttpStatus.UNAUTHORIZED);
      }
      request['user'] = payload;
    } catch (_error) {
      console.log(_error);
      return next.handle();
    }

    return next.handle();
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
