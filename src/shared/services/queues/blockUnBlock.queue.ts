import { blockUnBlockWorker } from "./../../workers/blockUnBlock.worker";
import { IBlockedUserJobData } from "./../../../features/interfaces/follower.interface";
import { BaseQueue } from "./base.queue";

class BlockUnBlockQueue extends BaseQueue {
  constructor() {
    super("blockUnBlock");
    this.processJob("blockUser", 5, blockUnBlockWorker.blockUnBlockDB);
    this.processJob("unBlockUser", 5, blockUnBlockWorker.blockUnBlockDB);
  }

  public addBlockJob(name: string, data: IBlockedUserJobData): void {
    this.addJob(name, data);
  }
}

export const blockUnBlockQueue: BlockUnBlockQueue = new BlockUnBlockQueue();
