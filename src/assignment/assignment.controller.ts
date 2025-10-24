import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { User } from '@prisma/client';
import { UserInterceptor } from 'src/interceptor/user.interceptor';
import { Public } from 'src/lib/is-public';
import { AssignmentAttachmentPipe } from 'src/pipe/assignment-attachement.pipe';
import { AuthUser } from '../users/auth-user.decorator';
import { AssignmentService } from './assignment.service';
import { AssigneFindQuery } from './dto/assignment.dto';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { ShareAssignmentDto } from './dto/share-assignment.dto';
import { UpdateAssignmentNotificationStatusDto } from './dto/update-assignment-notification-status.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';

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

  @Get('statistics/')
  @UseInterceptors(UserInterceptor)
  async getUserAssignmentStatistics(@AuthUser('id') authId: number) {
    const assignment =
      await this.assignmentService.getUserAssignmentStatistics(authId);
    return [assignment, 'Shared Assignments fetched successfully'];
  }

  @Post('/')
  @UseInterceptors(FilesInterceptor('attachments'))
  async createAssignment(
    @UploadedFiles(new AssignmentAttachmentPipe())
    attachments: Array<Express.Multer.File>,
    @Body() createAssignmentDto: CreateAssignmentDto,
    @AuthUser('id') authId: number,
  ) {
    const assignment = await this.assignmentService.create(
      authId,
      createAssignmentDto,
      attachments,
    );
    return [assignment, 'Assignment created successfully'];
  }

  @Get('/:id')
  async getAssignment(@Param('id') id: number, @AuthUser('id') authId: number) {
    const assignment = await this.assignmentService.getAssignmentDetails(
      authId,
      id,
    );
    return [assignment, 'Assignment fetched successfully'];
  }

  @Put('/:id')
  async updateAssignment(
    @Param('id') id: number,
    @Body() updateAssignmentDto: UpdateAssignmentDto,
    @AuthUser('id') authId: number,
  ) {
    const assignment = await this.assignmentService.update(
      authId,
      id,
      updateAssignmentDto,
    );
    return [assignment, 'Assignment updated successfully'];
  }

  @Get('/:id/notes')
  async getNotes(@Param('id') id: number, @AuthUser('id') authId: number) {
    const notes = await this.assignmentService.getAssignmentNotes(authId, id);
    return [notes, 'Assignment notes fetched successfully'];
  }

  @Post('/:id/notes')
  async addNote(
    @Param('id') id: number,
    @AuthUser('id') authId: number,
    @Body('note') note: string,
  ) {
    const assignment = await this.assignmentService.addNewAssignmentNote(
      authId,
      id,
      note,
    );
    return [assignment, 'Assignment note added successfully'];
  }

  @Delete('/:id/notes')
  async deleteNote(
    @Param('id') assignmentId: number,
    @AuthUser('id') authId: number,
    @Body('note_id') noteId: number,
  ) {
    await this.assignmentService.deleteAssignmentNote(
      authId,
      assignmentId,
      noteId,
    );
    return [true, 'Assignment notes deleted successfully'];
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
  @UseInterceptors(FilesInterceptor('attachments'))
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
    return [true, 'New Attachment uploaded successfully'];
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
    @Body('id') attachmentIds: number,
    @AuthUser('id') authId: number,
  ) {
    const deleteResult =
      await this.assignmentService.deleteAssigmentAttachement(authId, id, [
        attachmentIds,
      ]);
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
