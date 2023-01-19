import { notificationWorker } from "./../../workers/notification.worker";
import { INotificationJobData } from "./../../../features/interfaces/notifications.interface";
import { BaseQueue } from "./base.queue";

class NotificationQueue extends BaseQueue {
  constructor() {
    super("notification");
    this.processJob(
      "updateNotification",
      5,
      notificationWorker.updateNotificationInDb
    );
    this.processJob(
      "deleteNotification",
      5,
      notificationWorker.removeNotificationFromDb
    );
  }

  public addNotificationJob(name: string, data: INotificationJobData): void {
    this.addJob(name, data);
  }
}

export const notificationQueue: NotificationQueue = new NotificationQueue();
