import { DoneCallback, Job } from "bull";
import Logger from "bunyan";
import { config } from "../../config";
import AuthUser from "../../features/models/authModel";

const log: Logger = config.createLogger("authWorker");

class AuthWorker {
  async addAuthToDb(job: Job, done: DoneCallback): Promise<void> {
    try {
      const { value } = job.data;
      //method for adding DB entry
      await AuthUser.create(value);
      job.progress(100);
      done(null, job.data);
    } catch (error) {
      log.error(error);
      done(error as Error);
    }
  }
}

export const authWorker: AuthWorker = new AuthWorker();
