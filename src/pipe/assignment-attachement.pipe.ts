import {
  HttpException,
  HttpStatus,
  Injectable,
  PipeTransform,
} from '@nestjs/common';

@Injectable()
export class AssignmentAttachmentPipe implements PipeTransform {
  transform(value: any) {
    if (!value) return null;

    const MAX_ASSIGNMENT_ATTACHMENT_SIZE =
      process.env.MAX_ASSIGNMENT_ATTACHMENT_SIZE || 5 * 1024 * 1024; //5MB
    const ALLOWED_FILE_TYPES =
      process.env.ASSIGNMENT_ATTACHMENT_ALLOWED_FILE_TYPES ||
      'pdf,docx,doc,xlsx,xls,ppt,pptx,jpg,jpeg,png';
    const allowedFileTypes = ALLOWED_FILE_TYPES.split(',');

    if (!Array.isArray(value)) {
      const file = value as Express.Multer.File;
      const size = MAX_ASSIGNMENT_ATTACHMENT_SIZE;
      const fileSize = file?.size;
      if (fileSize > Number(size)) {
        throw new HttpException(
          `File size must be less than ${size} bytes`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const filesNameSplit = file?.originalname.split('.');
      const fileType = filesNameSplit[filesNameSplit.length - 1]?.toLowerCase();
      if (!allowedFileTypes.includes(fileType)) {
        throw new HttpException(
          `File type must be ${ALLOWED_FILE_TYPES} Your file type is ${fileType}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      return value as Express.Multer.File;
    }

    for (const file of value as Array<Express.Multer.File>) {
      const size = MAX_ASSIGNMENT_ATTACHMENT_SIZE;
      const fileSize = file?.size;
      if (fileSize > Number(size)) {
        throw new HttpException(
          `File size must be less than ${size} bytes`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const filesNameSplit = file?.originalname.split('.');
      const fileType = filesNameSplit[filesNameSplit.length - 1];

      if (!allowedFileTypes.includes(fileType?.toLowerCase())) {
        throw new HttpException(
          `File type must be ${ALLOWED_FILE_TYPES} Your file type of ${file.originalname} is ${fileType}`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    return value as Array<Express.Multer.File>;
  }
}
