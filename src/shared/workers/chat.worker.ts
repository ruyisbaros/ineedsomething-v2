import { DoneCallback, Job } from "bull";
import Logger from "bunyan";
import { config } from "../../config";
import { chatService } from "../services/db/chat.services";

const log: Logger = config.createLogger("chatWorker");

class ChatWorker {
  async addChatMessageToDb(job: Job, done: DoneCallback): Promise<void> {
    try {
      const { data } = job;
      //console.log("data: " + data.createdReaction)
      await chatService.addMessageToDb(data);
      job.progress(100);
      done(null, data);
    } catch (error) {
      log.error(error);
      done(error as Error);
    }
  }

  async markMessageAsDeletedInD(job: Job, done: DoneCallback): Promise<void> {
    try {
      const { messageId, type } = job.data;
      //console.log("data: " + data.createdReaction)
      await chatService.markMessageAsDeletedInDb(messageId, type);
      job.progress(100);
      done(null, job.data);
    } catch (error) {
      log.error(error);
      done(error as Error);
    }
  }

  async markMessageAsReadInDb(job: Job, done: DoneCallback): Promise<void> {
    try {
      const { senderId, receiverId } = job.data;
      //console.log("data: " + data.createdReaction)
      await chatService.markMessageAsReadInDb(senderId, receiverId);
      job.progress(100);
      done(null, job.data);
    } catch (error) {
      log.error(error);
      done(error as Error);
    }
  }
  async updateMessageReactionInDb(job: Job, done: DoneCallback): Promise<void> {
    try {
      const { messageId, reaction, senderName, type } = job.data;
      //console.log("data: " + data.createdReaction)
      await chatService.updateMessageReactionInDb(messageId, reaction, senderName, type);
      job.progress(100);
      done(null, job.data);
    } catch (error) {
      log.error(error);
      done(error as Error);
    }
  }
}

export const chatWorker: ChatWorker = new ChatWorker();
