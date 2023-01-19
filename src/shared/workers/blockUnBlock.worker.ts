import { followerService } from "./../services/db/follower.services";
import { DoneCallback, Job } from "bull";
import Logger from "bunyan";
import { config } from "../../config";

const log: Logger = config.createLogger("blockUnBlockWorker");

class BlockUnBlockWorker {
  async blockUnBlockDB(job: Job, done: DoneCallback): Promise<void> {
    try {
      const { keyOne, keyTwo, type } = job.data;
      //console.log("data: " + data.createdReaction)
      if (type === "block") {
        await followerService.blockUser(keyOne, keyTwo);
      } else {
        await followerService.unBlockUser(keyOne, keyTwo);
      }
      job.progress(100);
      done(null, job.data);
    } catch (error) {
      log.error(error);
      done(error as Error);
    }
  }
}

export const blockUnBlockWorker: BlockUnBlockWorker = new BlockUnBlockWorker();
