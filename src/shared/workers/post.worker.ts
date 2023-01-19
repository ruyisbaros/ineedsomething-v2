import { postServices } from './../services/db/post.services';
import Post from "../../features/models/postModel"
import User from "../../features/models/userModel"
import { DoneCallback, Job } from "bull"
import Logger from "bunyan"
import { config } from "../../config"

const log: Logger = config.createLogger("postWorker")

class PostWorker {
    async addPostToDb(job: Job, done: DoneCallback): Promise<void> {
        try {
            const { key, value } = job.data;
            //method for adding DB entry
            await Post.create(value)
            //And increase relevant users postsCount
            await User.updateOne({ _id: key }, { $inc: { postsCount: 1 } })
            job.progress(100)
            done(null, job.data)
        } catch (error) {
            log.error(error)
            done(error as Error)
        }
    }
    async removePostFromDb(job: Job, done: DoneCallback): Promise<void> {
        try {
            const { keyOne, keyTwo } = job.data;
            await postServices.deletePost(keyOne, keyTwo)
            job.progress(100)
            done(null, job.data)
        } catch (error) {
            log.error(error)
            done(error as Error)
        }
    }

    async updatePostInDb(job: Job, done: DoneCallback): Promise<void> {
        try {
            const { key, value } = job.data;
            await postServices.updatePost(key, value)
            job.progress(100)
            done(null, job.data)
        } catch (error) {
            log.error(error)
            done(error as Error)
        }
    }
}

export const postWorker: PostWorker = new PostWorker()