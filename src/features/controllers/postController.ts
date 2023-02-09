import { imageQueue } from "./../../shared/services/queues/image.queue";
import { postServices } from "./../../shared/services/db/post.services";
import HTTP_STATUS from "http-status-codes";
import { BadRequestError } from "./../../shared/globals/error.handler";
import { UploadApiResponse } from "cloudinary";
import { postQueue } from "./../../shared/services/queues/post.queue";
import { socketIOPostObject } from "./../../shared/sockets/post.socket";
import { PostCache } from "./../../shared/services/redis/post.cache";
import { IPostDocument } from "./../interfaces/post.interface";
import { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { uploadImage, uploadVideo } from "./../../shared/globals/cloudinary.upload";

const postCache: PostCache = new PostCache();

const postCtrl = {
  createNoImage: async (req: Request, res: Response): Promise<void> => {
    const { post, bgColor, privacy, gifUrl, profilePicture, feelings } = req.body;
    const postObjId: ObjectId = new ObjectId();

    const createdPost: IPostDocument = {
      _id: postObjId,
      userId: req.currentUser!.userId,
      username: req.currentUser!.username,
      email: req.currentUser!.email,
      avatarColor: req.currentUser!.avatarColor,
      profilePicture,
      post,
      bgColor,
      privacy,
      gifUrl,
      feelings,
      commentsCount: 0,
      imgId: "",
      imgVersion: "",
      videoId: "",
      videoVersion: "",
      createdAt: new Date(),
      reactions: {
        angry: 0,
        happy: 0,
        like: 0,
        love: 0,
        sad: 0,
        wow: 0,
      },
    } as IPostDocument;
    //Add Post the Socket Server
    socketIOPostObject.emit("add post", createdPost);
    //Add Post to Redis Cache
    await postCache.savePostToRedisCache({
      key: postObjId,
      currentUserId: `${req.currentUser!.userId}`,
      uId: `${req.currentUser!.uId}`,
      createdPost,
    });
    //Save Post DB
    postQueue.addPostJob("addNewPost", {
      key: req.currentUser!.userId,
      value: createdPost,
    });
    res.status(HTTP_STATUS.CREATED).json({ createdPost, message: "Post created successfully" });
  },
  createWithImage: async (req: Request, res: Response): Promise<void> => {
    const { post, bgColor, privacy, gifUrl, profilePicture, feelings, image } = req.body;
    //Upload image to Cloudinary
    const result: UploadApiResponse = (await uploadImage(image)) as UploadApiResponse;
    if (!result?.public_id) {
      throw new BadRequestError(result.message);
    }
    const postObjId: ObjectId = new ObjectId();

    const createdPost: IPostDocument = {
      _id: postObjId,
      userId: req.currentUser!.userId,
      username: req.currentUser!.username,
      email: req.currentUser!.email,
      avatarColor: req.currentUser!.avatarColor,
      profilePicture,
      post,
      bgColor,
      privacy,
      gifUrl,
      feelings,
      commentsCount: 0,
      imgId: result.public_id,
      imgVersion: result.version.toString(),
      videoId: "",
      videoVersion: "",
      createdAt: new Date(),
      reactions: {
        angry: 0,
        happy: 0,
        like: 0,
        love: 0,
        sad: 0,
        wow: 0,
      },
    } as IPostDocument;
    //Add Post the Socket Server
    socketIOPostObject.emit("add post", createdPost);
    //Add Post to Redis Cache
    await postCache.savePostToRedisCache({
      key: postObjId,
      currentUserId: `${req.currentUser!.userId}`,
      uId: `${req.currentUser!.uId}`,
      createdPost,
    });
    //Save Post DB
    postQueue.addPostJob("addNewPost", {
      key: req.currentUser!.userId,
      value: createdPost,
    });
    //Save image in DB
    imageQueue.addImageJob("createImg", {
      key: `${req.currentUser!.userId}`,
      imageId: result.public_id,
      imgVersion: result.version.toString(),
    });
    res.status(HTTP_STATUS.CREATED).json({ createdPost, message: "Post created with image successfully" });
  },
  createWithVideo: async (req: Request, res: Response): Promise<void> => {
    const { post, bgColor, privacy, gifUrl, profilePicture, feelings, video } = req.body;
    //Upload image to Cloudinary
    const result: UploadApiResponse = (await uploadVideo(video)) as UploadApiResponse;
    if (!result?.public_id) {
      throw new BadRequestError(result.message);
    }
    const postObjId: ObjectId = new ObjectId();

    const createdPost: IPostDocument = {
      _id: postObjId,
      userId: req.currentUser!.userId,
      username: req.currentUser!.username,
      email: req.currentUser!.email,
      avatarColor: req.currentUser!.avatarColor,
      profilePicture,
      post,
      bgColor,
      privacy,
      gifUrl,
      feelings,
      commentsCount: 0,
      imgId: "",
      imgVersion: "",
      videoId: result.public_id,
      videoVersion: result.version.toString(),
      createdAt: new Date(),
      reactions: {
        angry: 0,
        happy: 0,
        like: 0,
        love: 0,
        sad: 0,
        wow: 0,
      },
    } as IPostDocument;
    //Add Post the Socket Server
    socketIOPostObject.emit("add post", createdPost);
    //Add Post to Redis Cache
    await postCache.savePostToRedisCache({
      key: postObjId,
      currentUserId: `${req.currentUser!.userId}`,
      uId: `${req.currentUser!.uId}`,
      createdPost,
    });
    //Save Post DB
    postQueue.addPostJob("addNewPost", {
      key: req.currentUser!.userId,
      value: createdPost,
    });

    res.status(HTTP_STATUS.CREATED).json({ createdPost, message: "Post created with video successfully" });
  },
  getallPosts: async (req: Request, res: Response): Promise<void> => {
    const PAGE_SIZE = 3;
    const { page } = req.params;
    const skip: number = (parseInt(page) - 1) * PAGE_SIZE;
    const limit: number = PAGE_SIZE * parseInt(page);
    const newSkip: number = skip === 0 ? skip : skip + 1;
    let posts: IPostDocument[] = [];
    let totalPosts: number = 0;
    console.log("hello")
    console.log(req.currentUser)
    const cachedPosts: IPostDocument[] = await postCache.getPostsFromRedisCache("post", newSkip, limit);
    //console.log(cachedPosts)
    if (cachedPosts.length) {
      console.log("from cache");
      posts = cachedPosts;
      totalPosts = await postCache.getTotalPostsCountFromRedisCache();
    } else {
      console.log("from DB");
      posts = await postServices.getPosts({}, skip, limit, { createdAt: -1 });
      totalPosts = await postServices.getPostsCount();
    }

    res.status(HTTP_STATUS.OK).json({ posts, totalPosts, message: "All posts" });
  },
  getPostsWithImages: async (req: Request, res: Response): Promise<void> => {
    const PAGE_SIZE = 10;
    const { page } = req.params;
    const skip: number = (parseInt(page) - 1) * PAGE_SIZE;
    const limit: number = PAGE_SIZE * parseInt(page);
    const newSkip: number = skip === 0 ? skip : skip + 1;
    let posts: IPostDocument[] = [];
    let totalPosts: number = 0;
    const cachedPosts: IPostDocument[] = await postCache.getPostsWithImageFromRedisCache("post", newSkip, limit);
    posts = cachedPosts.length > 0 ? cachedPosts : await postServices.getPosts({ imgId: "$ne", gifUrl: "$ne" }, skip, limit, { createdAt: -1 });

    res.status(HTTP_STATUS.OK).json({
      posts,
      totalPosts: posts.length,
      message: "All posts with images",
    });
  },
  getPostsWithVideos: async (req: Request, res: Response): Promise<void> => {
    const PAGE_SIZE = 10;
    const { page } = req.params;
    const skip: number = (parseInt(page) - 1) * PAGE_SIZE;
    const limit: number = PAGE_SIZE * parseInt(page);
    const newSkip: number = skip === 0 ? skip : skip + 1;
    let posts: IPostDocument[] = [];
    let totalPosts: number = 0;
    const cachedPosts: IPostDocument[] = await postCache.getPostsWithVideoFromRedisCache("post", newSkip, limit);
    posts = cachedPosts.length > 0 ? cachedPosts : await postServices.getPosts({ videoId: "$ne" }, skip, limit, { createdAt: -1 });
    totalPosts = await postServices.getPostsCount();
    res.status(HTTP_STATUS.OK).json({
      posts,
      totalPosts,
      message: "All posts with videos",
    });
  },
  get: async (req: Request, res: Response): Promise<void> => {},
  getByUser: async (req: Request, res: Response): Promise<void> => {},
  updatePostImageCase: async (req: Request, res: Response): Promise<void> => {
    const { imgId, imgVersion } = req.body;
    if (imgVersion && imgId) {
      await postWithImageUpdate(req); //For posts which has already image at the beginning. User may want to update existing post image
    } else {
      const result: UploadApiResponse = await addImageToPost(req); //For posts which has no image at the beginning. User may want to add image to the post
      if (!result?.public_id) {
        throw new BadRequestError(result.message);
      }
    }
    res.status(HTTP_STATUS.OK).json({ message: "Post has been updated successfully" });
  },
  updatePostVideoCase: async (req: Request, res: Response): Promise<void> => {
    const { videoId, videoVersion } = req.body;
    if (videoVersion && videoId) {
      await postWithVideoUpdate(req); //For posts which has already video at the beginning. User may want to update existing post video
    } else {
      const result: UploadApiResponse = await addVideoToPost(req); //For posts which has no video at the beginning. User may want to add video to the post
      if (!result?.public_id) {
        throw new BadRequestError(result.message);
      }
    }
    res.status(HTTP_STATUS.OK).json({ message: "Post has been updated successfully" });
  },
  delete: async (req: Request, res: Response): Promise<void> => {
    //Add Post the Socket Server
    const { key, imageId } = req.params; //Post ID
    socketIOPostObject.emit("delete post", key);
    await postCache.deletePostFromRedisCache(key, `${req.currentUser!.userId}`);
    postQueue.addPostJob("removePost", {
      keyOne: key,
      keyTwo: req.currentUser!.userId,
    });
    //Remove relevant post image from DB
    imageQueue.addImageJob("removeImg", {
      imageId,
    });
    res.status(HTTP_STATUS.OK).json({ message: "Post has been deleted successfully" });
  },
};

/* --------------------------------HELPERS---------------------------------------------------- */
//For posts which has already image at the beginning. User may want to update existing post image
async function postWithImageUpdate(req: Request): Promise<void> {
  const { post, feelings, bgColor, privacy, gifUrl, imgId, imgVersion, profilePicture } = req.body;
  const updatedPost: IPostDocument = {
    post,
    feelings,
    bgColor,
    privacy,
    gifUrl,
    imgId,
    imgVersion,
    videoId: "",
    videoVersion: "",
    profilePicture,
  } as IPostDocument;
  const { key } = req.params; //Post ID
  const postUpdated: IPostDocument = await postCache.updatePostFromRedisCache(key, updatedPost);
  socketIOPostObject.emit("update post", postUpdated, "posts");
  postQueue.addPostJob("updatePost", { key, value: postUpdated });
}
//For posts which has no image at the beginning. User may want to add image to the post
async function addImageToPost(req: Request): Promise<UploadApiResponse> {
  const { post, feelings, bgColor, privacy, gifUrl, profilePicture, image } = req.body;
  //Upload image to Cloudinary
  const result: UploadApiResponse = (await uploadImage(image)) as UploadApiResponse;
  if (!result?.public_id) {
    return result;
  }
  const updatedPost: IPostDocument = {
    post,
    feelings,
    bgColor,
    privacy,
    gifUrl,
    profilePicture,
    videoId: "",
    videoVersion: "",
    imgId: result.public_id,
    imgVersion: result.version.toString(),
  } as IPostDocument;
  const { key } = req.params; //Post ID
  const postUpdated: IPostDocument = await postCache.updatePostFromRedisCache(key, updatedPost);
  socketIOPostObject.emit("update post", postUpdated, "posts");
  postQueue.addPostJob("updatePost", { key, value: postUpdated });

  return result;
}
//For posts which has already Video at the beginning. User may want to update existing post Video
async function postWithVideoUpdate(req: Request): Promise<void> {
  const { post, feelings, bgColor, privacy, gifUrl, videoId, videoVersion, profilePicture } = req.body;
  const updatedPost: IPostDocument = {
    post,
    feelings,
    bgColor,
    privacy,
    gifUrl,
    imgId: "",
    imgVersion: "",
    videoId,
    videoVersion,
    profilePicture,
  } as IPostDocument;
  const { key } = req.params; //Post ID
  const postUpdated: IPostDocument = await postCache.updatePostFromRedisCache(key, updatedPost);
  socketIOPostObject.emit("update post", postUpdated, "posts");
  postQueue.addPostJob("updatePost", { key, value: postUpdated });
}
//For posts which has no Video at the beginning. User may want to add Video to the post
async function addVideoToPost(req: Request): Promise<UploadApiResponse> {
  const { post, feelings, bgColor, privacy, gifUrl, profilePicture, video } = req.body;
  //Upload image to Cloudinary
  const result: UploadApiResponse = (await uploadVideo(video)) as UploadApiResponse;
  if (!result?.public_id) {
    return result;
  }
  const updatedPost: IPostDocument = {
    post,
    feelings,
    bgColor,
    privacy,
    gifUrl,
    profilePicture,
    imgId: "",
    imgVersion: "",
    videoId: result.public_id,
    videoVersion: result.version.toString(),
  } as IPostDocument;
  const { key } = req.params; //Post ID
  const postUpdated: IPostDocument = await postCache.updatePostFromRedisCache(key, updatedPost);
  socketIOPostObject.emit("update post", postUpdated, "posts");
  postQueue.addPostJob("updatePost", { key, value: postUpdated });

  return result;
}

export default postCtrl;
