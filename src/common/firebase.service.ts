import { Injectable } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import admin from 'firebase-admin';
import { FirebaseMessage, NotificationData } from 'src/type';

@Injectable()
export class FirebaseService {
  private app?: admin.app.App;
  constructor() {
    this.initializeFirebaseApp();
  }

  private initializeFirebaseApp() {
    if (admin.apps.length === 0) {
      this.app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env['FIREBASE_PROJECT_ID'] ?? '',
          clientEmail: process.env['FIREBASE_CLIENT_EMAIL'] ?? '',
          privateKey: process.env['FIREBASE_PRIVATE_KEY'] ?? '',
        }),
      });
    }
  }

  private createChunkArray(array: string[], size: number) {
    return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
      array.slice(i * size, i * size + size),
    );
  }

  private async sendPushMessage(messages: FirebaseMessage[]) {
    const inValidTokens: string[] = [];
    for (const message of messages) {
      try {
        await this.app?.messaging().send(message);
      } catch (error) {
        if (
          (error as { code?: string })?.code ===
            'messaging/registration-token-not-registered' ||
          (error as { code?: string })?.code === 'messaging/invalid-argument'
        ) {
          inValidTokens.push(message.token);
        }
      }
    }
    return inValidTokens;
  }

  async sendPushNotification(data: Map<string, NotificationData>) {
    if (!this.app) {
      throw new Error('Firebase app not initialized');
    }
    const chunks = this.createChunkArray([...data.keys()], 500);
    for (const chunk of chunks) {
      const messages = chunk.map((token) => {
        const tokenData = data.get(token);
        return {
          token: token,
          condition: 'platform == "android"',
          notification: {
            title: tokenData?.title,
            body: tokenData?.body,
            data: {
              url: tokenData?.url || '',
              type: tokenData?.type || NotificationType.OTHER,
              id: tokenData?.id || '',
            },
          },
        };
      });
      const inValidTokens = await this.sendPushMessage(messages);
      return inValidTokens;
    }
  }
}
