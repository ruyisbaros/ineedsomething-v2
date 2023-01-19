import { INotificationDocument } from "./../interfaces/notifications.interface";
import { notificationServices } from "./../../shared/services/db/notification.services";
import { notificationQueue } from "./../../shared/services/queues/notification.queue";
import HTTP_STATUS from "http-status-codes";
import { Request, Response } from "express";
import { ObjectId } from "mongodb";
import mongoose from "mongoose";
import { socketIONotificationObject } from "../../shared/sockets/notification";

const notificationCtrl = {
  update: async (req: Request, res: Response): Promise<void> => {
    socketIONotificationObject.emit("update notification", req.params.id);

    notificationQueue.addNotificationJob("updateNotification", {
      key: req.params.id,
    });
    res
      .status(HTTP_STATUS.CREATED)
      .json({ message: "Notification updated successfully" });
  },
  delete: async (req: Request, res: Response): Promise<void> => {
    socketIONotificationObject.emit("delete notification", req.params.id);

    notificationQueue.addNotificationJob("deleteNotification", {
      key: req.params.id,
    });
    res
      .status(HTTP_STATUS.CREATED)
      .json({ message: "Notification deleted successfully" });
  },
  get: async (req: Request, res: Response): Promise<void> => {
    const notifications: INotificationDocument[] =
      await notificationServices.getNotifications(`${req.currentUser?.userId}`);
    res
      .status(HTTP_STATUS.CREATED)
      .json({ message: "Your notifications", notifications });
  },
};

export default notificationCtrl;
