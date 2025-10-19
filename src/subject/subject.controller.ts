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
  async findAll(
    @Query() query: SubjectFindQuery,
    @AuthUser('id') authId: number,
  ) {
    const subjects = await this.subjectService.findAll(authId, query);
    return [subjects, 'Subjects fetched successfully'];
  }

  @Get('/:id')
  @HttpCode(200)
  async findOne(@Param('id') id: number, @AuthUser('id') authId: number) {
    const subject = await this.subjectService.findOne(authId, id);
    return [subject, 'Subject fetched successfully'];
  }

  @Post('/')
  @HttpCode(201)
  @UseInterceptors(FileInterceptor('icon'))
  async create(
    @UploadedFile(new SubjectIconPipe()) icon: Express.Multer.File,
    @Body() createSubjectDto: CreateSubjectDto,
    @AuthUser('id') authId: number,
  ) {
    const created = await this.subjectService.create(
      authId,
      createSubjectDto,
      icon,
    );
    return [created, 'Subject created successfully'];
  }

  @Put('/:id')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('icon'))
  async update(
    @Param('id') id: number,
    @Body() updateSubjectDto: UpdateSubjectDto,
    @AuthUser('id') authId: number,
    @UploadedFile(new SubjectIconPipe()) icon?: Express.Multer.File,
  ) {
    const updated = await this.subjectService.update(
      authId,
      id,
      updateSubjectDto,
      icon,
    );
    return [updated, 'Subject updated successfully'];
  }

  @Delete('/:id')
  @HttpCode(200)
  async remove(@Param('id') id: number, @AuthUser('id') authId: number) {
    const deleteResult = await this.subjectService.delete(authId, id);
    return [deleteResult, 'Subject deleted successfully'];
  }
}
