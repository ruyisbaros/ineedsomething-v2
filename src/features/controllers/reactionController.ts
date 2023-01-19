import { reactionService } from "./../../shared/services/db/reaction.services";
import { reactionQueue } from "./../../shared/services/queues/reaction.queue";
import { ReactionRedisCache } from "./../../shared/services/redis/reaction.cache";
import {
  IReactionDocument,
  IReactionJob,
  IReactions,
} from "./../interfaces/reaction.interface";
import HTTP_STATUS from "http-status-codes";
import { ObjectId } from "mongodb";
import { Request, Response } from "express";
import { parseJson } from "../../shared/globals/parse.redis.cache";
import mongoose from "mongoose";

const reactionCache: ReactionRedisCache = new ReactionRedisCache();

const reactionCtrl = {
  create: async (req: Request, res: Response): Promise<void> => {
    const {
      userTo,
      postId,
      type,
      previousReaction,
      postReactions,
      profilePicture,
    } = req.body;
    const reactionObjId: ObjectId = new ObjectId();
    const reactionObject: IReactionDocument = {
      _id: reactionObjId,
      postId,
      type,
      avatarColor: req.currentUser!.avatarColor,
      profilePicture,
      username: req.currentUser!.username,
    } as IReactionDocument;

    //Save to Redis Cache
    await reactionCache.savePostReactionToCache(
      postId,
      reactionObject,
      postReactions,
      type,
      previousReaction
    );
    //Add to Queue for DB updates
    const dbData: IReactionJob = {
      postId,
      userTo,
      userFrom: req.currentUser!.userId,
      username: req.currentUser!.username,
      type,
      previousReaction,
      reactionObject,
    } as IReactionJob;
    //console.log("db data", dbData)
    reactionQueue.addReactionJob("addReaction", dbData);
    res
      .status(HTTP_STATUS.CREATED)
      .json({ message: "Reaction added successfully" });
  },
  getPostReactions: async (req: Request, res: Response): Promise<void> => {
    const { postId } = req.params;
    //First check redis cache
    const redisCache: [IReactionDocument[], number] =
      await reactionCache.getSinglePostReactionsFromRedis(postId);
    const postReactions: [IReactionDocument[], number] = redisCache[0].length
      ? redisCache
      : await reactionService.getPostsReactionFromDb(
          { postId: new mongoose.Types.ObjectId(postId) },
          { createdAt: -1 }
        );
    res
      .status(HTTP_STATUS.CREATED)
      .json({
        message: "Reactions",
        reactions: postReactions[0],
        count: postReactions[1],
      });
  },
  getSingleReactionByUser: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { username, postId } = req.params;
    //First check redis cache
    const redisCache: [IReactionDocument, number] | [] =
      await reactionCache.getSinglePostReactionByUserFromRedis(
        postId,
        username
      );
    const postReactions: [IReactionDocument, number] | [] = redisCache.length
      ? redisCache
      : await reactionService.getSinglePostReactionByUsernameFromDb(
          postId,
          username
        );
    res
      .status(HTTP_STATUS.CREATED)
      .json({
        message: "Single Post Reaction By username Reactions",
        reactions: postReactions[0],
        count: postReactions[1],
      });
  },
  getUsersPostReactions: async (req: Request, res: Response): Promise<void> => {
    const { username } = req.params;
    //This has no cache. So let's ask DB directly
    const reactions: IReactionDocument[] =
      await reactionService.getReactionsByUsernameFromDb(username);
    res
      .status(HTTP_STATUS.CREATED)
      .json({ message: "User's reactions", reactions });
  },

  delete: async (req: Request, res: Response): Promise<void> => {
    const { postId, previousReaction, postReactions } = req.params;
    //remove from cache so update cache
    await reactionCache.removePostReactionFromCache(
      postId,
      `${req.currentUser!.username}`,
      parseJson(postReactions)
    );
    const dbData: IReactionJob = {
      postId,
      username: req.currentUser!.username,
      previousReaction,
    } as IReactionJob;
    reactionQueue.addReactionJob("removeReaction", dbData);
    res
      .status(HTTP_STATUS.CREATED)
      .json({ message: "Reaction removed successfully" });
  },
};

export default reactionCtrl;
