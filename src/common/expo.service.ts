import { Injectable } from '@nestjs/common';
import Expo, { ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { NotificationData } from 'src/type';

@Injectable()
export class ExpoService {
  private expo: Expo;

  constructor() {
    this.initExpo();
  }

  private initExpo() {
    this.expo = new Expo({
      accessToken: process.env.EXPO_ACCESS_TOKEN,
    });
  }

  private setPushMessageForToken(data: Map<string, NotificationData>) {
    const expoPushMessages: ExpoPushMessage[] = [];
    const inValidTokens: string[] = [];
    for (const [token, notificationData] of data) {
      if (!Expo.isExpoPushToken(token)) {
        inValidTokens.push(token);
        continue;
      }
      expoPushMessages.push({
        ...notificationData,
        to: token,
      });
    }
    return { expoPushMessages, inValidTokens };
  }

  private findErrorTickets(tickets: ExpoPushTicket[]) {
    const invalidTokens: string[] = [];
    tickets.forEach((ticket) => {
      if (
        ticket.status === 'error' &&
        ticket.details?.error === 'DeviceNotRegistered' &&
        ticket.details?.expoPushToken
      ) {
        invalidTokens.push(ticket.details?.expoPushToken);
      }
    });
    return invalidTokens;
  }

  private async sendPushMessages(messages: ExpoPushMessage[]) {
    try {
      const tickets: ExpoPushTicket[] = [];

      if (!messages.length) {
        return { tickets };
      }
      const chunks = this.expo.chunkPushNotifications(messages);

      for (const chunk of chunks) {
        try {
          const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
        } catch (error) {
          console.log(error);
        }
      }
      return { tickets };
    } catch (error) {
      console.log(error);
    }
  }

  async sendPushNotification(data: Map<string, NotificationData>) {
    const { expoPushMessages, inValidTokens } =
      this.setPushMessageForToken(data);
    const response = await this.sendPushMessages(expoPushMessages);
    inValidTokens.push(...this.findErrorTickets(response?.tickets ?? []));
    return { tickets: response?.tickets, inValidTokens };
  }
}
