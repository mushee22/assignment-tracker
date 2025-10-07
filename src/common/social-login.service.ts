import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import * as jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

@Injectable()
export class SocialLoginService {
  private googleClient: OAuth2Client;
  private appleClient: jwksClient.JwksClient;
  constructor() {
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    this.appleClient = jwksClient({
      jwksUri: 'https://sandrino.auth0.com/.well-known/jwks.json',
    });
  }

  async verifyGoogleToken(token: string) {
    const ticket = await this.googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    return payload;
  }

  async verifyAppleToken(token: string) {
    try {
      const decodeHeader = jwt.decode(token, { complete: true });
      if (!decodeHeader) {
        throw new HttpException('Invalid token', HttpStatus.BAD_GATEWAY);
      }
      if (!this.appleClient) {
        throw new HttpException(
          'Apple client not initialized',
          HttpStatus.BAD_GATEWAY,
        );
      }
      const key = await this.appleClient.getSigningKey(decodeHeader.header.kid);

      const publicKey = key.getPublicKey();

      const payload = jwt.verify(token, publicKey, {
        algorithms: ['RS256'],
      });
      return payload;
    } catch (_error) {
      throw new HttpException('Invalid token', HttpStatus.BAD_GATEWAY);
    }
  }
}
