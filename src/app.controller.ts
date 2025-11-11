import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  ParseFilePipeBuilder,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './lib/is-public';
import { MailService } from './mail/mail.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { AwsS3Service } from './aws-s3/aws-s3.service';

import AWS from 'aws-sdk';
import type { S3 } from 'aws-sdk';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly mailService: MailService,
    private readonly awsS3Service: AwsS3Service,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Get('/debug-sentry')
  getError() {
    throw new Error('My first Sentry error!');
  }

  @Public()
  @Post('/test-mail')
  async testMail(@Body() body: { to: string; name: string; message: string }) {
    try {
      const result = await this.mailService.sendReminder(
        body.to,
        body.name,
        body.message,
        'Test',
      );
      return [result, 'mail sent successfully'];
    } catch (_error) {
      console.log(_error);
      throw new HttpException(
        'Failed to send email',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Public()
  @Post('/test/image-upload')
  @UseInterceptors(FileInterceptor('image'))
  async uploadImage(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: 1024 * 1024 * 5 }) // 5MB
        .addFileTypeValidator({ fileType: /(jpg|jpeg|png)$/ })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    image: Express.Multer.File,
  ) {
    try {
      const s3Clinet = new AWS.S3({
        region: 'us-east-1',
      });

      const filename = `uploads/test/${Date.now()}-${image.originalname}`;

      const presignedUrl = await s3Clinet.getSignedUrlPromise('putObject', {
        Expires: 60 * 5,
        Key: filename,
        ContentType: image.mimetype,
        Bucket: process.env.S3_BUCKET_NAME,
      });

      const response = await fetch(presignedUrl, {
        method: 'PUT',
        body: image.buffer as BodyInit,
      });

      if (!response.ok) {
        console.log(response.statusText, response.status, response.ok);
        const errorMessage = await response.text();
        throw new Error(`Failed to upload file to S3: ${errorMessage}`);
      }

      return [null, 'image uploaded successfully'];
    } catch (_error) {
      console.log(_error);
      throw new HttpException(
        'Failed to upload image',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
