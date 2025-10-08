import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { SubjectService } from './subject.service';
import { CreateSubjectDto } from './dto/create-subject-dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { SubjectFindQuery } from './dto/subject.dto';
import { AuthUser } from 'src/users/auth-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { SubjectIconPipe } from 'src/pipe/subject-icon-attachemnt.pipe';

@Controller('subject')
export class SubjectController {
  constructor(private readonly subjectService: SubjectService) {}

  @Get('/')
  @HttpCode(200)
  findAll(@Query() query: SubjectFindQuery, @AuthUser('id') authId: number) {
    const subjects = this.subjectService.findAll(authId, query);
    return [subjects, 'Subjects fetched successfully'];
  }

  @Get('/:id')
  @HttpCode(200)
  findOne(@Param('id') id: number, @AuthUser('id') authId: number) {
    const subject = this.subjectService.findOne(authId, id);
    return [subject, 'Subject fetched successfully'];
  }

  @Post('/')
  @HttpCode(201)
  @UseInterceptors(FileInterceptor('icon'))
  create(
    @UploadedFile(new SubjectIconPipe()) icon: Express.Multer.File,
    @Body() createSubjectDto: CreateSubjectDto,
    @AuthUser('id') authId: number,
  ) {
    const created = this.subjectService.create(authId, createSubjectDto, icon);
    return [created, 'Subject created successfully'];
  }

  @Put('/:id')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('icon'))
  update(
    @Param('id') id: number,
    @Body() updateSubjectDto: UpdateSubjectDto,
    @AuthUser('id') authId: number,
    @UploadedFile(new SubjectIconPipe()) icon?: Express.Multer.File,
  ) {
    const updated = this.subjectService.update(
      authId,
      id,
      updateSubjectDto,
      icon,
    );
    return [updated, 'Subject updated successfully'];
  }

  @Delete('/:id')
  @HttpCode(200)
  remove(@Param('id') id: number, @AuthUser('id') authId: number) {
    const deleteResult = this.subjectService.delete(authId, id);
    return [deleteResult, 'Subject deleted successfully'];
  }
}
