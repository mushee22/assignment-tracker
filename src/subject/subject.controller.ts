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
} from '@nestjs/common';
import { SubjectService } from './subject.service';
import { CreateSubjectDto } from './dto/create-subject-dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { SubjectFindQuery } from './dto/subject.dto';
import { AuthUser } from 'src/users/auth-user.decorator';

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
  create(
    @Body() createSubjectDto: CreateSubjectDto,
    @AuthUser('id') authId: number,
  ) {
    const created = this.subjectService.create(authId, createSubjectDto);
    return [created, 'Subject created successfully'];
  }

  @Put('/:id')
  @HttpCode(200)
  update(
    @Param('id') id: number,
    @Body() updateSubjectDto: UpdateSubjectDto,
    @AuthUser('id') authId: number,
  ) {
    const updated = this.subjectService.update(authId, id, updateSubjectDto);
    return [updated, 'Subject updated successfully'];
  }

  @Delete('/:id')
  @HttpCode(200)
  remove(@Param('id') id: number, @AuthUser('id') authId: number) {
    const deleteResult = this.subjectService.delete(authId, id);
    return [deleteResult, 'Subject deleted successfully'];
  }
}
