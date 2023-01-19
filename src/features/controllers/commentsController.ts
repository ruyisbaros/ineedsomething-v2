import { commentService } from "./../../shared/services/db/comment.services";
import { commentsQueue } from "./../../shared/services/queues/comments.queue";
import {
    ICommentDocument,
    ICommentJob,
    ICommentNameList
} from "./../interfaces/comments.interface";
import { CommentsCache } from "./../../shared/services/redis/comments.cache";
import HTTP_STATUS from "http-status-codes";
import { Request, Response } from "express";
import { ObjectId } from "mongodb";
import mongoose from "mongoose";

const commentsCache: CommentsCache = new CommentsCache();
const commentsCtrl = {
    create: async (req: Request, res: Response): Promise<void> => {
        const { userTo, postId, profilePicture, comment } = req.body;
        const commentObjId: ObjectId = new ObjectId();
        const commentData: ICommentDocument = {
            _id: commentObjId,
            username: `${req.currentUser!.username}`,
            avatarColor: `${req.currentUser!.avatarColor}`,
            postId,
            profilePicture,
            comment,
            createdAt: new Date(),
        } as ICommentDocument;
        //Save Redis cache
        await commentsCache.savePostCommentToRedisCache(
            postId,
            JSON.stringify(commentData)
        );
        const dbData: ICommentJob = {
            postId,
            userTo,
            userFrom: `${req.currentUser!.userId}`,
            username: `${req.currentUser!.username}`,
            comment: commentData,
        } as ICommentJob;
        //Add DB queues
        commentsQueue.addCommentJob("addComment", dbData);

        res
            .status(HTTP_STATUS.CREATED)
            .json({ message: "Comment created successfully" });
    },
    getCommentsOfPost: async (req: Request, res: Response): Promise<void> => {
        const { postId } = req.params;
        //first ask from Redis Cache
        const cachedComments: ICommentDocument[] =
            await commentsCache.getPostCommentsFromRedisCache(postId);
        const comments: ICommentDocument[] =
            cachedComments.length > 0
                ? cachedComments
                : await commentService.getCommentsOfPostFromDb(
                    { postId: new mongoose.Types.ObjectId(postId) },
                    { createdAt: -1 }
                );
        res
            .status(HTTP_STATUS.CREATED)
            .json({ message: "Post Comments", comments });
    },

    getCommentNames: async (req: Request, res: Response): Promise<void> => {
        const { postId } = req.params;
        //first ask from Redis Cache
        const cachedCommentNames: ICommentNameList[] =
            await commentsCache.getCommentNamesFromRedisCache(postId);
        const commentNames: ICommentNameList[] =
            cachedCommentNames.length > 0
                ? cachedCommentNames
                : await commentService.getCommentsNameOfPostFromDb(
                    { postId: new mongoose.Types.ObjectId(postId) },
                    { createdAt: -1 }
                );
        res
            .status(HTTP_STATUS.CREATED)
            .json({ message: "Post Comment Names", commentNames });
    },

    getSingleComment: async (req: Request, res: Response): Promise<void> => {
        const { postId, commentId } = req.params;
        //first ask from Redis Cache
        const cachedComment: ICommentDocument[] =
            await commentsCache.getSingleCommentFromRedisCache(postId, commentId);
        const comment: ICommentDocument[] =
            cachedComment.length > 0
                ? cachedComment
                : await commentService.getCommentsOfPostFromDb(
                    { _id: new mongoose.Types.ObjectId(commentId) },
                    { createdAt: -1 }
                );
        res
            .status(HTTP_STATUS.CREATED)
            .json({ message: "Post single Comment ", comment: comment[0] });
    },
};

export default commentsCtrl;
