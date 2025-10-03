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
  UploadedFile,
} from '@nestjs/common';
import { AssignmentService } from './assignment.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { AssigneFindQuery } from './dto/assignment.dto';
import { AuthUser } from '../users/auth-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { AssignmentAttachmentPipe } from 'src/pipe/assignment-attachement.pipe';

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

  @Post('/')
  @UseInterceptors(FileInterceptor('attachments'))
  createAssignment(
    @UploadedFile(new AssignmentAttachmentPipe())
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

  @Post('/:id/attachments')
  @UseInterceptors(FileInterceptor('attachments'))
  async uploadAttachment(
    @Param('id') id: number,
    @UploadedFile(new AssignmentAttachmentPipe())
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
