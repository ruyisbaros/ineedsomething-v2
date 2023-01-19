import { emailQueue } from "./../queues/email.queue";
import { notificationTemplate } from "../templates/notification.temp";
import {
  INotificationDocument,
  INotificationTemplate,
} from "./../../../features/interfaces/notifications.interface";
import { IUserDocument } from "./../../../features/interfaces/user.interface";
import { UserCache } from "./../redis/user.cache";
import { IPostDocument } from "./../../../features/interfaces/post.interface";
import {
  ICommentJob,
  ICommentDocument,
  IQueryComment,
  ICommentNameList,
} from "./../../../features/interfaces/comments.interface";
import mongoose from "mongoose";
import { CommentsModel } from "../../../features/models/commentsModel";
import Post from "../../../features/models/postModel";
import User from "../../../features/models/userModel";
import { NotificationModel } from "../../../features/models/notificationModel";
import { socketIONotificationObject } from "../../sockets/notification";

const userCache: UserCache = new UserCache();

class CommentService {
  public async addCommentToDb(commentData: ICommentJob): Promise<void> {
    const { postId, username, userTo, userFrom, comment } = commentData;
    const newComment: ICommentDocument = await CommentsModel.create(comment);
    const post: IPostDocument = (await Post.findOneAndUpdate(
      { _id: postId },
      { $inc: { commentsCount: 1 } },
      { new: true }
    )) as IPostDocument;

    const user: IUserDocument = (await userCache.getUserFromRedisCache(
      userTo
    )) as IUserDocument;

    const notificationTo: IUserDocument = user
      ? user
      : ((await User.findOne({ _id: userTo })) as IUserDocument);

    //Create notification and Send a notification of Comment Added to relevant user
    //Does User wants to receive a notification of Comment Added?
    if (notificationTo.notifications.comments && userFrom !== userTo) {
      const notificationModel: INotificationDocument = new NotificationModel();
      const notifications = await notificationModel.insertNotification({
        userFrom,
        userTo,
        message: `${username} commented on your post`,
        notificationType: "comment",
        entityId: new mongoose.Types.ObjectId(postId),
        createdItemId: new mongoose.Types.ObjectId(newComment._id),
        createdAt: new Date(),
        comment: comment.comment,
        post: post.post,
        imgId: post.imgId!,
        imgVersion: post.imgVersion!,
        gifUrl: post.gifUrl!,
        reaction: "",
      });

      //Send client
      socketIONotificationObject.emit("insert notification", notifications, {
        userTo,
      });
      //Send notification email
      const params: INotificationTemplate = {
        username: notificationTo.username!,
        message: `${username} commented on your post`,
        header: "Comment Notification",
      };

      const template = notificationTemplate.notificationTemplater(params);
      emailQueue.addEmailJob("commentsNotMail", {
        receiverEmail: notificationTo.email!,
        template,
        subject: "Post Notification",
      });
    }
  }

  public async getCommentsOfPostFromDb(
    query: IQueryComment,
    sort: Record<string, 1 | -1>
  ): Promise<ICommentDocument[]> {
    const comments: ICommentDocument[] = await CommentsModel.aggregate([
      { $match: query },
      { $sort: sort },
    ]);
    return comments;
  }
  public async getCommentsNameOfPostFromDb(
    query: IQueryComment,
    sort: Record<string, 1 | -1>
  ): Promise<ICommentNameList[]> {
    const commentsNames: ICommentNameList[] = await CommentsModel.aggregate([
      { $match: query },
      { $sort: sort },
      {
        $group: {
          _id: null,
          names: { $addToSet: "$username" },
          count: { $sum: 1 },
        },
      },
      { $project: { _id: 0 } },
    ]);
    return commentsNames;
  }
}

export const commentService: CommentService = new CommentService();
