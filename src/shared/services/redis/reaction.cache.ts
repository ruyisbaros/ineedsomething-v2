import { IReactions, IReactionDocument } from './../../../features/interfaces/reaction.interface';
import { BaseCache } from "./base.cache";
import Logger from "bunyan"
import { config } from './../../../config';
import { ServerError } from '../../globals/error.handler';
import { parseJson } from '../../globals/parse.redis.cache';
import { find } from 'lodash';


const log: Logger = config.createLogger("reactionRedisCache")

export class ReactionRedisCache extends BaseCache {
    constructor() {
        super("reactionRedisCache")
    }

    public async savePostReactionToCache(key: string, reaction: IReactionDocument,
        postReactions: IReactions, type: string, previousReaction: string): Promise<void> {
        try {
            if (!this.client.isOpen) { await this.client.connect(); }
            //If reaction already exists then remove else create.
            if (previousReaction) {
                this.removePostReactionFromCache(key, reaction.username, postReactions)
            }
            if (type) {
                await this.client.LPUSH(`reactions:${key}`, JSON.stringify(reaction))
                const dataToSave: string[] = ["reactions", JSON.stringify(postReactions)]
                await this.client.HSET(`posts:${key}`, dataToSave)
            }
        } catch (error) {
            log.error(error)
            throw new ServerError("Could not connect to Redis server!")
        }
    }
    public async removePostReactionFromCache(key: string, username: string,
        postReactions: IReactions): Promise<void> {
        try {
            console.log(postReactions)
            const response: string[] = await this.client.LRANGE(`reactions:${key}`, 0, -1)
            const multi: ReturnType<typeof this.client.multi> = this.client.multi();
            const userPreviousReaction: IReactionDocument = this.getPreviousReaction(response, username) as IReactionDocument
            multi.LREM(`reactions:${key}`, 1, JSON.stringify(userPreviousReaction))
            await multi.exec()
            const dataToSave: string[] = ["reactions", JSON.stringify(postReactions)]
            await this.client.HSET(`posts:${key}`, dataToSave)
        } catch (error) {
            log.error(error)
            throw new ServerError("Could not connect to Redis server!")
        }
    }

    public async getSinglePostReactionsFromRedis(postId: string): Promise<[IReactionDocument[], number]> {

        try {
            if (!this.client.isOpen) { await this.client.connect(); }
            const reactionsCount: number = await this.client.LLEN(`reactions:${postId}`)
            const response: string[] = await this.client.LRANGE(`reactions:${postId}`, 0, -1)
            const returnedList: IReactionDocument[] = []
            for (const item of response) {
                returnedList.push(parseJson(item))
            }
            return response.length > 0 ? [returnedList, reactionsCount] : [[], 0]
        } catch (error) {
            log.error(error)
            throw new ServerError("Could not connect to Redis server!")
        }
    }

    public async getSinglePostReactionByUserFromRedis(postId: string, username: string): Promise<[IReactionDocument, number] | []> {

        try {
            if (!this.client.isOpen) { await this.client.connect(); }
            const response: string[] = await this.client.LRANGE(`reactions:${postId}`, 0, -1)
            const returnedList: IReactionDocument[] = []
            for (const item of response) {
                returnedList.push(parseJson(item))
            }
            const result: IReactionDocument = find(returnedList, (item: IReactionDocument) => item?.username === username && item?.postId === postId) as IReactionDocument
            return result ? [result, 1] : []
        } catch (error) {
            log.error(error)
            throw new ServerError("Could not connect to Redis server!")
        }
    }

    private getPreviousReaction(response: string[], username: string): IReactionDocument | undefined {
        const list: IReactionDocument[] = []
        for (const item of response) {
            list.push(parseJson(item) as IReactionDocument)
        }
        return find(list, (item: IReactionDocument) => {
            return item.username === username
        })
    }
}