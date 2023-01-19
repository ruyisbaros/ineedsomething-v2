import { IReaction } from "./../../../features/interfaces/reaction.interface";
import { IMessageData, IChatUsers, IChatList, IGetMessageFromCache } from "./../../../features/interfaces/chat.interfaces";
import Logger from "bunyan";
import { config } from "./../../../config";
import { ServerError } from "../../globals/error.handler";
import { parseJson } from "../../globals/parse.redis.cache";
import { findIndex, find, filter, remove } from "lodash";
import { BaseCache } from "./base.cache";

const log: Logger = config.createLogger("chatsRedisCache");

export class ChatsCache extends BaseCache {
  constructor() {
    super("messageCache");
  }
  public async addChatListToCache(senderId: string, receiverId: string, conversationId: string): Promise<void> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      const chatList: string[] = await this.client.LRANGE(`chatList:${senderId}`, 0, -1);
      if (chatList.length === 0) {
        await this.client.RPUSH(`chatList:${senderId}`, JSON.stringify({ receiverId, conversationId }));
      } else {
        const receiverIndex: number = findIndex(chatList, (item: string) => item.includes(receiverId));
        if (receiverIndex < 0) {
          await this.client.RPUSH(`chatList:${senderId}`, JSON.stringify({ receiverId, conversationId }));
        }
      }
    } catch (error) {
      log.error(error);
      throw new ServerError("Could not connect to Redis server!");
    }
  }

  public async addChatMessagesToCache(conversationId: string, value: IMessageData): Promise<void> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      await this.client.RPUSH(`messages:${conversationId}`, JSON.stringify(value));
    } catch (error) {
      log.error(error);
      throw new ServerError("Could not connect to Redis server!");
    }
  }

  public async addChatUsersToCache(value: IChatUsers): Promise<IChatUsers[]> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      const users: IChatUsers[] = await this.getChatUsersList();
      const usersIndex: number = findIndex(users, (item: IChatUsers) => JSON.stringify(item) === JSON.stringify(value));
      let chatUsers: IChatUsers[] = [];
      if (usersIndex < 0) {
        await this.client.RPUSH("chatUsers", JSON.stringify(value));
        chatUsers = await this.getChatUsersList();
      } else {
        chatUsers = users;
      }
      return chatUsers;
    } catch (error) {
      log.error(error);
      throw new ServerError("Could not connect to Redis server!");
    }
  }

  public async removeChatUsersFromCache(value: IChatUsers): Promise<IChatUsers[]> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      const users: IChatUsers[] = await this.getChatUsersList();
      const usersIndex: number = findIndex(users, (item: IChatUsers) => JSON.stringify(item) === JSON.stringify(value));
      let chatUsers: IChatUsers[] = [];
      if (usersIndex > -1) {
        await this.client.LREM("chatUsers", usersIndex, JSON.stringify(value));
        chatUsers = await this.getChatUsersList();
      } else {
        chatUsers = users;
      }
      return chatUsers;
    } catch (error) {
      log.error(error);
      throw new ServerError("Could not connect to Redis server!");
    }
  }
  //Get users last message of each conversation from cache.
  public async getUserConversationList(userId: string): Promise<IMessageData[]> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      const userChatList: string[] = await this.client.LRANGE(`chatList:${userId}`, 0, -1);
      const conversationChatList: IMessageData[] = [];
      for (const item of userChatList) {
        const chatItem: IChatList = parseJson(item);
        const lastMessage: string = (await this.client.LINDEX(`messages:${chatItem.conversationId}`, -1)) as string;

        conversationChatList.push(parseJson(lastMessage));
      }
      return conversationChatList;
    } catch (error) {
      log.error(error);
      throw new ServerError("Could not connect to Redis server!");
    }
  }
  //Get messages between 2 users
  public async getChatMessagesFromCache(senderId: string, receiverId: string): Promise<IMessageData[]> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      const userChatList: string[] = await this.client.LRANGE(`chatList:${senderId}`, 0, -1);
      const receiver: string = find(userChatList, (item: string) => item.includes(receiverId)) as string;
      const parsedReceiver: IChatList = parseJson(receiver);
      let chatMessages: IMessageData[] = [];
      if (parsedReceiver) {
        const messages: string[] = await this.client.LRANGE(`messages:${parsedReceiver.conversationId}`, 0, -1);
        for (const item of messages) {
          chatMessages.push(parseJson(item));
        }
      }
      return chatMessages;
    } catch (error) {
      log.error(error);
      throw new ServerError("Could not connect to Redis server!");
    }
  }

  public async markMessageAsDeletedInCache(senderId: string, receiverId: string, messageId: string, type: string): Promise<IMessageData> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      const { index, message, receiver } = await this.getMessageWithInfo(senderId, receiverId, messageId);
      const parsedMessage = parseJson(message) as IMessageData;
      if (type === "deleteForMe") {
        parsedMessage.deleteForMe = true;
      } else {
        parsedMessage.deleteForMe = true;
        parsedMessage.deleteForEveryone = true;
      }
      await this.client.LSET(`messages:${receiver.conversationId}`, index, JSON.stringify(parsedMessage));

      return parsedMessage;
    } catch (error) {
      log.error(error);
      throw new ServerError("Could not connect to Redis server!");
    }
  }

  public async markMessageAsReadInCache(senderId: string, receiverId: string): Promise<IMessageData> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      const userChatList: string[] = await this.client.LRANGE(`chatList:${senderId}`, 0, -1);
      const receiver: string = find(userChatList, (item: string) => item.includes(receiverId)) as string;
      const parsedReceiver: IChatList = parseJson(receiver);
      const messages: string[] = await this.client.LRANGE(`messages:${parsedReceiver.conversationId}`, 0, -1);
      const unReadMessages: string[] = filter(messages, (item: string) => !parseJson(item).isRead);
      for (const item of unReadMessages) {
        const chatItem = parseJson(item) as IMessageData;
        const index = findIndex(messages, (item: string) => item.includes(`${chatItem._id}`));
        chatItem.isRead = true;
        await this.client.LSET(`messages:${parsedReceiver.conversationId}`, index, JSON.stringify(chatItem));
      }

      const lastMessage: string = (await this.client.LINDEX(`messages:${parsedReceiver.conversationId}`, -1)) as string;

      return parseJson(lastMessage) as IMessageData;
    } catch (error) {
      log.error(error);
      throw new ServerError("Could not connect to Redis server!");
    }
  }

  public async updateMessageReactionInCache(
    conversationId: string,
    messageId: string,
    reaction: string,
    senderName: string,
    type: "add" | "remove"
  ): Promise<IMessageData> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      const messages: string[] = await this.client.LRANGE(`messages:${conversationId}`, 0, -1);
      const index: number = findIndex(messages, (item: string) => item.includes(messageId));
      const message: string = (await this.client.LINDEX(`messages:${conversationId}`, index)) as string;
      const parsedMessage = parseJson(message) as IMessageData;
      const reactions: IReaction[] = [];
      if (parsedMessage) {
        remove(parsedMessage.reaction, (reaction: IReaction) => reaction.senderName === senderName);
        if (type === "add") {
          reactions.push({ senderName, type: reaction });
          parsedMessage.reaction = [...parsedMessage.reaction, ...reactions];
          await this.client.LSET(`messages:${conversationId}`, index, JSON.stringify(parsedMessage));
        } else {
          await this.client.LSET(`messages:${conversationId}`, index, JSON.stringify(parsedMessage));
        }
      }

      const lastMessage: string = (await this.client.LINDEX(`messages:${conversationId}`, index)) as string;

      return parseJson(lastMessage) as IMessageData;
    } catch (error) {
      log.error(error);
      throw new ServerError("Could not connect to Redis server!");
    }
  }

  private async getChatUsersList(): Promise<IChatUsers[]> {
    const chatUsersList: IChatUsers[] = [];
    const chatUsers = await this.client.LRANGE("chatUsers", 0, -1);

    for (let item of chatUsers) {
      const chatUser: IChatUsers = parseJson(item) as IChatUsers;
      chatUsersList.push(chatUser);
    }

    return chatUsersList;
  }

  private async getMessageWithInfo(senderId: string, receiverId: string, messageId: string): Promise<IGetMessageFromCache> {
    const userChatList: string[] = await this.client.LRANGE(`chatList:${senderId}`, 0, -1);
    const receiver: string = find(userChatList, (item: string) => item.includes(receiverId)) as string;
    const parsedReceiver: IChatList = parseJson(receiver);
    const messages: string[] = await this.client.LRANGE(`messages:${parsedReceiver.conversationId}`, 0, -1);
    const message: string = find(messages, (item: string) => item.includes(messageId)) as string;
    const index: number = findIndex(messages, (item: string) => item.includes(messageId));

    return { index, message, receiver: parsedReceiver };
  }
}
