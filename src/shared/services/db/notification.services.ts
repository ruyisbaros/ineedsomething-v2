import {
  INotification,
  INotificationDocument,
} from "./../../../features/interfaces/notifications.interface";
import mongoose from "mongoose";
import { NotificationModel } from "../../../features/models/notificationModel";

class NotificationServices {
  public async getNotifications(
    userId: string
  ): Promise<INotificationDocument[]> {
    const notifications: INotificationDocument[] =
      await NotificationModel.aggregate([
        { $match: { userTo: new mongoose.Types.ObjectId(userId) } },
        {
          $lookup: {
            from: "User",
            localField: "userFrom",
            foreignField: "_id",
            as: "userFrom",
          },
        },
        { $unwind: "$userFrom" },
        {
          $lookup: {
            from: "Auth",
            localField: "userFrom.authId",
            foreignField: "_id",
            as: "authId",
          },
        },
        { $unwind: "$authId" },
        {
          $project: {
            _id: 1,
            userTo: 1,
            message: 1,
            notificationType: 1,
            entityId: 1,
            createdItemId: 1,
            createdAt: 1,
            comment: 1,
            reaction: 1,
            read: 1,
            post: 1,
            imgId: 1,
            imgVersion: 1,
            gifUrl: 1,
            userFrom: {
              profilePicture: "$userFrom.profilePicture",
              username: "$authId.username",
              avatarColor: "$authId.avatarColor",
              uId: "$authId.uId",
            },
          },
        },
      ]);
    return notifications;
  }

  public async updateNotifications(notificationId: string): Promise<void> {
    await NotificationModel.updateOne(
      { _id: notificationId },
      { $set: { read: true } }
    ).exec();
  }

  public async deleteNotifications(notificationId: string): Promise<void> {
    await NotificationModel.deleteOne({ _id: notificationId }).exec();
  }
}

export const notificationServices: NotificationServices =
  new NotificationServices();
