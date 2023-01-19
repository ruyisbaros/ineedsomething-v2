import { chatService } from "./../../shared/services/db/chat.services";
import { chatQueue } from "./../../shared/services/queues/chat.queue";
import { ChatsCache } from "./../../shared/services/redis/chat.cache";
import { emailQueue } from "./../../shared/services/queues/email.queue";
import { notificationTemplate } from "./../../shared/services/templates/notification.temp";
import { IMessageData, IMessageNotification } from "./../interfaces/chat.interfaces";
import { uploadImage } from "./../../shared/globals/cloudinary.upload";
import { UploadApiResponse } from "cloudinary";
import { Request, Response } from "express";
import HTTP_STATUS from "http-status-codes";
import { BadRequestError } from "./../../shared/globals/error.handler";
import { ObjectId } from "mongodb";
import { UserCache } from "./../../shared/services/redis/user.cache";
import { IUserDocument } from "./../interfaces/user.interface";
import mongoose from "mongoose";
import { socketIOChatObject } from "./../../shared/sockets/chat";
import { INotificationTemplate } from "../interfaces/notifications.interface";

const userCache: UserCache = new UserCache();
const chatCache: ChatsCache = new ChatsCache();

const chatCtrl = {
  sendMessage: async (req: Request, res: Response): Promise<void> => {
    const { conversationId, receiverId, receiverUsername, receiverAvatarColor, receiverProfilePicture, body, gifUrl, isRead, selectedImage } =
      req.body;
    let fileUrl = "";
    const chatObjId: ObjectId = new ObjectId();
    const conversationObjId: ObjectId = !conversationId ? new ObjectId() : new mongoose.Types.ObjectId(conversationId);
    const sender: IUserDocument = (await userCache.getUserFromRedisCache(`${req.currentUser?.userId}`)) as IUserDocument;
    //1. Save image to cloud if chat users send
    if (selectedImage.length) {
      const result: UploadApiResponse = (await uploadImage(selectedImage, req.currentUser?.userId, true, true)) as UploadApiResponse;
      if (!result?.public_id) {
        throw new BadRequestError(result.message);
      }

      fileUrl = `https://res.cloudinary.com/ruyisbaros/image/upload/v${result.version}/${result.public_id}.jpg`;
    }
    //2. create raw message data for Redis and MongoDB (as we did for posts and users)
    const messageData: IMessageData = {
      _id: `${chatObjId}`,
      conversationId: new mongoose.Types.ObjectId(conversationObjId),
      receiverId,
      receiverAvatarColor,
      receiverProfilePicture,
      receiverUsername,
      body,
      gifUrl,
      isRead,
      senderAvatarColor: `${req.currentUser?.avatarColor}`,
      senderId: `${req.currentUser?.userId}`,
      senderUsername: `${req.currentUser?.username}`,
      senderProfilePicture: `${sender.profilePicture}`,
      selectedImage: fileUrl,
      reaction: [],
      createdAt: new Date(),
      deleteForEveryone: false,
      deleteForMe: false,
    } as IMessageData;
    //3. emit event
    emitSocketIOEvent(messageData);
    //4. Send notification mail
    if (!isRead) {
      messageNotification({
        currentUser: req.currentUser!,
        message: body,
        receiverName: receiverUsername,
        receiverId,
        messageData,
      });
    }

    //5. add sender to chat list
    chatCache.addChatListToCache(`${req.currentUser?.userId}`, `${receiverId}`, `${conversationObjId}`);
    //6. add receiver to chat list
    chatCache.addChatListToCache(`${receiverId}`, `${req.currentUser?.userId}`, `${conversationObjId}`);
    //7. add message data to redis cache
    chatCache.addChatMessagesToCache(`${conversationObjId}`, messageData);
    //8. add message to chat queue
    chatQueue.addChatJob("addChatMessageToDb", messageData);

    res.status(HTTP_STATUS.OK).json({ message: "message sent", conversationId: conversationObjId });
  },
  addChatUsersCache: async (req: Request, res: Response): Promise<void> => {
    const chatUsers = await chatCache.addChatUsersToCache(req.body);
    socketIOChatObject.emit("add chat users", chatUsers);
    res.status(HTTP_STATUS.OK).json({ message: "Users added" });
  },
  removeChatUsersCache: async (req: Request, res: Response): Promise<void> => {
    const chatUsers = await chatCache.removeChatUsersFromCache(req.body);
    socketIOChatObject.emit("add chat users", chatUsers);
    res.status(HTTP_STATUS.OK).json({ message: "Users removed" });
  },
  getUsersLastMessage: async (req: Request, res: Response): Promise<void> => {
    let list = [];

    const cachedList = await chatCache.getUserConversationList(`${req.currentUser?.userId}`);
    if (cachedList.length > 0) {
      list = cachedList;
    } else {
      list = await chatService.getUsersLastMessages(new mongoose.Types.ObjectId(req.currentUser?.userId));
    }
    res.status(HTTP_STATUS.OK).json({ message: "Last messages of each conversation", list });
  },

  getMessagesBetweenTwoUsers: async (req: Request, res: Response): Promise<void> => {
    let messages = [];
    const { id } = req.params;

    const cachedList = await chatCache.getChatMessagesFromCache(`${req.currentUser?.userId}`, id);
    if (cachedList.length > 0) {
      messages = cachedList;
    } else {
      messages = await chatService.getChatMessagesFromDb(new mongoose.Types.ObjectId(req.currentUser?.userId), new mongoose.Types.ObjectId(id), {
        createdAt: 1,
      });
    }
    res.status(HTTP_STATUS.OK).json({ message: "Messages between", messages });
  },

  markMessageAsDeleted: async (req: Request, res: Response): Promise<void> => {
    const { senderId, receiverId, messageId, type } = req.body;
    const cachedMessage: IMessageData = await chatCache.markMessageAsDeletedInCache(senderId, receiverId, messageId, type);
    socketIOChatObject.emit("message read", cachedMessage);
    socketIOChatObject.emit("chat list", cachedMessage);

    chatQueue.addChatJob("markMsgDeletedInDb", { messageId, type });

    res.status(HTTP_STATUS.OK).json({ message: "Message marked as deleted" });
  },

  markMessagesAsRead: async (req: Request, res: Response): Promise<void> => {
    const { senderId, receiverId } = req.body;
    const cachedMessage: IMessageData = await chatCache.markMessageAsReadInCache(senderId, receiverId);
    socketIOChatObject.emit("message read", cachedMessage);
    socketIOChatObject.emit("chat list", cachedMessage);

    chatQueue.addChatJob("markMsgReadInDb", { senderId: new mongoose.Types.ObjectId(senderId), receiverId: new mongoose.Types.ObjectId(receiverId) });

    res.status(HTTP_STATUS.OK).json({ message: "Message marked as read" });
  },

  addMessageReaction: async (req: Request, res: Response): Promise<void> => {
    const { conversationId, messageId, reaction, type } = req.body;
    const cachedMessage: IMessageData = await chatCache.updateMessageReactionInCache(
      conversationId,
      messageId,
      reaction,
      `${req.currentUser?.username}`,
      type
    );
    socketIOChatObject.emit("message reaction", cachedMessage);

    chatQueue.addChatJob("updateMsgReactionInDb", {
      messageId: new mongoose.Types.ObjectId(messageId),
      reaction,
      senderName: `${req.currentUser?.username}`,
      type,
    });

    res.status(HTTP_STATUS.OK).json({ message: "Reaction added" });
  },
};
/* --------------------------------HELPERS---------------------------------------------------- */
function emitSocketIOEvent(data: IMessageData): void {
  socketIOChatObject.emit("message received", data);
  socketIOChatObject.emit("chat list", data);
}

async function messageNotification({ currentUser, message, receiverName, receiverId }: IMessageNotification): Promise<void> {
  const receiver: IUserDocument = (await userCache.getUserFromRedisCache(`${receiverId}`)) as IUserDocument;

  if (receiver.notifications.messages) {
    const params: INotificationTemplate = {
      username: receiverName,
      message,
      header: `Chat message from: ${currentUser.username}`,
    };

    const template = notificationTemplate.notificationTemplater(params);
    emailQueue.addEmailJob("messageNotMail", {
      receiverEmail: receiver.email!,
      template,
      subject: ` ${currentUser.username} texted you!`,
    });
  }
}
export default chatCtrl;
