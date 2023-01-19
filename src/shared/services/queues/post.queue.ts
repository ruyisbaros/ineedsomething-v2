import { postWorker } from './../../workers/post.worker';
import { IPostJobData } from './../../../features/interfaces/post.interface';
import { BaseQueue } from "./base.queue";

class PostQueue extends BaseQueue {
    constructor() {
        super("post");
        this.processJob("addNewPost", 5, postWorker.addPostToDb)
        this.processJob("removePost", 5, postWorker.removePostFromDb)
        this.processJob("updatePost", 5, postWorker.updatePostInDb)

    }

    public addPostJob(name: string, data: IPostJobData): void {
        this.addJob(name, data);
    }

}

export const postQueue: PostQueue = new PostQueue();