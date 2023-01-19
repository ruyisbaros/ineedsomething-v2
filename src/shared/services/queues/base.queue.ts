import { IUserJob } from "./../../../features/interfaces/user.interface";
import { IChatJobData, IMessageData } from "./../../../features/interfaces/chat.interfaces";
import { IFileImageJobData } from "./../../../features/interfaces/image.interface";
import { INotificationJobData } from "./../../../features/interfaces/notifications.interface";
import { IBlockedUserJobData, IFollowerJobData } from "./../../../features/interfaces/follower.interface";
import { ICommentJob } from "./../../../features/interfaces/comments.interface";
import { IReactionJob } from "./../../../features/interfaces/reaction.interface";
import { IPostJobData } from "./../../../features/interfaces/post.interface";
import { IEmailJob } from "../../../features/interfaces/user.interface";
import { IAuthJob } from "../../../features/interfaces/auth.interfaces";
import Queue, { Job } from "bull";
import Logger from "bunyan";
import { createBullBoard } from "@bull-board/api";
import { BullAdapter } from "@bull-board/api/bullAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { config } from "../../../config";

let bullAdapters: BullAdapter[] = [];

type IBaseJobData =
  | IAuthJob
  | IEmailJob
  | IPostJobData
  | IReactionJob
  | ICommentJob
  | IFollowerJobData
  | IBlockedUserJobData
  | INotificationJobData
  | IFileImageJobData
  | IChatJobData
  | IMessageData
  | IUserJob;

export let serverAdapter: ExpressAdapter;

export abstract class BaseQueue {
  log: Logger;
  queue: Queue.Queue;
  constructor(queueName: string) {
    this.queue = new Queue(queueName, `${config.REDIS_HOST}`);
    bullAdapters.push(new BullAdapter(this.queue));
    bullAdapters = [...new Set(bullAdapters)];
    serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath("/queues");

    createBullBoard({
      queues: bullAdapters,
      serverAdapter,
    });
    this.log = config.createLogger(`${queueName}Queue`);

    this.queue.on("completed", (job: Job) => {
      job.remove();
    });
    this.queue.on("global:completed", (jobId: string) => {
      this.log.info(`Job: ${jobId} completed successfully`);
    });
    this.queue.on("global:stalled", (jobId: string) => {
      this.log.info(`Job: ${jobId} is stalled`);
    });
  }

  protected addJob(name: string, data: IBaseJobData): void {
    this.queue.add(name, data, {
      attempts: 3,
      backoff: { type: "fixed", delay: 5000 },
    });
  }

  protected processJob(name: string, concurrency: number, callback: Queue.ProcessCallbackFunction<void>): void {
    this.queue.process(name, concurrency, callback);
  }
}
