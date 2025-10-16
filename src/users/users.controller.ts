import {
  Body,
  Controller,
  Get,
  HttpStatus,
  ParseFilePipeBuilder,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { SaveDeviceTokenDto } from './dto/save-device-token.dto';
import { CreateNewPasswordDto } from './dto/create-new-password.dto';
import { User } from '@prisma/client';
import { AuthUser } from './auth-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateReminderScheduleDto } from './dto/update-reminder-schedule.dto';
import { UpdateUserNotifcationSetttingsDto } from './dto/update-notifcation-service.dto';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  async getMe(@AuthUser('id') authId: number) {
    const user = await this.usersService.findOneById(authId);
    return [user];
  }

  @Post('save-device-token')
  async saveDeviceToken(
    @Body() saveDeviceTokenDto: SaveDeviceTokenDto,
    @AuthUser('id') authId: number,
  ) {
    const isSaved = await this.usersService.saveUserDeviceToken(
      authId,
      saveDeviceTokenDto,
    );
    return [isSaved, 'user Device token saved'];
  }

  @Put('me/create-new-password')
  async createNewPassword(
    @Body() createNewPasswordDto: CreateNewPasswordDto,
    @AuthUser('id') authId: number,
  ) {
    const updatedUser = await this.usersService.createNewPassword(
      authId,
      createNewPasswordDto,
    );
    return [updatedUser, 'user password updated'];
  }

  @Put('me/update-profile')
  @UseInterceptors(FileInterceptor('profile_picture'))
  async updateProfilePicture(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: 1024 * 1024 })
        .addFileTypeValidator({ fileType: /(jpg|jpeg|png)$/ })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    profile_picture: Express.Multer.File,
    @AuthUser('id') authId: number,
  ) {
    const updatedUser = await this.usersService.updateProfilePicture(
      authId,
      profile_picture,
    );
    return [updatedUser, 'user profile picture updated'];
  }

  @Put('me')
  async updateUser(
    @Body() updateUserDto: Pick<User, 'name' | 'phone'>,
    @AuthUser('id') authId: number,
  ) {
    const updatedUser = await this.usersService.updatedUser(
      authId,
      updateUserDto,
    );
    return [updatedUser, 'user updated'];
  }

  @Put('me/update-reminder-schedule')
  async updateReminderSchedule(
    @Body() updateReminderScheduleDto: UpdateReminderScheduleDto,
    @AuthUser('id') authId: number,
  ) {
    const updatedUser = await this.usersService.updateReminderSchedule(
      authId,
      updateReminderScheduleDto,
    );
    return [updatedUser, 'user reminder schedule updated'];
  }

  @Put('me/update-notification-settings')
  async updateUserNotifcationSetttings(
    @Body()
    UpdateUserNotifcationSetttingsDto: UpdateUserNotifcationSetttingsDto,
    @AuthUser('id') authId: number,
  ) {
    const updatedUser = await this.usersService.updateUserNotifcationSetttings(
      authId,
      UpdateUserNotifcationSetttingsDto,
    );
    return [updatedUser, 'user notification settings updated'];
  }
}
