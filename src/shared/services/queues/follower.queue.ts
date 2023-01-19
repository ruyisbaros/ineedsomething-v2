import { followerWorker } from './../../workers/follower.worker';
import { IFollowerJobData } from './../../../features/interfaces/follower.interface';
import { BaseQueue } from "./base.queue";

class FollowerQueue extends BaseQueue {
    constructor() {
        super("followers");
        this.processJob("addFollow", 5, followerWorker.addFollowerToDb)
        this.processJob("removeFollow", 5, followerWorker.removeFollowerFromDb)

    }

    public addFollowJob(name: string, data: IFollowerJobData): void {
        this.addJob(name, data);
    }
}

export const followerQueue: FollowerQueue = new FollowerQueue()