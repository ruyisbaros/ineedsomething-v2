import { imageWorker } from "./../../workers/image.worker";
import { IFileImageJobData } from "./../../../features/interfaces/image.interface";
import { BaseQueue } from "./base.queue";

class ImageQueue extends BaseQueue {
  constructor() {
    super("images");
    this.processJob("addUserProfileImg", 5, imageWorker.addUserProfileImage);
    this.processJob("addBackgroundImg", 5, imageWorker.addUserBackgroundImage);
    this.processJob("createImg", 5, imageWorker.createImage);
    this.processJob("removeImg", 5, imageWorker.removeImage);
  }

  public addImageJob(name: string, data: IFileImageJobData): void {
    this.addJob(name, data);
  }
}

export const imageQueue: ImageQueue = new ImageQueue();
