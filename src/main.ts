import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  BadRequestException,
  ConsoleLogger,
  ValidationPipe,
} from '@nestjs/common';
import { ResponseInterceptor } from './response-interceptor';
import { transformValidationMessages } from './lib/validation-message-transform';
import helmet from 'helmet';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({
      json: true,
      colors: true,
    }),
  });
  app.use(helmet());
  app.enableCors();
  app.setGlobalPrefix('api/v1');

  const config = new DocumentBuilder()
    .setTitle('Assignment Tracker API')
    .setDescription('The Assignment Tracker API description')
    .setVersion('1.0')
    .addTag('assignment-tracker')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  app.useGlobalPipes(
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

  app.useGlobalInterceptors(new ResponseInterceptor());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
