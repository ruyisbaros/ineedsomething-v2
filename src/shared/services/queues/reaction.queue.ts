import { reactionWorker } from './../../workers/reaction.worker';
import { IReactionJob } from './../../../features/interfaces/reaction.interface';
import { BaseQueue } from "./base.queue";

class ReactionQueue extends BaseQueue {
    constructor() {
        super("reaction");
        this.processJob("addReaction", 5, reactionWorker.addNewReactionToDb)
        this.processJob("removeReaction", 5, reactionWorker.removeReactionFromDB)
    }

    public addReactionJob(name: string, data: IReactionJob): void {
        this.addJob(name, data);
    }
}

export const reactionQueue: ReactionQueue = new ReactionQueue()