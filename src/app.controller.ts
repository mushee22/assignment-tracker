import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './lib/is-public';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Get('/debug-sentry')
  getError() {
    throw new Error('My first Sentry error!');
  }
}
