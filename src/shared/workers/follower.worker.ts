import { followerService } from './../services/db/follower.services';
import { DoneCallback, Job } from "bull"
import Logger from "bunyan"
import { config } from "../../config"

const log: Logger = config.createLogger("followerWorker")

class FollowerWorker {
    async addFollowerToDb(job: Job, done: DoneCallback): Promise<void> {
        try {
            const { followerId, followingId, username, followerDocumentId } = job.data;
            //console.log("data: " + data.createdReaction)
            await followerService.addFollowerToDb(followerId, followingId, username, followerDocumentId)
            job.progress(100)
            done(null, job.data)
        } catch (error) {
            log.error(error)
            done(error as Error)
        }
    }
    async removeFollowerFromDb(job: Job, done: DoneCallback): Promise<void> {
        try {
            const { followerId, followingId } = job.data;
            //console.log("data: " + data.createdReaction)
            await followerService.removeFollowerFromDb(followerId, followingId)
            job.progress(100)
            done(null, job.data)
        } catch (error) {
            log.error(error)
            done(error as Error)
        }
    }
}

export const followerWorker: FollowerWorker = new FollowerWorker()