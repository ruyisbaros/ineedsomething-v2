import { blockUnBlockQueue } from "./../../shared/services/queues/blockUnBlock.queue";
import { followerService } from "./../../shared/services/db/follower.services";
import { followerQueue } from "./../../shared/services/queues/follower.queue";
import { socketIOFollowerObject } from "./../../shared/sockets/follower.socket";
import { IFollowerData } from "./../interfaces/follower.interface";
import { IUserDocument } from "./../interfaces/user.interface";
import { UserCache } from "./../../shared/services/redis/user.cache";
import { FollowersRedisCache } from "./../../shared/services/redis/follower.cache";
import HTTP_STATUS from "http-status-codes";
import { Request, Response } from "express";
import { ObjectId } from "mongodb";
import mongoose from "mongoose";

const followersCache: FollowersRedisCache = new FollowersRedisCache();
const userCache: UserCache = new UserCache();

const followerCtrl = {
  follow: async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const followerObjId: ObjectId = new ObjectId();
    //1. Update counts in cache (followings, followers)
    await followersCache.updateUserFollowerCount(id, "followersCount", 1);
    await followersCache.updateUserFollowerCount(
      `${req.currentUser?.userId}`,
      "followingCount",
      1
    );
    //2. Get relevant users from cache
    const cachedFollowingUser: IUserDocument =
      (await userCache.getUserFromRedisCache(id)) as IUserDocument;
    const cachedFollowerUser: IUserDocument =
      (await userCache.getUserFromRedisCache(
        `${req.currentUser?.userId}`
      )) as IUserDocument;
    //3. initialize them for socket (example: user bla bla started to follow you)
    const addFollowingData: IFollowerData = userData(cachedFollowingUser);
    //4. Send above data to client with socket
    socketIOFollowerObject.emit("add follower", addFollowingData);
    //5. Save follower-following to cache
    await followersCache.saveFollowerToCache(
      `followings:${req.currentUser?.userId}`,
      id
    );
    await followersCache.saveFollowerToCache(
      `followers:${id}`,
      `${req.currentUser?.userId}`
    );

    //And save data to MongoDB
    followerQueue.addFollowJob("addFollow", {
      followerId: req.currentUser?.userId!,
      followingId: id!,
      username: req.currentUser?.username,
      followerDocumentId: followerObjId,
    });
    res.status(HTTP_STATUS.CREATED).json({ message: "Following user now!" });
  },
  unFollow: async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    await followersCache.updateUserFollowerCount(id, "followersCount", -1);
    await followersCache.updateUserFollowerCount(
      `${req.currentUser?.userId}`,
      "followingCount",
      -1
    );
    await followersCache.removeFollowerFromCache(
      `followings:${req.currentUser?.userId}`,
      id
    );
    await followersCache.removeFollowerFromCache(
      `followers:${id}`,
      `${req.currentUser?.userId}`
    );

    //And save data to MongoDB
    followerQueue.addFollowJob("removeFollow", {
      followerId: req.currentUser?.userId!,
      followingId: id!,
    });

    res
      .status(HTTP_STATUS.CREATED)
      .json({ message: "Stop following user now!" });
  },
  getFollowings: async (req: Request, res: Response): Promise<void> => {
    const currentUserId: ObjectId = new mongoose.Types.ObjectId(
      req.currentUser?.userId
    );

    const cachedFollowings: IFollowerData[] =
      await followersCache.getFollowersFromRedis(
        `followings:${req.currentUser?.userId}`
      );
    const followings: IFollowerData[] =
      cachedFollowings.length > 0
        ? cachedFollowings
        : await followerService.getFollowings(currentUserId);
    res
      .status(HTTP_STATUS.CREATED)
      .json({ message: "Whom you follow", followings });
  },
  getFollowers: async (req: Request, res: Response): Promise<void> => {
    const userObjId: ObjectId = new mongoose.Types.ObjectId(req.params.userId);

    const cachedFollowers: IFollowerData[] =
      await followersCache.getFollowersFromRedis(
        `followers:${req.params.userId}`
      );

    const followers: IFollowerData[] =
      cachedFollowers.length > 0
        ? cachedFollowers
        : await followerService.getFollowers(userObjId);
    res
      .status(HTTP_STATUS.CREATED)
      .json({ message: "User's followers", followers });
  },
  block: async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    //1. Update users situation in Redis Cache
    await followersCache.updateBlockSituationInRedis(
      `${req.currentUser?.userId}`,
      "blocked",
      id,
      "block"
    );
    await followersCache.updateBlockSituationInRedis(
      id,
      "blockedBy",
      `${req.currentUser?.userId}`,
      "block"
    );
    //2. Update users situation in MongoDB

    blockUnBlockQueue.addBlockJob("blockUser", {
      keyOne: `${req.currentUser?.userId}`,
      keyTwo: id,
      type: "block",
    });

    res.status(HTTP_STATUS.CREATED).json({ message: "User has been blocked!" });
  },
  unBlock: async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    //1. Update users situation in Redis Cache
    await followersCache.updateBlockSituationInRedis(
      `${req.currentUser?.userId}`,
      "blocked",
      id,
      "unBlock"
    );
    await followersCache.updateBlockSituationInRedis(
      id,
      "blockedBy",
      `${req.currentUser?.userId}`,
      "unBlock"
    );
    //2. Update users situation in MongoDB

    blockUnBlockQueue.addBlockJob("unBlockUser", {
      keyOne: `${req.currentUser?.userId}`,
      keyTwo: id,
      type: "unBlock",
    });

    res
      .status(HTTP_STATUS.CREATED)
      .json({ message: "User has been unBlocked!" });
  },
};
/* -----------------------------------HELPER FUNCTIONS------------------------------------------------------------- */
function userData(data: IUserDocument): IFollowerData {
  return {
    _id: new mongoose.Types.ObjectId(data._id),
    username: data.username!,
    avatarColor: data.avatarColor!,
    postsCount: data.postsCount,
    followersCount: data.followersCount,
    followingCount: data.followingCount,
    profilePicture: data.profilePicture,
    uId: data.uId!,
    userProfile: data,
  };
}
export default followerCtrl;
