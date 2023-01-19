import { ICommentDocument, ICommentNameList } from './../../../features/interfaces/comments.interface';
import Logger from "bunyan"
import { config } from './../../../config';
import { ServerError } from '../../globals/error.handler';
import { parseJson } from '../../globals/parse.redis.cache';
import { find } from 'lodash';
import { BaseCache } from "./base.cache";

const log: Logger = config.createLogger("commentsRedisCache")

export class CommentsCache extends BaseCache {
    constructor() {
        super("commentsRedisCache")
    }
    public async savePostCommentToRedisCache(postId: string, value: string): Promise<void> {
        try {
            if (!this.client.isOpen) { await this.client.connect(); }
            await this.client.LPUSH(`comments:${postId}`, value)
            //let's update relevant posts commentsCount in Redis
            const commentsCount: string[] = await this.client.HMGET(`posts:${postId}`, "commentsCount");
            let count: number = parseInt(commentsCount[0], 10) as number;
            count += 1;
            await this.client.HSET(`posts:${postId}`, ["commentsCount", `${count}`])
        } catch (error) {
            log.error(error)
            throw new ServerError("Could not connect to Redis server!")
        }
    }
    public async getPostCommentsFromRedisCache(postId: string): Promise<ICommentDocument[]> {
        try {
            if (!this.client.isOpen) { await this.client.connect(); }
            const reply: string[] = await this.client.LRANGE(`comments:${postId}`, 0, -1);
            const list: ICommentDocument[] = []
            for (const comment of reply) {
                list.push(parseJson(comment))
            }
            return list
        } catch (error) {
            log.error(error)
            throw new ServerError("Could not connect to Redis server!")
        }
    }

    public async getCommentNamesFromRedisCache(postId: string): Promise<ICommentNameList[]> {
        try {
            if (!this.client.isOpen) { await this.client.connect(); }
            const count: number = await this.client.LLEN(`comments:${postId}`);
            const comments: string[] = await this.client.LRANGE(`comments:${postId}`, 0, -1);
            const names: string[] = []
            for (const item of comments) {
                const comment: ICommentDocument = parseJson(item);
                names.push(comment.username)
            }
            const response: ICommentNameList = {
                count,
                names
            }
            return [response]
        } catch (error) {
            log.error(error)
            throw new ServerError("Could not connect to Redis server!")
        }
    }

    public async getSingleCommentFromRedisCache(postId: string, commentId: string): Promise<ICommentDocument[]> {
        try {
            if (!this.client.isOpen) { await this.client.connect(); }
            const comments: string[] = await this.client.LRANGE(`comments:${postId}`, 0, -1);
            const list: ICommentDocument[] = []
            for (const item of comments) {
                list.push(parseJson(item))
            }
            const result: ICommentDocument = find(list, (item: ICommentDocument) => item._id === commentId) as ICommentDocument
            return [result]
        } catch (error) {
            log.error(error)
            throw new ServerError("Could not connect to Redis server!")
        }
    }
}