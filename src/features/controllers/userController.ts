import { userQueue } from "./../../shared/services/queues/user.queue";
import { emailQueue } from "./../../shared/services/queues/email.queue";
import { resetPasswordTemplate } from "./../../shared/services/templates/reset.password";
import { IResetPasswordParams } from "./../interfaces/user.interface";
import { BadRequestError } from "./../../shared/globals/error.handler";
import { IAuthDocument } from "./../interfaces/auth.interfaces";
import { ISearchUser } from "./../interfaces/user.interface";
import { postServices } from "./../../shared/services/db/post.services";
import { IPostDocument } from "./../interfaces/post.interface";
import { followerService } from "./../../shared/services/db/follower.services";
import { IFollowerData } from "./../interfaces/follower.interface";
import { IUserAll, IAllUsers } from "./../interfaces/user.interface";
import { FollowersRedisCache } from "./../../shared/services/redis/follower.cache";
import { PostCache } from "./../../shared/services/redis/post.cache";
import { UserCache } from "./../../shared/services/redis/user.cache";
import { userService } from "./../../shared/services/db/user.services";
import { IUserDocument } from "../interfaces/user.interface";
import { Request, Response } from "express";
import mongoose from "mongoose";
import HTTP_STATUS from "http-status-codes";
import { escapeRegex } from "./../../shared/globals/escape.regex";
import moment from "moment";
import publicIp from "ip";

const userCache: UserCache = new UserCache();
const postCache: PostCache = new PostCache();
const followerCache: FollowersRedisCache = new FollowersRedisCache();

const userCtrl = {
  getOne: async (req: Request, res: Response): Promise<void> => {
    const cachedUser: IUserDocument = (await userCache.getUserFromRedisCache(`${req.params.id}`)) as IUserDocument;
    const user: IUserDocument = cachedUser ? cachedUser : ((await userService.findUserByUserId(req.params.id)) as IUserDocument);
    res.status(HTTP_STATUS.OK).json({ user, message: "User profile" });
  },
  getMe: async (req: Request, res: Response): Promise<void> => {
    const cachedUser: IUserDocument = (await userCache.getUserFromRedisCache(`${req.currentUser?.userId}`)) as IUserDocument;
    const user: IUserDocument = cachedUser ? cachedUser : ((await userService.findUserByUserId(`${req.currentUser?.userId}`)) as IUserDocument);
    res.status(HTTP_STATUS.OK).json({ user, message: "Current User profile" });
  },
  getProfileWithPosts: async (req: Request, res: Response): Promise<void> => {
    const { userId, username, uId } = req.params;
    const cachedUser: IUserDocument = (await userCache.getUserFromRedisCache(userId)) as IUserDocument;
    const cachedUserPosts: IPostDocument[] = await postCache.getPostsByUserFromRedisCache("post", parseInt(uId, 10));
    const user: IUserDocument = (cachedUser.email && cachedUser.username) ? cachedUser : ((await userService.findUserByUserId(userId)) as IUserDocument);

    const userPosts: IPostDocument[] = cachedUserPosts.length
      ? cachedUserPosts
      : await postServices.getPosts({ username }, 0, 100, { createdAt: -1 });

    res.status(HTTP_STATUS.OK).json({ user, posts: userPosts, message: "User profile with posts" });
  },
  getAll: async (req: Request, res: Response): Promise<void> => {
    const PAGE_SIZE: number = 10;
    const { page } = req.params;
    const skip: number = (parseInt(page) - 1) * PAGE_SIZE;
    const limit: number = PAGE_SIZE * parseInt(page);
    const newSkip: number = skip === 0 ? skip : skip + 1;

    const all: IAllUsers = await allUsers({ newSkip, limit, skip, userId: `${req.currentUser?.userId}` });
    const userFollowers: IFollowerData[] = await followers(`${req.currentUser?.userId}`);

    res.status(HTTP_STATUS.OK).json({ users: all.users, totalUsers: all.totalUsers, followers: userFollowers, message: "Get users" });
  },
  getRandomUserOffersToFollow: async (req: Request, res: Response): Promise<void> => {
    const cachedRandomUser: IUserDocument[] = (await userCache.getRandomUsersFromRedisCache(
      `${req.currentUser?.userId}`,
      `${req.currentUser?.username}`
    )) as IUserDocument[];
    const users: IUserDocument[] =
      cachedRandomUser.length > 0 ? cachedRandomUser : ((await userService.getRandomUsers(`${req.currentUser?.userId}`)) as IUserDocument[]);
    res.status(HTTP_STATUS.OK).json({ users, message: "Profiles you may fallow" });
  },
  searchUsers: async (req: Request, res: Response): Promise<void> => {
    const regex = new RegExp(escapeRegex(req.params.query), "i");
    const users: ISearchUser[] = await userService.searchUsers(regex);
    res.status(HTTP_STATUS.OK).json({ users, message: "Users you searched" });
  },

  changePassword: async (req: Request, res: Response): Promise<void> => {
    const { currentPassword, newPassword } = req.body;
    const user: IAuthDocument = (await userService.findUserByUsername(`${req.currentUser?.username}`)) as IAuthDocument;

    const isPasswordTrue: boolean = await user.comparePassword(currentPassword);
    if (!isPasswordTrue) {
      throw new BadRequestError("Wrong credentials");
    }

    const hashedPassword: string = await user.hashPassword(newPassword);

    await userService.changePassword(`${req.currentUser?.username}`, hashedPassword);

    //Send notification email to user

    const templateParams: IResetPasswordParams = {
      username: user.username!,
      email: user.email!,
      ipaddress: publicIp.address(),
      date: moment().format("DD-MM-YYYY HH:mm:ss"),
    };
    const template = resetPasswordTemplate.resetPasswordTemplater(templateParams);
    emailQueue.addEmailJob("changePwdNotMail", {
      template,
      receiverEmail: user.email!,
      subject: "Password changed confirmation",
    });

    res.status(HTTP_STATUS.OK).json({ message: "Password has been changed successfully. You will be redirected to login page" });
  },

  updateBasicUserInfo: async (req: Request, res: Response): Promise<void> => {
    //1. Update in cache
    for (const [key, value] of Object.entries(req.body)) {
      await userCache.updateRelevantItemOfUserInCache(`${req.currentUser?.userId}`, key, value as string);
    }
    //2. Update in DB
    userQueue.addUserJob("updateUserInfo", { key: `${req.currentUser?.userId}`, value: req.body });

    res.status(HTTP_STATUS.OK).json({ message: "User updated successfully" });
  },

  updateUserSocials: async (req: Request, res: Response): Promise<void> => {
    //1. Update in cache
    await userCache.updateRelevantItemOfUserInCache(`${req.currentUser?.userId}`, "social", req.body);

    //2. Update in DB
    userQueue.addUserJob("updateSocialLinks", { key: `${req.currentUser?.userId}`, value: req.body });
    res.status(HTTP_STATUS.OK).json({ message: "User updated successfully" });
  },
  updateNotificationReceive: async (req: Request, res: Response): Promise<void> => {
    //1. Update in cache
    await userCache.updateRelevantItemOfUserInCache(`${req.currentUser?.userId}`, "notifications", req.body);

    //2. Update in DB
    userQueue.addUserJob("updateNotsReceive", { key: `${req.currentUser?.userId}`, value: req.body });
    res.status(HTTP_STATUS.OK).json({ message: "Notification settings updated successfully", settings: req.body });
  },
  currentUser: async (req: Request, res: Response): Promise<void> => {
    let isUser = false;
    let token = null;
    let user = null;
    const cachedUser: IUserDocument = (await userCache.getUserFromRedisCache(`${req.currentUser?.userId}`)) as IUserDocument;

    const existingUser: IUserDocument = (cachedUser.email && cachedUser.username) ? cachedUser : ((await userService.findUserByUserId(req.currentUser?.userId!)) as IUserDocument);
    //console.log(Object.keys(cachedUser).values(), req.currentUser)
    console.log(existingUser)
    if (Object.keys(existingUser).length) {
      isUser = true;
      token = req.session?.jwt;
      user = existingUser;
    }
    res.status(200).json({ user, isUser, token });
  },
};

/* -----------------------------------HELPER FUNCTIONS------------------------------------------------------------- */
async function allUsers({ newSkip, limit, skip, userId }: IUserAll): Promise<IAllUsers> {
  let users;
  let type = "";
  const cachedUsers: IUserDocument[] = (await userCache.getUsersFromRedisCache(skip, limit, userId)) as IUserDocument[];
  if (cachedUsers.length) {
    type = "redis";
    users = cachedUsers;
  } else {
    (type = "db"), (users = await userService.getAllUsers(userId, newSkip, limit));
  }
  const totalUsers: number = await usersCount(type);
  return { users, totalUsers };
}

async function usersCount(type: string): Promise<number> {
  if (type === "redis") {
    return await userCache.getTotalUsersCountFromRedisCache();
  } else {
    return await userService.getUsersCount();
  }
}

async function followers(userId: string): Promise<IFollowerData[]> {
  const cachedFollowers: IFollowerData[] = await followerCache.getFollowersFromRedis(`followers:${userId}`);
  const dbFollowers: IFollowerData[] = await followerService.getFollowers(new mongoose.Types.ObjectId(userId));

  return cachedFollowers.length ? cachedFollowers : dbFollowers;
}
export default userCtrl;
