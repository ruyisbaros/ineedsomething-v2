import { IPostDocument, ISavePostToCache } from "./../../../features/interfaces/post.interface";
import { IReactions } from "./../../../features/interfaces/reaction.interface";
import { BaseCache } from "./base.cache";
import Logger from "bunyan";
import { config } from "./../../../config";
import { ServerError } from "../../globals/error.handler";
import { parseJson } from "../../globals/parse.redis.cache";
import { RedisCommandRawReply } from "@redis/client/dist/lib/commands";

const log: Logger = config.createLogger("postRedisCache");

export type PostCacheMultiType = string | number | Buffer | RedisCommandRawReply[] | IPostDocument | IPostDocument[];

export class PostCache extends BaseCache {
  constructor() {
    super("postRedisCache");
  }
  public async savePostToRedisCache(data: ISavePostToCache): Promise<void> {
    const { key, currentUserId, uId, createdPost } = data;
    const {
      _id,
      userId,
      username,
      email,
      avatarColor,
      profilePicture,
      post,
      bgColor,
      commentsCount,
      imgVersion,
      imgId,
      videoId,
      videoVersion,
      feelings,
      gifUrl,
      privacy,
      reactions,
      createdAt,
    } = createdPost;
    //Blocked, blockedBy??
    const posts: any[] = [
      `_id`,
      `${_id}`,
      `userId`,
      `${userId}`,
      `username`,
      `${username}`,
      `email`,
      `${email}`,
      `avatarColor`,
      `${avatarColor}`,
      `profilePicture`,
      `${profilePicture}`,
      `post`,
      `${post}`,
      `bgColor`,
      `${bgColor}`,
      `commentsCount`,
      `${commentsCount}`,
      `imgVersion`,
      `${imgVersion}`,
      `imgId`,
      `${imgId}`,
      `videoId`,
      `${videoId}`,
      `videoVersion`,
      `${videoVersion}`,
      `feelings`,
      `${feelings}`,
      `gifUrl`,
      `${gifUrl}`,
      `privacy`,
      `${privacy}`,
      `reactions`,
      JSON.stringify(reactions),
      `createdAt`,
      `${createdAt}`,
    ];

    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      //Update user post count
      let postCount: string[] = await this.client.HMGET(`users:${currentUserId}`, "postsCount");
      //console.log(postCount);
      const multi: ReturnType<typeof this.client.multi> = this.client.multi();
      multi.ZADD("post", { score: parseInt(uId, 10), value: `${key}` });
      multi.HSET(`posts:${key}`, posts);
      const count: number = parseInt(postCount[0], 10) + 1;
      multi.HSET(`users:${currentUserId}`, ["postsCount", count]);
      await multi.exec();
      //await this.client.setEx(`posts:${key}`, 1440, JSON.stringify(posts))
    } catch (error: any) {
      log.error(error);
      throw new ServerError("Could not connect to Redis server!");
    }
  }

  public async getPostsFromRedisCache(key: string, start: number, end: number): Promise<IPostDocument[]> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      const response: string[] = await this.client.ZRANGE(key, start, end, { REV: true });
      const multi: ReturnType<typeof this.client.multi> = this.client.multi();
      for (const value of response) {
        multi.HGETALL(`posts:${value}`);
      }

      const replies: PostCacheMultiType = (await multi.exec()) as PostCacheMultiType;
      const postReplies: IPostDocument[] = [];
      for (const post of replies as IPostDocument[]) {
        post.commentsCount = parseJson(`${post.commentsCount}`) as number;
        post.createdAt = new Date(parseJson(`${post.createdAt}`)) as Date;
        post.reactions = parseJson(`${post.reactions}`) as IReactions;
        postReplies.push(post);
      }
      return postReplies;
    } catch (error) {
      log.error(error);
      throw new ServerError("Could not connect to Redis server!");
    }
  }

  public async getTotalPostsCountFromRedisCache(): Promise<number> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      const count: number = await this.client.ZCARD("post");
      return count;
    } catch (error) {
      log.error(error);
      throw new ServerError("Could not connect to Redis server!");
    }
  }

  public async getPostsWithImageFromRedisCache(key: string, start: number, end: number): Promise<IPostDocument[]> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      const response: string[] = await this.client.ZRANGE(key, start, end, { REV: true });
      const multi: ReturnType<typeof this.client.multi> = this.client.multi();
      for (const value of response) {
        multi.HGETALL(`posts:${value}`);
      }

      const replies: PostCacheMultiType = (await multi.exec()) as PostCacheMultiType;
      const postsWithImage: IPostDocument[] = [];
      for (const post of replies as IPostDocument[]) {
        if ((post.imgId && post.imgVersion) || post.gifUrl) {
          post.commentsCount = parseJson(`${post.commentsCount}`) as number;
          post.createdAt = new Date(parseJson(`${post.createdAt}`)) as Date;
          post.reactions = parseJson(`${post.reactions}`) as IReactions;
          postsWithImage.push(post);
        }
      }
      return postsWithImage;
    } catch (error) {
      log.error(error);
      throw new ServerError("Could not connect to Redis server!");
    }
  }

  public async getPostsWithVideoFromRedisCache(key: string, start: number, end: number): Promise<IPostDocument[]> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      const response: string[] = await this.client.ZRANGE(key, start, end, { REV: true });
      const multi: ReturnType<typeof this.client.multi> = this.client.multi();
      for (const value of response) {
        multi.HGETALL(`posts:${value}`);
      }

      const replies: PostCacheMultiType = (await multi.exec()) as PostCacheMultiType;
      const postsWithVideo: IPostDocument[] = [];
      for (const post of replies as IPostDocument[]) {
        if (post.videoId && post.videoVersion) {
          post.commentsCount = parseJson(`${post.commentsCount}`) as number;
          post.createdAt = new Date(parseJson(`${post.createdAt}`)) as Date;
          post.reactions = parseJson(`${post.reactions}`) as IReactions;
          postsWithVideo.push(post);
        }
      }
      return postsWithVideo;
    } catch (error) {
      log.error(error);
      throw new ServerError("Could not connect to Redis server!");
    }
  }

  public async getPostsByUserFromRedisCache(key: string, uId: number): Promise<IPostDocument[]> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      const response: string[] = await this.client.ZRANGE(key, uId, uId, { REV: true, BY: "SCORE" });
      const multi: ReturnType<typeof this.client.multi> = this.client.multi();
      for (const value of response) {
        multi.HGETALL(`posts:${value}`);
      }

      const replies: PostCacheMultiType = (await multi.exec()) as PostCacheMultiType;
      const postReplies: IPostDocument[] = [];
      for (const post of replies as IPostDocument[]) {
        post.commentsCount = parseJson(`${post.commentsCount}`) as number;
        post.createdAt = new Date(parseJson(`${post.createdAt}`)) as Date;
        post.reactions = parseJson(`${post.reactions}`) as IReactions;
        postReplies.push(post);
      }
      return postReplies;
    } catch (error) {
      console.log(error);
      throw new ServerError("Could not connect to Redis server!");
    }
  }

  public async getTotalPostsCountByUserFromRedisCache(uId: number): Promise<number> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      const count: number = await this.client.ZCOUNT("post", uId, uId);
      return count;
    } catch (error) {
      log.error(error);
      throw new ServerError("Could not connect to Redis server!");
    }
  }

  public async deletePostFromRedisCache(key: string, currentUserId: string): Promise<void> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      const postCount: string[] = await this.client.HMGET(`users:${currentUserId}`, "postsCount");
      const multi: ReturnType<typeof this.client.multi> = this.client.multi();
      multi.ZREM("post", `${key}`);
      multi.DEL(`posts:${key}`);
      multi.DEL(`comments:${key}`);
      multi.DEL(`reactions:${key}`);
      const count: number = parseInt(postCount[0], 10) - 1;
      multi.HSET(`users:${currentUserId}`, ["postsCount", count]);
      await multi.exec();
    } catch (error) {
      log.error(error);
      throw new ServerError("Could not connect to Redis server!");
    }
  }

  public async updatePostFromRedisCache(key: string, updatedPost: IPostDocument): Promise<IPostDocument> {
    const { post, feelings, bgColor, privacy, gifUrl, imgId, imgVersion, profilePicture, videoId, videoVersion } = updatedPost;
    const posts: string[] = [
      `post`,
      `${post}`,
      `bgColor`,
      `${bgColor}`,
      `imgVersion`,
      `${imgVersion}`,
      `imgId`,
      `${imgId}`,
      `videoId`,
      `${videoId}`,
      `videoVersion`,
      `${videoVersion}`,
      `feelings`,
      `${feelings}`,
      `gifUrl`,
      `${gifUrl}`,
      `privacy`,
      `${privacy}`,
      `profilePicture`,
      `${profilePicture}`,
    ];
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      await this.client.HSET(`posts:${key}`, posts);
      const multi: ReturnType<typeof this.client.multi> = this.client.multi();
      multi.HGETALL(`posts:${key}`);
      const post: PostCacheMultiType = (await multi.exec()) as PostCacheMultiType;
      const postReply = post as IPostDocument[];
      postReply[0].commentsCount = parseJson(`${postReply[0].commentsCount}`) as number;
      postReply[0].createdAt = new Date(parseJson(`${postReply[0].createdAt}`)) as Date;
      postReply[0].reactions = parseJson(`${postReply[0].reactions}`) as IReactions;
      return postReply[0];
    } catch (error) {
      console.log(error);
      throw new ServerError("Could not connect to Redis server!");
    }
  }
}
