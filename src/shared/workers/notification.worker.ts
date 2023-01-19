import { notificationServices } from "./../services/db/notification.services";
import { DoneCallback, Job } from "bull";
import Logger from "bunyan";
import { config } from "../../config";

const log: Logger = config.createLogger("notificationWorker");

class NotificationWorker {
  async removeNotificationFromDb(job: Job, done: DoneCallback): Promise<void> {
    try {
      const { key } = job.data;
      await notificationServices.deleteNotifications(key);
      job.progress(100);
      done(null, job.data);
    } catch (error) {
      log.error(error);
      done(error as Error);
    }
  }

  async updateNotificationInDb(job: Job, done: DoneCallback): Promise<void> {
    try {
      const { key } = job.data;
      await notificationServices.updateNotifications(key);
      job.progress(100);
      done(null, job.data);
    } catch (error) {
      log.error(error);
      done(error as Error);
    }
  }
}

export const notificationWorker: NotificationWorker = new NotificationWorker();
