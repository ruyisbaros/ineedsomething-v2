import { IConversationDocument } from "./../../../features/interfaces/conversation.interface";
import { IMessageData } from "./../../../features/interfaces/chat.interfaces";
import { ConversationModel } from "./../../../features/models/conversationModel";
import { ChatModel } from "./../../../features/models/chatModel";
import { ObjectId } from "mongodb";
class ChatService {
  public async addMessageToDb(data: IMessageData): Promise<void> {
    const conversation: IConversationDocument[] = await ConversationModel.find({ _id: data?.conversationId }).exec();
    if (conversation.length === 0) {
      await ConversationModel.create({
        _id: data?.conversationId,
        senderId: data?.senderId,
        receiverId: data?.receiverId,
      });
    }
    await ChatModel.create(data);
  }

  //Get users last message of each conversation from DB.
  public async getUsersLastMessages(userId: ObjectId): Promise<IMessageData[]> {
    const messages: IMessageData[] = await ChatModel.aggregate([
      { $match: { $or: [{ senderId: userId }, { receiverId: userId }] } },
      {
        $group: {
          _id: "$conversationId",
          result: { $last: "$$ROOT" },
        },
      },
      {
        $project: {
          _id: "$result._id",
          conversationId: "$result.conversationId",
          receiverId: "$result.receiverId",
          receiverAvatarColor: "$result.receiverAvatarColor",
          receiverProfilePicture: "$result.receiverProfilePicture",
          receiverUsername: "$result.receiverUsername",
          body: "$result.body",
          gifUrl: "$result.gifUrl",
          isRead: "$result.isRead",
          senderAvatarColor: "$result.senderAvatarColor",
          senderId: "$result.senderId",
          senderUsername: "$result.senderUsername",
          senderProfilePicture: "$result.senderProfilePicture",
          selectedImage: "$result.selectedImage",
          reaction: "$result.reaction",
          createdAt: "$result.createdAt",
        },
      },
      {
        $sort: { createdAt: 1 },
      },
    ]);

    return messages;
  }

  //Get messages between 2 users
  public async getChatMessagesFromDb(senderId: ObjectId, receiverId: ObjectId, sort: Record<string, 1 | -1>): Promise<IMessageData[]> {
    const messages: IMessageData[] = await ChatModel.aggregate([
      {
        $match: {
          $or: [
            { senderId, receiverId },
            { senderId: receiverId, receiverId: senderId },
          ],
        },
      },
      { $sort: sort },
    ]);

    return messages;
  }

  public async markMessageAsDeletedInDb(messageId: string, type: string): Promise<void> {
    if (type === "deleteForMe") {
      await ChatModel.updateOne({ _id: messageId }, { $set: { deleteForMe: true } }).exec();
    } else {
      await ChatModel.updateOne({ _id: messageId }, { $set: { deleteForMe: true, deleteForEveryone: true } }).exec();
    }
  }

  public async markMessageAsReadInDb(senderId: ObjectId, receiverId: ObjectId): Promise<void> {
    await ChatModel.updateMany(
      {
        $or: [
          { senderId, receiverId, isRead: false },
          { senderId: receiverId, receiverId: senderId, isRead: false },
        ],
      },
      { $set: { isRead: true } }
    ).exec();
  }

  public async updateMessageReactionInDb(messageId: ObjectId, reaction: string, senderName: string, type: "add" | "remove"): Promise<void> {
    if (type === "add") {
      await ChatModel.updateOne({ _id: messageId }, { $push: { reaction: { senderName, type: reaction } } }).exec();
    } else {
      await ChatModel.updateOne({ _id: messageId }, { $pull: { reaction: { senderName } } }).exec();
    }
  }
}

export const chatService: ChatService = new ChatService();
