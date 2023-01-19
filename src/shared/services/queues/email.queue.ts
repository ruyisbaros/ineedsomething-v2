import { emailWorker } from "../../workers/email.worker";
import { IEmailJob } from "../../../features/interfaces/user.interface";
import { BaseQueue } from "./base.queue";

class EmailQueue extends BaseQueue {
  constructor() {
    super("emails");
    this.processJob("forgotPasswordMail", 5, emailWorker.sendNotificationEmail);
    this.processJob("commentsNotMail", 5, emailWorker.sendNotificationEmail);
    this.processJob("followNotMail", 5, emailWorker.sendNotificationEmail);
    this.processJob("reactionsNotMail", 5, emailWorker.sendNotificationEmail);
    this.processJob("messageNotMail", 5, emailWorker.sendNotificationEmail);
    this.processJob("changePwdNotMail", 5, emailWorker.sendNotificationEmail);
  }

  public addEmailJob(name: string, data: IEmailJob): void {
    this.addJob(name, data);
  }
}

export const emailQueue: EmailQueue = new EmailQueue();
