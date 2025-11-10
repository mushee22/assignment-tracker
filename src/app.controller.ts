import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './lib/is-public';
import { MailService } from './mail/mail.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly mailService: MailService,
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
    const result = await this.mailService.sendReminder(
      body.to,
      body.name,
      body.message,
      'Test',
    );
    return [result, 'mail sent successfully'];
  }
}
