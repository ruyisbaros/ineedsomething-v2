import { INotificationDocument, INotificationTemplate } from "../../../features/interfaces/notifications.interface";
import { IUserDocument } from "../../../features/interfaces/user.interface";
import { IFollowerData, IFollowerDocument, IFollower } from "../../../features/interfaces/follower.interface";
import { ObjectId, BulkWriteResult, PushOperator } from "mongodb";
import mongoose from "mongoose";
import { FollowerModel } from "../../../features/models/followerModel";
import UserModel from "../../../features/models/userModel";
import { NotificationModel } from "../../../features/models/notificationModel";
import { socketIONotificationObject } from "../../../shared/sockets/notification";
import { notificationTemplate } from "../templates/notification.temp";
import { emailQueue } from "../queues/email.queue";
import { UserCache } from "../redis/user.cache";
import { map } from "lodash";

const userCache: UserCache = new UserCache();
class FollowerService {
  /* --------------------------------FOLLOW UN FOLLOW SITUATIONS ----------------------------------------- */
  public async addFollowerToDb(followerId: string, followingId: string, username: string, followerDocumentId: ObjectId): Promise<void> {
    const followingObjId: ObjectId = new mongoose.Types.ObjectId(followingId); //target user
    const followerObjId: ObjectId = new mongoose.Types.ObjectId(followerId); //current user

    const following: IFollowerDocument = (await FollowerModel.create({
      _id: followerDocumentId,
      followerId: followerObjId,
      followingId: followingObjId,
    })) as IFollowerDocument;

    const users: Promise<BulkWriteResult> = UserModel.bulkWrite([
      {
        updateOne: {
          filter: { _id: followerId },
          update: { $inc: { followingCount: 1 } },
        },
      },
      {
        updateOne: {
          filter: { _id: followingId },
          update: { $inc: { followersCount: 1 } },
        },
      },
    ]);

    const response: [BulkWriteResult, IUserDocument | null] = await Promise.all([users, userCache.getUserFromRedisCache(followingId)]);
    //Create notification and Send a notification of start Following to relevant user
    //Does User wants to receive a notification of follow started?
    if (response[1]?.notifications.follows && followerId !== followingId) {
      const notificationModel: INotificationDocument = new NotificationModel();
      const notifications = await notificationModel.insertNotification({
        userFrom: followerId,
        userTo: followingId,
        message: `${username} started to follow you`,
        notificationType: "follows",
        entityId: new mongoose.Types.ObjectId(followerId),
        createdItemId: new mongoose.Types.ObjectId(following._id),
        createdAt: new Date(),
        comment: "",
        post: "",
        imgId: "",
        imgVersion: "",
        gifUrl: "",
        reaction: "",
      });

      //Send client
      socketIONotificationObject.emit("insert notification", notifications, {
        userTo: followingId,
      });
      //Send notification email
      const params: INotificationTemplate = {
        username: response[1].username!,
        message: `${username} started to follow you`,
        header: "Follower Notification",
      };

      const template = notificationTemplate.notificationTemplater(params);
      emailQueue.addEmailJob("followNotMail", {
        receiverEmail: response[1].email!,
        template,
        subject: "Follow Notification",
      });
    }
  }

  public async removeFollowerFromDb(followerId: string, followingId: string): Promise<void> {
    const followingObjId: ObjectId = new mongoose.Types.ObjectId(followingId); //target user
    const followerObjId: ObjectId = new mongoose.Types.ObjectId(followerId); //current user

    await FollowerModel.deleteOne({
      followerId: followerObjId,
      followingId: followingObjId,
    });

    const users: Promise<BulkWriteResult> = UserModel.bulkWrite([
      {
        updateOne: {
          filter: { _id: followerId },
          update: { $inc: { followingCount: -1 } },
        },
      },
      {
        updateOne: {
          filter: { _id: followingId },
          update: { $inc: { followersCount: -1 } },
        },
      },
    ]);

    await Promise.all([users]);
  }

  public async getFollowings(userObjId: ObjectId): Promise<IFollowerData[]> {
    const followings: IFollowerData[] = await FollowerModel.aggregate([
      { $match: { followerId: userObjId } }, //Takip ettiklerimi bulmak istiyorum. FollowerId de ben varsam demek ki takip edenim
      {
        $lookup: {
          from: "User",
          localField: "followingId",
          foreignField: "_id",
          as: "followingId",
        },
      },
      { $unwind: "$followingId" },
      {
        $lookup: {
          from: "Auth",
          localField: "followingId.authId",
          foreignField: "_id",
          as: "authId",
        },
      },
      { $unwind: "$authId" },
      {
        $addFields: {
          _id: "$followingId._id",
          postsCount: "$followingId.postsCount",
          followersCount: "$followingId.followersCount",
          followingCount: "$followingId.followingCount",
          profilePicture: "$followingId.profilePicture",
          username: "$authId.username",
          avatarColor: "$authId.avatarColor",
          uId: "$authId.uId",
          userProfile: "$followingId",
        },
      },
      {
        $project: {
          authId: 0,
          followerId: 0,
          followingId: 0,
          createdAt: 0,
          __v: 0,
        },
      },
    ]);

    return followings;
  }

  public async getFollowers(userObjId: ObjectId): Promise<IFollowerData[]> {
    const followers: IFollowerData[] = await FollowerModel.aggregate([
      { $match: { followingId: userObjId } }, //X kisiyi takip edenleri bulmak istiyorum. FollowingId de X in ID si varsa demek ki takip ediliyor
      {
        $lookup: {
          from: "User",
          localField: "followerId",
          foreignField: "_id",
          as: "followerId",
        },
      },
      { $unwind: "$followerId" },
      {
        $lookup: {
          from: "Auth",
          localField: "followerId.authId",
          foreignField: "_id",
          as: "authId",
        },
      },
      { $unwind: "$authId" },
      {
        $addFields: {
          _id: "$followerId._id",
          postsCount: "$followerId.postsCount",
          followersCount: "$followerId.followersCount",
          followingCount: "$followerId.followingCount",
          profilePicture: "$followerId.profilePicture",
          username: "$authId.username",
          avatarColor: "$authId.avatarColor",
          uId: "$authId.uId",
          userProfile: "$followerId",
        },
      },
      {
        $project: {
          authId: 0,
          followerId: 0,
          followingId: 0,
          createdAt: 0,
          __v: 0,
        },
      },
    ]);

    return followers;
  }
  public async getFollowingIds(userId: string): Promise<string[]> {
    const followings = await FollowerModel.find({ followerId: userId });

    //const response: string[] = map(followings, (res) => res.followerId.toString()) as string[];
    const response = followings.map((follower) => follower.followingId.toString());
    return response;
  }

  /* --------------------------------BLOCK UNBLOCK SITUATIONS ----------------------------------------- */
  public async blockUser(userId: string, targetUserId: string): Promise<void> {
    await UserModel.bulkWrite([
      {
        updateOne: {
          filter: {
            _id: userId,
            blocked: { $ne: new mongoose.Types.ObjectId(targetUserId) },
          },
          update: {
            $push: {
              blocked: new mongoose.Types.ObjectId(targetUserId),
            } as PushOperator<Document>,
          },
        },
      },
      {
        updateOne: {
          filter: {
            _id: targetUserId,
            blockedBy: { $ne: new mongoose.Types.ObjectId(userId) },
          },
          update: {
            $push: {
              blockedBy: new mongoose.Types.ObjectId(userId),
            } as PushOperator<Document>,
          },
        },
      },
    ]);
  }
  public async unBlockUser(userId: string, targetUserId: string): Promise<void> {
    await UserModel.bulkWrite([
      {
        updateOne: {
          filter: {
            _id: userId,
          },
          update: {
            $pull: {
              blocked: new mongoose.Types.ObjectId(targetUserId),
            } as PushOperator<Document>,
          },
        },
      },
      {
        updateOne: {
          filter: {
            _id: targetUserId,
          },
          update: {
            $pull: {
              blockedBy: new mongoose.Types.ObjectId(userId),
            } as PushOperator<Document>,
          },
        },
      },
    ]);
  }
}

export const followerService: FollowerService = new FollowerService();
