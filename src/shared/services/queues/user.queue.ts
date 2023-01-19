import { IUserJob } from "./../../../features/interfaces/user.interface";
import { userWorker } from "../../workers/user.worker";
import { IAuthJob } from "../../../features/interfaces/auth.interfaces";
import { BaseQueue } from "./base.queue";

class UserQueue extends BaseQueue {
  constructor() {
    super("user");
    this.processJob("addNewUser", 5, userWorker.addUserToDb);
    this.processJob("updateUserInfo", 5, userWorker.updateUserInfo);
    this.processJob("updateSocialLinks", 5, userWorker.updateSocialLinks);
    this.processJob("updateNotsReceive", 5, userWorker.updateNotsReceive);
  }

  public addUserJob(name: string, data: IUserJob): void {
    this.addJob(name, data);
  }
}

export const userQueue: UserQueue = new UserQueue();
