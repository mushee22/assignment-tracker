import { Global, Module } from '@nestjs/common';
import { ExpoService } from './expo.service';
import { FirebaseService } from './firebase.service';
import { AssignmentProvider } from './assignment.provider';
import { UserProvider } from './user.provider';

@Global()
@Module({
  providers: [ExpoService, FirebaseService, AssignmentProvider, UserProvider],
  exports: [ExpoService, FirebaseService, AssignmentProvider, UserProvider],
})
export class CommonModule {}
