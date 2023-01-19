import { imageService } from "./../../shared/services/db/image.services";
import { BadRequestError } from "./../../shared/globals/error.handler";
import { IBgUploadResponse, IFileImageDocument } from "./../interfaces/image.interface";
import { imageQueue } from "./../../shared/services/queues/image.queue";
import { IUserDocument } from "./../interfaces/user.interface";
import { uploadImage } from "../../shared/globals/cloudinary.upload";
import { UploadApiResponse } from "cloudinary";
import HTTP_STATUS from "http-status-codes";
import { Request, Response } from "express";
import { UserCache } from "../../shared/services/redis/user.cache";
import { socketIOImageObject } from "../../shared/sockets/image";
import { checkUrl } from "../../shared/globals/checkDataUrl";

const userCache: UserCache = new UserCache();

const imageCtrl = {
  addProfileImage: async (req: Request, res: Response): Promise<void> => {
    const { image } = req.body;
    //Upload image to Cloudinary
    const result: UploadApiResponse = (await uploadImage(image, req.currentUser?.userId, true, true)) as UploadApiResponse;
    if (!result?.public_id) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Image not uploaded" });
    }

    const url = `https://res.cloudinary.com/ruyisbaros/image/upload/v${result.version}/${result.public_id}.jpg`;

    const cachedUser: IUserDocument = (await userCache.updateRelevantItemOfUserInCache(
      `${req.currentUser?.userId}`,
      "profilePicture",
      url
    )) as IUserDocument;

    socketIOImageObject.emit("update user", cachedUser);

    //Save image in DB
    imageQueue.addImageJob("addUserProfileImg", {
      key: `${req.currentUser!.userId}`,
      value: url,
      imgId: result.public_id,
      imgVersion: result.version.toString(),
    });

    res.status(HTTP_STATUS.CREATED).json({ message: "Image added successfully" });
  },
  addBackgroundImage: async (req: Request, res: Response): Promise<void> => {
    const { image } = req.body;
    const { version, publicId }: IBgUploadResponse = await backgroundImageControl(image);
    const bgImageId: IUserDocument = (await userCache.updateRelevantItemOfUserInCache(
      `${req.currentUser?.userId}`,
      "bgImageId",
      publicId
    )) as IUserDocument;
    const bgImageVersion: IUserDocument = (await userCache.updateRelevantItemOfUserInCache(
      `${req.currentUser?.userId}`,
      "bgImageVersion",
      version
    )) as IUserDocument;

    socketIOImageObject.emit("update user", { bgImageId: publicId, bgImageVersion: version, userId: bgImageId._id });

    //Save background (bg) image in DB
    imageQueue.addImageJob("addBackgroundImg", {
      key: `${req.currentUser!.userId}`,
      imgId: publicId,
      imgVersion: version,
    });

    res.status(HTTP_STATUS.CREATED).json({ message: "Image added successfully" });
  },

  deleteAnyImage: async (req: Request, res: Response): Promise<void> => {
    const { imageId } = req.params;

    socketIOImageObject.emit("delete image", imageId);

    imageQueue.addImageJob("removeImg", {
      imageId,
    });

    res.status(HTTP_STATUS.CREATED).json({ message: "Image deleted successfully" });
  },

  deleteBgImage: async (req: Request, res: Response): Promise<void> => {
    const image: IFileImageDocument = await imageService.getImageByBgId(req.params.bgImageId);
    socketIOImageObject.emit("delete image", image?._id);
    const bgImageId: IUserDocument = (await userCache.updateRelevantItemOfUserInCache(
      `${req.currentUser?.userId}`,
      "bgImageId",
      ""
    )) as IUserDocument;
    const bgImageVersion: IUserDocument = (await userCache.updateRelevantItemOfUserInCache(
      `${req.currentUser?.userId}`,
      "bgImageVersion",
      ""
    )) as IUserDocument;

    imageQueue.addImageJob("removeImg", {
      imageId: image?._id,
    });

    res.status(HTTP_STATUS.CREATED).json({ message: "Image deleted successfully" });
  },

  getUserImages: async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;
    const images: IFileImageDocument[] = await imageService.getUserImages(userId);

    res.status(HTTP_STATUS.CREATED).json({ message: "User Images", images });
  },
};

/* -----------------------------------HELPER FUNCTIONS------------------------------------------------------------- */

async function backgroundImageControl(image: string): Promise<IBgUploadResponse> {
  const isDataUrl = checkUrl(image);
  let version = "";
  let publicId = "";
  if (isDataUrl) {
    //means it is a base64 encoded image
    const result: UploadApiResponse = (await uploadImage(image)) as UploadApiResponse;
    if (!result?.public_id) {
      throw new BadRequestError(result.message);
    } else {
      version = result.version.toString();
      publicId = result.public_id;
    }
  } else {
    const value = image.split("/");
    publicId = value[value.length - 1];
    version = value[value.length - 2];
  }
  return { version: version.replace(/v/g, ""), publicId: publicId.replace(/.jpg/g, "") };
}
export default imageCtrl;
