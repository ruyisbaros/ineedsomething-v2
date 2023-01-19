import { reactionService } from './../services/db/reaction.services';
import { DoneCallback, Job } from "bull"
import Logger from "bunyan"
import { config } from "../../config"

const log: Logger = config.createLogger("postWorker")

class ReactionWorker {
    async addNewReactionToDb(job: Job, done: DoneCallback): Promise<void> {
        try {
            const { data } = job;
            //console.log("data: " + data.createdReaction)
            await reactionService.addReactionToDb(data)
            job.progress(100)
            done(null, data)
        } catch (error) {
            log.error(error)
            done(error as Error)
        }
    }
    async removeReactionFromDB(job: Job, done: DoneCallback): Promise<void> {
        try {
            const { data } = job;
            await reactionService.removeReactionFromDb(data)
            job.progress(100)
            done(null, data)
        } catch (error) {
            log.error(error)
            done(error as Error)
        }
    }
}


export const reactionWorker: ReactionWorker = new ReactionWorker()