import { Global, Module } from '@nestjs/common';
import { ExpoService } from './expo.service';
import { FirebaseService } from './firebase.service';
import { AssignmentProvider } from './assignment.provider';
import { UserProvider } from './user.provider';
import { SocialLoginService } from './social-login.service';
import { AttachmentService } from './attachment.service';

@Global()
@Module({
  providers: [
    ExpoService,
    FirebaseService,
    AssignmentProvider,
    UserProvider,
    SocialLoginService,
    AttachmentService,
  ],
  exports: [
    ExpoService,
    FirebaseService,
    AssignmentProvider,
    UserProvider,
    SocialLoginService,
    AttachmentService,
  ],
})
export class CommonModule {}
