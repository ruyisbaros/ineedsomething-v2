import {
  INotificationDocument,
  INotificationTemplate,
} from "./../../../features/interfaces/notifications.interface";
import { IPostDocument } from "../../../features/interfaces/post.interface";
import { IUserDocument } from "../../../features/interfaces/user.interface";
import mongoose from "mongoose";
import { UserCache } from "../redis/user.cache";
import {
  IReactionDocument,
  IReactionJob,
  IQueryReaction,
} from "./../../../features/interfaces/reaction.interface";
import { ReactionModel } from "../../../features/models/reactionModel";
import Post from "../../../features/models/postModel";
import { omit } from "lodash";
import { NotificationModel } from "../../../features/models/notificationModel";
import { socketIONotificationObject } from "../../../shared/sockets/notification";
import { notificationTemplate } from "../templates/notification.temp";
import { emailQueue } from "../queues/email.queue";

const userCache: UserCache = new UserCache();
class ReactionService {
  public async addReactionToDb(reactionData: IReactionJob): Promise<void> {
    const {
      postId,
      userTo,
      userFrom,
      username,
      type,
      previousReaction,
      reactionObject,
    } = reactionData;
    let updatedReactionObject: IReactionDocument =
      reactionObject as IReactionDocument;
    if (previousReaction) {
      updatedReactionObject = omit(reactionObject, ["_id"]);
    }
    const updatedReaction: [IUserDocument, IReactionDocument, IPostDocument] =
      (await Promise.all([
        userCache.getUserFromRedisCache(`${userTo}`),
        ReactionModel.replaceOne(
          { postId, type: previousReaction, username },
          updatedReactionObject,
          { upsert: true }
        ),
        Post.findOneAndUpdate(
          { _id: postId },
          {
            $inc: {
              [`reactions.${previousReaction}`]: -1,
              [`reactions.${type}`]: 1,
            },
          },
          { new: true }
        ),
      ])) as unknown as [IUserDocument, IReactionDocument, IPostDocument];

    //Send Reaction Notifications
    //Create notification and Send a notification of start Following to relevant user
    //Does User wants to receive a notification of follow started?
    if (updatedReaction[0].notifications.reactions && userFrom !== userTo) {
      const notificationModel: INotificationDocument = new NotificationModel();
      const notifications = await notificationModel.insertNotification({
        userFrom: userFrom as string,
        userTo: userTo as string,
        message: `${username} reacted your post`,
        notificationType: "reactions",
        entityId: new mongoose.Types.ObjectId(postId),
        createdItemId: new mongoose.Types.ObjectId(updatedReaction[1]._id),
        createdAt: new Date(),
        comment: "",
        post: updatedReaction[2].post,
        imgId: updatedReaction[2].imgId!,
        imgVersion: updatedReaction[2].imgVersion!,
        gifUrl: updatedReaction[2].gifUrl!,
        reaction: type as string,
      });

      //Send client
      socketIONotificationObject.emit("insert notification", notifications, {
        userTo,
      });
      //Send notification email
      const params: INotificationTemplate = {
        username: updatedReaction[0].username!,
        message: `${username} reacted your post`,
        header: "Reaction Notification",
      };

      const template = notificationTemplate.notificationTemplater(params);
      emailQueue.addEmailJob("reactionsNotMail", {
        receiverEmail: updatedReaction[0].email!,
        template,
        subject: "Reaction Notification",
      });
    }
  }

  public async removeReactionFromDb(reactionData: IReactionJob): Promise<void> {
    const { postId, previousReaction, username } = reactionData;
    await Promise.all([
      ReactionModel.deleteOne({ postId, type: previousReaction, username }),
      Post.findOneAndUpdate(
        { _id: postId },
        {
          $inc: {
            [`reactions.${previousReaction}`]: -1,
          },
        }
      ),
    ]);
  }

  public async getPostsReactionFromDb(
    query: IQueryReaction,
    sort: Record<string, 1 | -1>
  ): Promise<[IReactionDocument[], number]> {
    const reactions: IReactionDocument[] = await ReactionModel.aggregate([
      { $match: query },
      { $sort: sort },
    ]);

    return [reactions, reactions.length];
  }
  public async getSinglePostReactionByUsernameFromDb(
    postId: string,
    username: string
  ): Promise<[IReactionDocument, number] | []> {
    const reactions: IReactionDocument[] = await ReactionModel.aggregate([
      { $match: { postId: new mongoose.Types.ObjectId(postId), username } },
    ]);

    return reactions.length > 0 ? [reactions[0], 1] : [];
  }

  public async getReactionsByUsernameFromDb(
    username: string
  ): Promise<IReactionDocument[]> {
    const reactions: IReactionDocument[] = await ReactionModel.aggregate([
      { $match: { username } },
    ]);

    return reactions;
  }
}

export const reactionService: ReactionService = new ReactionService();
