import { RedisCommandRawReply } from "@redis/client/dist/lib/commands";
import { INotificationSettings } from "./../../../features/interfaces/user.interface";
import { ISocialLinks } from "./../../../features/interfaces/user.interface";
import { ServerError } from "../../globals/error.handler";
import { IUserDocument } from "../../../features/interfaces/user.interface";
import { BaseCache } from "./base.cache";
import Logger from "bunyan";
import { config } from "./../../../config";
import { parseJson } from "../../globals/parse.redis.cache";
import { randomNumbers } from "../../globals/random.numbers";
import { indexOf, findIndex } from "lodash";

const log: Logger = config.createLogger("userRedisCache");
type valueTypes = string | ISocialLinks | INotificationSettings;
export type UserCacheMultiType = string | number | Buffer | RedisCommandRawReply[] | IUserDocument | IUserDocument[];
//const followersCache: FollowersRedisCache = new FollowersRedisCache();
export class UserCache extends BaseCache {
  constructor() {
    super("userCache");
  }

  public async saveToRedisCache(key: string, UId: string, createdUser: IUserDocument): Promise<void> {
    const createdAt = new Date();
    const {
      _id,
      username,
      email,
      profilePicture,
      avatarColor,
      uId,
      postsCount,
      work,
      school,
      quote,
      location,
      blocked,
      blockedBy,
      followersCount,
      followingCount,
      notifications,
      social,
      bgImageVersion,
      bgImageId,
    } = createdUser;

    const userList: any[] = [
      "_id",
      `${_id}`,
      "username",
      `${username}`,
      "email",
      `${email}`,
      "uId",
      `${uId}`,
      "postsCount",
      `${postsCount}`,
      "avatarColor",
      `${avatarColor}`,
      "createdAt",
      `${createdAt}`,
      "profilePicture",
      `${profilePicture}`,
      "blocked",
      JSON.stringify(blocked),
      "blockedBy",
      JSON.stringify(blockedBy),
      "followersCount",
      `${followersCount}`,
      "followingCount",
      `${followingCount}`,
      "notifications",
      JSON.stringify(notifications),
      "social",
      JSON.stringify(social),
      "work",
      `${work}`,
      "school",
      `${school}`,
      "quote",
      `${quote}`,
      "location",
      `${location}`,
      "bgImageVersion",
      `${bgImageVersion}`,
      "bgImageId",
      `${bgImageId}`,
    ];
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      const multi = this.client.multi();
      multi.ZADD("user", { score: parseInt(UId, 10), value: `${key}` });
      multi.HSET(`users:${key}`, userList);
      multi.exec();
    } catch (error: any) {
      log.error(error);
      throw new ServerError("Could not connect to Redis server!");
    }
  }

  public async getUserFromRedisCache(key: string): Promise<IUserDocument | null> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      //const multi = this.client.multi()
      let response: IUserDocument = (await this.client.HGETALL(`users:${key}`)) as unknown as IUserDocument;
      /* multi.exec() */
      //numbers,lists,objects,dates need to be parsed. Strings no need to be parsed
      response.createdAt = new Date(parseJson(`${response.createdAt}`));
      response.postsCount = parseJson(`${response.postsCount}`);
      response.blocked = parseJson(`${response.blocked}`);
      response.blockedBy = parseJson(`${response.blockedBy}`);
      response.notifications = parseJson(`${response.notifications}`);
      response.social = parseJson(`${response.social}`);
      response.followersCount = parseJson(`${response.followersCount}`);
      response.followingCount = parseJson(`${response.followingCount}`);

      return response;
    } catch (error: any) {
      log.error(error);
      throw new ServerError("Could not connect to Redis server!");
    }
  }

  public async getUsersFromRedisCache(start: number, end: number, excludedUserKey: string): Promise<IUserDocument[]> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      const response: string[] = await this.client.ZRANGE("user", start, end, { REV: true });
      const multi: ReturnType<typeof this.client.multi> = this.client.multi();
      for (const key of response) {
        if (key !== excludedUserKey) {
          multi.HGETALL(`users:${key}`);
        }
      }
      const replies: UserCacheMultiType = (await multi.exec()) as UserCacheMultiType;
      const userReplies: IUserDocument[] = [];

      for (const user of replies as IUserDocument[]) {
        user.createdAt = new Date(parseJson(`${user.createdAt}`));
        user.postsCount = parseJson(`${user.postsCount}`);
        user.blocked = parseJson(`${user.blocked}`);
        user.blockedBy = parseJson(`${user.blockedBy}`);
        user.notifications = parseJson(`${user.notifications}`);
        user.social = parseJson(`${user.social}`);
        user.followersCount = parseJson(`${user.followersCount}`);
        user.followingCount = parseJson(`${user.followingCount}`);

        userReplies.push(user);
      }

      return userReplies;
    } catch (error: any) {
      log.error(error);
      throw new ServerError("Could not connect to Redis server!");
    }
  }

  public async getTotalUsersCountFromRedisCache(): Promise<number> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      const count: number = await this.client.ZCARD("user");
      return count;
    } catch (error) {
      log.error(error);
      throw new ServerError("Could not connect to Redis server!");
    }
  }

  public async getRandomUsersFromRedisCache(userId: string, excludedUsername: string): Promise<IUserDocument[]> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }

      const replies: IUserDocument[] = [];
      const followings: string[] = await this.client.LRANGE(`followings:${userId}`, 0, -1);
      const users: string[] = await this.client.ZRANGE("user", 0, -1);
      const randomUsers: string[] = randomNumbers(users).slice(0, 10);
      for (const user of randomUsers) {
        const followerIndex = indexOf(followings, user);
        if (followerIndex < 0) {
          const cachedFollower: IUserDocument = (await this.client.HGETALL(`users:${user}`)) as unknown as IUserDocument;
          replies.push(cachedFollower);
        }
      }
      //I will be also in replies list. because i am not in my followers list :)
      const myUserNameIndex: number = findIndex(replies, ["username", excludedUsername]);
      replies.splice(myUserNameIndex, 1);

      for (const user of replies) {
        user.createdAt = new Date(parseJson(`${user.createdAt}`));
        user.postsCount = parseJson(`${user.postsCount}`);
        user.blocked = parseJson(`${user.blocked}`);
        user.blockedBy = parseJson(`${user.blockedBy}`);
        user.notifications = parseJson(`${user.notifications}`);
        user.social = parseJson(`${user.social}`);
        user.followersCount = parseJson(`${user.followersCount}`);
        user.followingCount = parseJson(`${user.followingCount}`);
      }

      return replies;
    } catch (error) {
      log.error(error);
      throw new ServerError("Could not connect to Redis server!");
    }
  }

  public async updateRelevantItemOfUserInCache(userId: string, prop: string, value: valueTypes): Promise<IUserDocument | null> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      await this.client.HSET(`users:${userId}`, [`${prop}`, JSON.stringify(value)]);
      const response: IUserDocument = (await this.getUserFromRedisCache(`users:${userId}`)) as IUserDocument;
      return response;
    } catch (error) {}
    return null;
  }
}
