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
      const presignedUrl = await this.awsS3Service.getSignedUrl(
        fileName,
        fileType,
      );
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
