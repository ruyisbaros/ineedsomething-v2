import { IUserDocument } from "./../../../features/interfaces/user.interface";
import { UserCache } from "./user.cache";
import { IFollowerData } from "./../../../features/interfaces/follower.interface";
import Logger from "bunyan";
import { config } from "./../../../config";
import { ServerError } from "../../globals/error.handler";
import { parseJson } from "../../globals/parse.redis.cache";
import { remove } from "lodash";
import { BaseCache } from "./base.cache";
import mongoose from "mongoose";

const log: Logger = config.createLogger("followersRedisCache");
const userCache: UserCache = new UserCache();
export class FollowersRedisCache extends BaseCache {
  constructor() {
    super("followersRedisCache");
  }
  public async saveFollowerToCache(key: string, value: string): Promise<void> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      await this.client.LPUSH(key, value);
    } catch (error) {
      log.error(error);
      throw new ServerError("Could not connect to Redis server!");
    }
  }

  public async removeFollowerFromCache(key: string, value: string): Promise<void> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      await this.client.LREM(key, 1, value);
    } catch (error) {
      log.error(error);
      throw new ServerError("Could not connect to Redis server!");
    }
  }

  public async updateUserFollowerCount(userId: string, prop: string, value: number): Promise<void> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      await this.client.HINCRBY(`users:${userId}`, prop, value);
    } catch (error) {
      log.error(error);
      throw new ServerError("Could not connect to Redis server!");
    }
  }

  public async getFollowersFromRedis(key: string): Promise<IFollowerData[]> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      const response: string[] = await this.client.LRANGE(key, 0, -1); //This returns only ID
      const list: IFollowerData[] = [];
      for (const item of response) {
        const user: IUserDocument = (await userCache.getUserFromRedisCache(item)) as IUserDocument;
        const data: IFollowerData = {
          _id: new mongoose.Types.ObjectId(user._id),
          avatarColor: user.avatarColor!,
          followersCount: user.followersCount,
          followingCount: user.followingCount,
          profilePicture: user.profilePicture!,
          postsCount: user.postsCount,
          username: user.username!,
          uId: user.uId!,
          userProfile: user,
        };
        list.push(data);
      }
      return list;
    } catch (error) {
      log.error(error);
      throw new ServerError("Could not connect to Redis server!");
    }
  }

  public async updateBlockSituationInRedis(userId: string, prop: string, targetUserId: string, type: "block" | "unBlock"): Promise<void> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      const response: string = (await this.client.HGET(`users:${userId}`, prop)) as string;
      const multi: ReturnType<typeof this.client.multi> = this.client.multi();
      let blocked: string[] = parseJson(response) as string[];
      if (type === "block") {
        blocked = [...blocked, targetUserId];
      } else {
        remove(blocked, (id: string) => id === targetUserId);
        blocked = [...blocked];
      }
      multi.HSET(`users:${userId}`, [`${prop}`, JSON.stringify(blocked)]);
      await multi.exec();
    } catch (error) {
      log.error(error);
      throw new ServerError("Could not connect to Redis server!");
    }
  }
}
