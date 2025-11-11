import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  ParseFilePipeBuilder,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './lib/is-public';
import { MailService } from './mail/mail.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { AwsS3Service } from './aws-s3/aws-s3.service';

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

  @Get('/generate-s3-signed-url')
  async getSignedUrl(
    @Query('file_name') fileName: string,
    @Query('file_type') fileType: string,
  ) {
    try {
      const presignedUrl = await this.awsS3Service.getSignedUrl(fileName);
      return presignedUrl;
    } catch (error) {
      console.log(error);
      throw new HttpException(
        'Failed to get signed url',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Public()
  @Post('/check-app-version')
  checkAppVersion(@Body() body: { app_version: string; platform: string }) {
    try {
      if (!body.app_version || !body.platform) {
        throw new HttpException(
          'App version and platform are required',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (
        !body.platform ||
        (body.platform !== 'ios' && body.platform !== 'android')
      ) {
        throw new HttpException(
          'Platform is required and must be ios or android',
          HttpStatus.BAD_REQUEST,
        );
      }

      const iosSupportedAppVersions =
        process.env.IOS_APP_VERSION?.split(',') || [];
      const androidSupportedAppVersions =
        process.env.ANDROID_APP_VERSION?.split(',') || [];

      if (
        body.platform === 'ios' &&
        !iosSupportedAppVersions.includes(body.app_version)
      ) {
        throw new HttpException(
          'App version is not supported',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (
        body.platform === 'android' &&
        !androidSupportedAppVersions.includes(body.app_version)
      ) {
        throw new HttpException(
          'App version is not supported',
          HttpStatus.BAD_REQUEST,
        );
      }

      return [true, 'app version is supported'];
    } catch (error) {
      console.log(error);
      throw new HttpException(
        'Failed to check app version',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
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
      const filename = await this.awsS3Service.uploadFiles([image], 'test');
      return {
        message: 'Image uploaded successfully',
        fileUrl: filename,
      };
    } catch (error) {
      console.log(error);
      throw new HttpException(
        'Failed to upload image',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
