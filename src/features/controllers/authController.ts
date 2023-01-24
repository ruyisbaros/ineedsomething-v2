import { imageQueue } from "./../../shared/services/queues/image.queue";
import { resetPasswordTemplate } from "./../../shared/services/templates/reset.password";
import { emailQueue } from "../../shared/services/queues/email.queue";
import { forgotPasswordTemplate } from "./../../shared/services/templates/forgot.password";
import { config } from "./../../config";
import { userQueue } from "../../shared/services/queues/user.queue";
import { authQueue } from "../../shared/services/queues/auth.queue";
import { UserCache } from "./../../shared/services/redis/user.cache";
import { IUserDocument, IResetPasswordParams } from "../interfaces/user.interface";
import { IAuthDocument } from "../interfaces/auth.interfaces";
import { UploadApiResponse } from "cloudinary";
import jwt from "jsonwebtoken";
import HTTP_STATUS from "http-status-codes";
import { ObjectId } from "mongodb";
import { Request, Response } from "express";
import AuthUser from "../models/authModel";
import User from "../models/userModel";
import generator from "../../shared/globals/integer.generator";
import { uploadImage } from "../../shared/globals/cloudinary.upload";
import { ISignUpData } from "../interfaces/auth.interfaces";
import { omit } from "lodash";
import moment from "moment";
import publicIp from "ip";
import crypto from "crypto";

const userCache: UserCache = new UserCache();

const authCtrl = {
  /* ---------------------------REGISTER------------------------------------------------------------- */
  register: async (req: Request, res: Response): Promise<ISignUpData | string | undefined | Object> => {
    const { email, username, avatarColor, avatarImage, password } = req.body;
    const uId = `${generator(12)}`;
    const userObjId: ObjectId = new ObjectId(); //To give image as ID for cloudinary. UserId will be same
    const authObjId: ObjectId = new ObjectId();

    const newAuth: IAuthDocument = new AuthUser({
      _id: authObjId,
      uId,
      email,
      username: username.toLowerCase(),
      avatarColor,
      password,
    });

    //Upload image to Cloudinary
    const result: UploadApiResponse = (await uploadImage(avatarImage, `${userObjId}`, true, true)) as UploadApiResponse;
    if (!result?.public_id) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Image not uploaded" });
    }
    //console.log(result.url)
    //Add to Redis
    const userDataForCache: IUserDocument = userRedisData(newAuth, userObjId);
    userDataForCache.profilePicture = `https://res.cloudinary.com/ruyisbaros/image/upload/v${result.version}/${userObjId}.jpg`;
    await userCache.saveToRedisCache(`${userObjId}`, uId, userDataForCache);

    //Add BullMQ queue JOb
    const omittedData = omit(userDataForCache, ["uId", "username", "password", "email", "avatarColor"]);
    authQueue.addAuthUserJob("addNewAuth", { value: newAuth });
    userQueue.addUserJob("addNewUser", { value: omittedData });
    //Create Token
    const jwtAccess: string = createAccessToken(newAuth, userObjId);
    if (jwtAccess) req.session = { jwt: jwtAccess };

    //Save image in DB
    imageQueue.addImageJob("createImg", {
      key: `${userObjId}`,
      imageId: result.public_id,
      imgVersion: result.version.toString(),
    });

    res.status(HTTP_STATUS.OK).json({ token: jwtAccess, user: userDataForCache, message: "You logged in successfully" });
  },
  /* --------------------------------------LOGIN------------------------------------------------------- */
  login: async (req: Request, res: Response): Promise<void> => {
    const { username, password } = req.body;
    const user: IAuthDocument | null = await AuthUser.findOne({ username });
    if (user) {
      const isPasswordMatch: boolean = await user.comparePassword(password);
      if (!isPasswordMatch) {
        res.status(HTTP_STATUS.NOT_ACCEPTABLE).json({ message: "Wrong credentials" });
      }
      const userSubject: IUserDocument = (await User.findOne({
        authId: user._id,
      }).select("-password")) as IUserDocument;
      const jwtAccess: string = createAccessToken(user, userSubject._id as ObjectId);
      req.session = { jwt: jwtAccess };
      const userDocument: IUserDocument = {
        ...userSubject,
        username: user.username,
        email: user.email,
        avatarColor: user.avatarColor,
        createdAt: user.createdAt,
        uId: user.uId,
      } as IUserDocument;

      res.status(HTTP_STATUS.OK).json({ token: jwtAccess, user: userDocument, message: "You logged in successfully" });
    } else {
      res.status(HTTP_STATUS.NOT_FOUND).json({ message: `User ${username} not found` });
    }
  },
  /* --------------------------------------LOGOUT------------------------------------------------------- */
  logout: async (req: Request, res: Response): Promise<void> => {
    req.session = null;
    res.status(HTTP_STATUS.OK).json({ message: "You have logged out successfully", user: {}, jwt: "" });
  },
  /* --------------------------------------FORGOT PASSWORD------------------------------------------------------- */
  forgot_password: async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;
    const user: IAuthDocument = (await AuthUser.findOne({
      email,
    })) as IAuthDocument;
    if (!user) {
      res.status(HTTP_STATUS.NOT_FOUND).json({ message: "No user found with this email" });
    }
    const randomBytes: Buffer = await Promise.resolve(crypto.randomBytes(15));
    const forgotPwdToken: string = randomBytes.toString("hex");

    (await AuthUser.findByIdAndUpdate(user._id, {
      passwordResetToken: forgotPwdToken,
      passwordResetExpires: Date.now() + 60 * 60 * 1000,
    })) as IAuthDocument;

    const link = `${config.ROOT_URL}/reset-password?token=${forgotPwdToken}`;
    const template = forgotPasswordTemplate.forgotPasswordTemplater(user.username!, link);
    emailQueue.addEmailJob("forgotPasswordMail", {
      template,
      receiverEmail: email,
      subject: "Reset your Password",
    });

    res.status(HTTP_STATUS.CREATED).json({ message: "Password reset link has been sent your email" });
  },
  /* --------------------------------------RESET PASSWORD------------------------------------------------------- */
  reset_password: async (req: Request, res: Response): Promise<void> => {
    const { password } = req.body;
    const { token } = req.params;
    const user: IAuthDocument = (await AuthUser.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() },
    })) as IAuthDocument;
    if (!user) {
      throw new Error("Invalid credentials!");
    }

    const hashedPassword = await user.hashPassword(password);
    await AuthUser.findByIdAndUpdate(user._id, {
      password: hashedPassword,
      passwordResetToken: "",
      passwordResetExpires: undefined,
    });
    const templateParams: IResetPasswordParams = {
      username: user.username!,
      email: user.email!,
      ipaddress: publicIp.address(),
      date: moment().format("DD-MM-YYYY HH:mm:ss"),
    };
    const template = resetPasswordTemplate.resetPasswordTemplater(templateParams);
    emailQueue.addEmailJob("forgotPasswordMail", {
      template,
      receiverEmail: user.email!,
      subject: "Password reset confirmation",
    });
    res.status(HTTP_STATUS.CREATED).json({ message: "Password has been updated successfully" });
  },
};

/* -----------------------------------HELPER FUNCTIONS------------------------------------------------------------- */
function createAccessToken(data: IAuthDocument, userId: ObjectId): string {
  return jwt.sign(
    {
      userId,
      email: data.email,
      username: data.username,
      uId: data.uId,
      avatarColor: data.avatarColor,
    },
    config.JWT_ACCESS_KEY
  );
}

function userRedisData(data: IAuthDocument, userObjectId: ObjectId): IUserDocument {
  const { _id, uId, email, username, avatarColor, password } = data;

  return {
    _id: userObjectId,
    authId: _id,
    uId,
    username,
    email,
    password,
    avatarColor,
    profilePicture: "",
    blocked: [],
    blockedBy: [],
    work: "",
    location: "",
    school: "",
    quote: "",
    bgImageId: "",
    bgImageVersion: "",
    followersCount: 0,
    followingCount: 0,
    postsCount: 0,
    notifications: {
      messages: true,
      reactions: true,
      comments: true,
      follows: true,
    },
    social: {
      facebook: "",
      instagram: "",
      twitter: "",
      youtube: "",
    },
  } as unknown as IUserDocument;
}
export default authCtrl;
