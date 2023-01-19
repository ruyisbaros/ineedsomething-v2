import { commentService } from './../services/db/comment.services';
import { DoneCallback, Job } from "bull"
import Logger from "bunyan"
import { config } from "../../config"

const log: Logger = config.createLogger("postWorker")

class CommentsWorker {
    async addNewCommentToDb(job: Job, done: DoneCallback): Promise<void> {
        try {
            const { data } = job;
            //console.log("data: " + data.createdReaction)
            await commentService.addCommentToDb(data)
            job.progress(100)
            done(null, data)
        } catch (error) {
            log.error(error)
            done(error as Error)
        }
    }
}

export const commentsWorker: CommentsWorker = new CommentsWorker()