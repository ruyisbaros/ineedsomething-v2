import { commentsWorker } from './../../workers/comments.worker';
import { ICommentJob } from './../../../features/interfaces/comments.interface';
import { BaseQueue } from "./base.queue";

class CommentsQueue extends BaseQueue {
    constructor() {
        super("comments");
        this.processJob("addComment", 5, commentsWorker.addNewCommentToDb)
        //this.processJob("removeReaction", 5, reactionWorker.removeReactionFromDB)
    }

    public addCommentJob(name: string, data: ICommentJob): void {
        this.addJob(name, data);
    }
}

export const commentsQueue: CommentsQueue = new CommentsQueue()