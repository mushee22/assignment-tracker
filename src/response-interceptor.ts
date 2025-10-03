import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response as ExpressResponse } from 'express';

export interface Response<T> {
  data: T;
  message?: string;
  success: boolean;
  statusCode: number;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<Response<T>> | Observable<any> {
    if (context.getType() === 'http') {
      const response: ExpressResponse = context.switchToHttp().getResponse();
      const statusCode = response.statusCode;
      return next.handle().pipe(
        map((response) => ({
          data: response[0] as T,
          message: (response[1] as T) || 'Success',
          success: true,
          statusCode: statusCode,
        })),
      );
    }
    return next.handle();
  }
}
