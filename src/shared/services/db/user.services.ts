import { INotificationSettings, ISearchUser, IBasicInfo, ISocialLinks, IUserDocument } from "./../../../features/interfaces/user.interface";
import { IAuthDocument } from "./../../../features/interfaces/auth.interfaces";
import { followerService } from "./follower.services";
import mongoose from "mongoose";
import User from "./../../../features/models/userModel";
import Auth from "./../../../features/models/authModel";
import { indexOf } from "lodash";

class UserService {
  public async changePassword(username: string, newHashedPassword: string): Promise<void> {
    await Auth.updateOne({ username }, { $set: { password: newHashedPassword } }).exec();
  }

  public async updateUserInfo(userId: string, info: IBasicInfo): Promise<void> {
    await User.updateOne(
      { _id: userId },
      {
        $set: {
          work: info.work,
          quote: info.quote,
          school: info.school,
          location: info.location,
        },
      }
    ).exec();
  }

  public async updateSocialLinks(userId: string, links: ISocialLinks): Promise<void> {
    await User.updateOne(
      { _id: userId },
      {
        $set: { social: links },
      }
    ).exec();
  }

  public async updateNotsReceive(userId: string, settings: INotificationSettings): Promise<void> {
    await User.updateOne(
      { _id: userId },
      {
        $set: { notifications: settings },
      }
    ).exec();
  }

  public async findUserByUserId(id: string): Promise<IUserDocument | null> {
    const users: IUserDocument[] = await User.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id) } }, //find element
      {
        $lookup: {
          from: "Auth",
          localField: "authId",
          foreignField: "_id",
          as: "authId",
        },
      }, //Populate Auth
      { $unwind: "$authId" }, //converts object
      {
        $project: this.aggregateProject(),
      },
    ]);
    console.log("from database");
    return users[0];
  }
  public async findUserByUsername(username: string): Promise<IAuthDocument> {
    const user: IAuthDocument = (await Auth.findOne({ username }).exec()) as IAuthDocument;
    return user;
  }
  public async findUserByUserEmail(email: string): Promise<IAuthDocument> {
    const user: IAuthDocument = (await Auth.findOne({ email }).exec()) as IAuthDocument;
    return user;
  }

  public async findUserByAuthId(id: string): Promise<IUserDocument | null> {
    const users: IUserDocument[] = await User.aggregate([
      { $match: { authId: new mongoose.Types.ObjectId(id) } }, //find element
      {
        $lookup: {
          from: "Auth",
          localField: "authId",
          foreignField: "_id",
          as: "authId",
        },
      }, //Populate Auth
      { $unwind: "$authId" }, //converts object
      {
        $project: this.aggregateProject(),
      },
    ]);
    console.log("from database");
    return users[0];
  }

  public async getAllUsers(userId: string, skip: number, limit: number): Promise<IUserDocument[]> {
    const users: IUserDocument[] = await User.aggregate([
      { $match: { _id: { $ne: new mongoose.Types.ObjectId(userId) } } },
      { $skip: skip },
      { $limit: limit },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "Auth",
          localField: "authId",
          foreignField: "_id",
          as: "authId",
        },
      }, //Populate Auth
      { $unwind: "$authId" }, //converts object
      {
        $project: this.aggregateProject(),
      },
    ]);
    console.log("from database");
    return users;
  }

  public async getRandomUsers(userId: string): Promise<IUserDocument[]> {
    const randomUsers: IUserDocument[] = [];
    const users: IUserDocument[] = await User.aggregate([
      { $match: { _id: { $ne: new mongoose.Types.ObjectId(userId) } } },
      {
        $lookup: {
          from: "Auth",
          localField: "authId",
          foreignField: "_id",
          as: "authId",
        },
      }, //Populate Auth
      { $unwind: "$authId" }, //converts object
      { $sample: { size: 10 } },
      {
        $addFields: {
          username: "$authId.username",
          email: "$authId.email",
          avatarColor: "$authId.avatarColor",
          uId: "$authId.uId",
          createdAt: "$authId.createdAt",
        },
      },
      {
        $project: {
          authId: 0,
          __v: 0,
        },
      },
    ]);
    const followings: string[] = await followerService.getFollowingIds(`${userId}`);
    //console.log(followings);
    for (const user of users) {
      const indexOfUser = indexOf(followings, user._id.toString());
      if (indexOfUser < 0) {
        randomUsers.push(user);
      }
    }
    return randomUsers;
  }

  public async searchUsers(regex: RegExp): Promise<ISearchUser[]> {
    const users = await Auth.aggregate([
      { $match: { username: regex } }, //find element
      {
        $lookup: {
          from: "User",
          localField: "_id",
          foreignField: "authId",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: "$user._id",
          profilePicture: 1,
          username: 1,
          email: 1,
          avatarColor: 1,
        },
      },
    ]);

    return users;
  }

  public async getUsersCount(): Promise<number> {
    const count: number = await User.find({}).countDocuments();

    return count;
  }

  private aggregateProject() {
    return {
      _id: 1,
      username: "$authId.username",
      uId: "$authId.uId",
      email: "$authId.email",
      createdAt: "$authId.createdAt",
      avatarColor: "$authId.avatarColor",
      postsCount: 1,
      work: 1,
      school: 1,
      quote: 1,
      location: 1,
      blocked: 1,
      blockedBy: 1,
      followersCount: 1,
      followingCount: 1,
      notifications: 1,
      social: 1,
      bgImageVersion: 1,
      bgImageId: 1,
      profilePicture: 1,
    };
  }
}

export const userService: UserService = new UserService();
