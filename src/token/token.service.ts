import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { PayloadDto } from './dto/token.dto';

@Injectable()
export class TokenService {
  constructor(private readonly jwtService: JwtService) {}

  createToken(payload: PayloadDto, options?: JwtSignOptions) {
    const token = this.jwtService.sign(payload, options);
    return token;
  }

  verifyToken(token: string) {
    const payload: PayloadDto = this.jwtService.verify(token);

    if (!payload) {
      throw new HttpException('Invalid token', HttpStatus.UNAUTHORIZED);
    }
    return payload;
  }
}
