import { notificationServices } from "./../../shared/services/db/notification.services";
import {
  INotificationDocument,
  INotification,
} from "./../interfaces/notifications.interface";
import mongoose, { model, Model, Schema } from "mongoose";

const notificationSchema: Schema = new Schema({
  userTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  userFrom: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  read: { type: Boolean, default: false },
  notificationType: String,
  entityId: mongoose.Types.ObjectId,
  createdItemId: mongoose.Types.ObjectId,
  message: { type: String, default: "" },
  comment: { type: String, default: "" },
  reaction: { type: String, default: "" },
  post: { type: String, default: "" },
  imgId: { type: String, default: "" },
  imgVersion: { type: String, default: "" },
  gifUrl: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now() },
});

notificationSchema.methods.insertNotification = async function (
  body: INotification
) {
  const {
    userTo,
    userFrom,
    message,
    notificationType,
    entityId,
    createdItemId,
    createdAt,
    comment,
    reaction,
    post,
    imgId,
    imgVersion,
    gifUrl,
  } = body;

  await NotificationModel.create({
    userTo,
    userFrom,
    message,
    notificationType,
    entityId,
    createdItemId,
    createdAt,
    comment,
    reaction,
    post,
    imgId,
    imgVersion,
    gifUrl,
  });

  try {
    const notifications: INotificationDocument[] =
      await notificationServices.getNotifications(userTo);
    return notifications;
  } catch (error) {
    console.log(error);
  }
};

const NotificationModel: Model<INotificationDocument> =
  model<INotificationDocument>(
    "Notification",
    notificationSchema,
    "Notification"
  );
export { NotificationModel };
