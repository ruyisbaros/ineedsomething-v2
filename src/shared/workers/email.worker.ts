import { mailTransport } from '../services/emails/mail.transport';
import { DoneCallback, Job } from "bull"
import Logger from "bunyan"
import { config } from "../../config"


const log: Logger = config.createLogger("emailWorker")

class EmailWorker {

    async sendNotificationEmail(job: Job, done: DoneCallback): Promise<void> {
        try {
            const { template, receiverEmail, subject } = job.data;
            //method send mail to receiver
            mailTransport.sendEmail(receiverEmail, subject, template)
            job.progress(100)
            done(null, job.data)
        } catch (error) {
            log.error(error)
            done(error as Error)
        }
    }
}

export const emailWorker: EmailWorker = new EmailWorker()