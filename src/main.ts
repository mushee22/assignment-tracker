import './instrument';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  BadRequestException,
  ConsoleLogger,
  INestApplication,
  NestApplicationOptions,
  ValidationPipe,
} from '@nestjs/common';
import { ResponseInterceptor } from './response-interceptor';
import { transformValidationMessages } from './lib/validation-message-transform';
import helmet from 'helmet';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

class NestApplicationMainService {
  private app: INestApplication;

  private applicationOptions: NestApplicationOptions;

  constructor() {
    this.applicationOptions = {
      logger: new ConsoleLogger({
        json: true,
        colors: true,
      }),
    };
  }

  async start() {
    this.app = await NestFactory.create(AppModule, {
      ...this.applicationOptions,
    });
    this.setUpSecurity();
    this.setGloabalCongig();
    this.setUpTools();
    await this.app.listen(process.env.PORT ?? 3000);
  }

  private setGloabalCongig() {
    this.app.setGlobalPrefix('api/v1');
    this.app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        disableErrorMessages: false,
        exceptionFactory: (errors) => {
          const transformedErrors = transformValidationMessages(errors);
          return new BadRequestException({
            statusCode: 400,
            error: transformedErrors,
            message: 'Bad Request',
          });
        },
      }),
    );
    this.app.useGlobalInterceptors(new ResponseInterceptor());
  }

  private setUpSecurity() {
    this.app.use(helmet());
    this.app.enableCors();
  }

  private setUpTools() {
    this.setupSwagger();
  }

  private setupSwagger() {
    const config = new DocumentBuilder()
      .setTitle('Assignment Tracker API')
      .setDescription('The Assignment Tracker API description')
      .setVersion('1.0')
      .addTag('assignment-tracker')
      .build();
    const document = SwaggerModule.createDocument(this.app, config);
    SwaggerModule.setup('docs', this.app, document);
  }
}

new NestApplicationMainService()
  .start()
  .then(() => console.log('Server started'))
  .catch((err) => console.log(err));
