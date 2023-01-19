import { IFileImageDocument } from "../../../features/interfaces/image.interface";
import mongoose from "mongoose";
import User from "../../../features/models/userModel";
import { ImageModel } from "../../../features/models/imageModel";

class ImageService {
  public async createImage(userId: string, type: string, imgId: string, imgVersion: string): Promise<void> {
    await ImageModel.create({
      userId,
      bgImageVersion: type === "background" ? imgVersion : "",
      bgImageId: type === "background" ? imgId : "",
      imgVersion,
      imgId,
    });
  }

  public async addUserProfileImage(userId: string, url: string, imgId: string, imgVersion: string): Promise<void> {
    await User.updateOne({ _id: userId }, { $set: { profilePicture: url } }).exec();
    //Create img in DB
    await this.createImage(userId, "profile", imgId, imgVersion);
  }
  public async addUserBackgroundImage(userId: string, imgId: string, imgVersion: string): Promise<void> {
    await User.updateOne({ _id: userId }, { $set: { bgImageId: imgId, bgImageVersion: imgVersion } }).exec();
    //Create img in DB
    await this.createImage(userId, "background", imgId, imgVersion);
  }

  public async removeImage(imgId: string): Promise<void> {
    await ImageModel.deleteOne({ _id: imgId }).exec();
  }

  public async getImageByBgId(bgImageId: string): Promise<IFileImageDocument> {
    const image: IFileImageDocument = (await ImageModel.findOne({
      bgImageId,
    }).exec()) as IFileImageDocument;
    return image;
  }

  public async getUserImages(userId: string): Promise<IFileImageDocument[]> {
    const images: IFileImageDocument[] = await ImageModel.aggregate([{ $match: { userId: new mongoose.Types.ObjectId(userId) } }]);

    return images;
  }
}

export const imageService: ImageService = new ImageService();
