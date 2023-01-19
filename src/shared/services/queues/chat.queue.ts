import { IChatJobData, IMessageData } from "./../../../features/interfaces/chat.interfaces";
import { chatWorker } from "./../../workers/chat.worker";
import { BaseQueue } from "./base.queue";

class ChatQueue extends BaseQueue {
  constructor() {
    super("chats");
    this.processJob("addChatMessageToDb", 5, chatWorker.addChatMessageToDb);
    this.processJob("markMsgDeletedInDb", 5, chatWorker.markMessageAsDeletedInD);
    this.processJob("markMsgReadInDb", 5, chatWorker.markMessageAsReadInDb);
    this.processJob("updateMsgReactionInDb", 5, chatWorker.updateMessageReactionInDb);
  }

  public addChatJob(name: string, data: IChatJobData | IMessageData): void {
    this.addJob(name, data);
  }
}

export const chatQueue: ChatQueue = new ChatQueue();
