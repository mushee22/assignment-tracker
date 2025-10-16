import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  Req,
  UploadedFiles,
} from '@nestjs/common';
import { AssignmentService } from './assignment.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { AssigneFindQuery } from './dto/assignment.dto';
import { AuthUser } from '../users/auth-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { AssignmentAttachmentPipe } from 'src/pipe/assignment-attachement.pipe';
import { UpdateAssignmentNotificationStatusDto } from './dto/update-assignment-notification-status.dto';
import { ShareAssignmentDto } from './dto/share-assignment.dto';
import { UserInterceptor } from 'src/interceptor/user.interceptor';
import { Public } from 'src/lib/is-public';
import { User } from '@prisma/client';

@Controller('assignment')
export class AssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  @Get('/')
  async getAssignments(
    @Query() query: AssigneFindQuery,
    @AuthUser('id') authId: number,
  ) {
    const assignments = await this.assignmentService.findAll(authId, query);
    return [assignments, 'Assignments fetched successfully'];
  }

  @Get('shared-assignment/')
  @UseInterceptors(UserInterceptor)
  async getSharedAssignments(@AuthUser('id') authId: number) {
    const assignment =
      await this.assignmentService.findUserSharedAssignments(authId);
    return [assignment, 'Shared Assignments fetched successfully'];
  }

  @Post('/')
  @UseInterceptors(FileInterceptor('attachments'))
  createAssignment(
    @UploadedFiles(new AssignmentAttachmentPipe())
    attachments: Array<Express.Multer.File>,
    @Body() createAssignmentDto: CreateAssignmentDto,
    @AuthUser('id') authId: number,
  ) {
    const assignment = this.assignmentService.create(
      authId,
      createAssignmentDto,
      attachments,
    );
    return [assignment, 'Assignment created successfully'];
  }

  @Get('/:id')
  async getAssignment(@Param('id') id: number, @AuthUser('id') authId: number) {
    const assignment = await this.assignmentService.findOne(id, authId);
    return [assignment, 'Assignment fetched successfully'];
  }

  @Put('/:id')
  updateAssignment(
    @Param('id') id: number,
    @Body() updateAssignmentDto: UpdateAssignmentDto,
    @AuthUser('id') authId: number,
  ) {
    const assignment = this.assignmentService.update(
      authId,
      id,
      updateAssignmentDto,
    );
    return [assignment, 'Assignment updated successfully'];
  }

  @Put('/:id/mark-as-completed')
  async markAsCompleted(
    @Param('id') id: number,
    @AuthUser('id') authId: number,
  ) {
    const assignment = await this.assignmentService.markAsDone(authId, id);
    return [assignment, 'Assignment marked as completed successfully'];
  }

  @Put('/:id/progress')
  async updateProgress(
    @Param('id') id: number,
    @AuthUser('id') authId: number,
    @Body('progress') progress: number,
  ) {
    const assignment = await this.assignmentService.updateProgress(
      authId,
      id,
      progress,
    );
    return [assignment, 'Assignment progress updated successfully'];
  }

  @Put('/:id/mark-as-cancelled')
  async markAsCancelled(
    @Param('id') id: number,
    @AuthUser('id') authId: number,
    @Body('reason') reason?: string,
  ) {
    const assignment = await this.assignmentService.markAsCancelled(
      authId,
      id,
      reason,
    );
    return [assignment, 'Assignment marked as cancelled successfully'];
  }

  @Put('/:id/notification-status')
  async toggleNotificationStatus(
    @Param('id') id: number,
    @Body() data: UpdateAssignmentNotificationStatusDto,
    @AuthUser('id') authId: number,
  ) {
    const assignment =
      await this.assignmentService.toggleAssignmentNotificationStatus(
        authId,
        id,
        data,
      );
    return [assignment, 'Assignment Notification status updated successfully'];
  }

  @Post('/:id/attachments')
  @UseInterceptors(FileInterceptor('attachments'))
  async uploadAttachment(
    @Param('id') id: number,
    @UploadedFiles(new AssignmentAttachmentPipe())
    attachments: Array<Express.Multer.File>,
    @AuthUser('id') authId: number,
  ) {
    await this.assignmentService.updatedNewAssignmentAttachMents(
      authId,
      attachments,
      id,
    );
    return [true, 'Attachment uploaded successfully'];
  }

  @Post('/:id/share')
  async shareAssignment(
    @Param('id') id: number,
    @Body() shareAssignmentDto: ShareAssignmentDto,
    @AuthUser('id') authId: number,
  ) {
    const assignment = await this.assignmentService.shareAssignment(
      authId,
      id,
      shareAssignmentDto,
    );
    return [assignment, 'Assignment shared successfully'];
  }

  @Delete('/:id/share')
  @UseInterceptors(UserInterceptor)
  async deleteSharedAssignmentUsers(
    @Param('id') id: number,
    @AuthUser('id') authId: number,
    @Body('email') email: string[],
  ) {
    const deleteResult =
      await this.assignmentService.removeAccessToTheAssignment(
        authId,
        id,
        email,
      );
    return [deleteResult, 'Shared Assignments deleted successfully'];
  }

  @Get('/:id/shared-assignment/users')
  @UseInterceptors(UserInterceptor)
  async getSharedAssignmentUsers(
    @Param('id') id: number,
    @AuthUser('id') authId: number,
  ) {
    const sharedAssignments =
      await this.assignmentService.getAssignmentSharedUsers(authId, id);
    return [sharedAssignments, 'Shared Assignments fetched successfully'];
  }

  @Public()
  @Get('/:id/shared-assignment')
  @UseInterceptors(UserInterceptor)
  async getSharedAssignment(
    @Param('id') id: number,
    @Query('token') token: string,
    @Req() req: Request,
  ) {
    const authId = req['user'] as User;
    const assignment = await this.assignmentService.findSharedAssignment(
      id,
      { token },
      authId?.id,
    );
    return [assignment, 'Shared Assignments fetched successfully'];
  }

  @Delete('/:id/attachments/')
  async deleteAttachment(
    @Param('id') id: number,
    @Body('ids') attachmentIds: number[],
    @AuthUser('id') authId: number,
  ) {
    const deleteResult =
      await this.assignmentService.deleteAssigmentAttachement(
        authId,
        id,
        attachmentIds,
      );
    return [deleteResult, 'Attachment deleted successfully'];
  }

  @Delete('/:id')
  async deleteAssignment(
    @Param('id') id: number,
    @AuthUser('id') authId: number,
  ) {
    const deleteResult = await this.assignmentService.delete(authId, id);
    return [deleteResult, 'Assignment deleted successfully'];
  }
}
