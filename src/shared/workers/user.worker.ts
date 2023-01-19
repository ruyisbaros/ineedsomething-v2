import { userService } from "./../services/db/user.services";
import { DoneCallback, Job } from "bull";
import Logger from "bunyan";
import { config } from "../../config";
import UserModel from "../../features/models/userModel";

const log: Logger = config.createLogger("authWorker");

class UserWorker {
  async addUserToDb(job: Job, done: DoneCallback): Promise<void> {
    try {
      const { value } = job.data;
      //method for adding DB entry
      await UserModel.create(value);
      job.progress(100);
      done(null, job.data);
    } catch (error) {
      log.error(error);
      done(error as Error);
    }
  }
  async updateUserInfo(job: Job, done: DoneCallback): Promise<void> {
    try {
      const { key, value } = job.data;
      await userService.updateUserInfo(key, value);
      job.progress(100);
      done(null, job.data);
    } catch (error) {
      log.error(error);
      done(error as Error);
    }
  }
  async updateSocialLinks(job: Job, done: DoneCallback): Promise<void> {
    try {
      const { key, value } = job.data;
      await userService.updateSocialLinks(key, value);
      job.progress(100);
      done(null, job.data);
    } catch (error) {
      log.error(error);
      done(error as Error);
    }
  }

  async updateNotsReceive(job: Job, done: DoneCallback): Promise<void> {
    try {
      const { key, value } = job.data;
      await userService.updateNotsReceive(key, value);
      job.progress(100);
      done(null, job.data);
    } catch (error) {
      log.error(error);
      done(error as Error);
    }
  }
}

export const userWorker: UserWorker = new UserWorker();
