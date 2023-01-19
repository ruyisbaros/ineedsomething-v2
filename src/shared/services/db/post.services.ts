import { IPostDocument, IGetPostsQuery } from "./../../../features/interfaces/post.interface";
import Post from "../../../features/models/postModel";
import User from "../../../features/models/userModel";

class PostServices {
  public async getPosts(query: IGetPostsQuery, skip = 0, limit = 0, sort: Record<string, 1 | -1>): Promise<IPostDocument[]> {
    let postQuery = {};
    if (query?.imgId && query?.gifUrl) {
      postQuery = { $or: [{ imgId: { $ne: "" } }, { gifUrl: { $ne: "" } }] };
    } else if (query?.videoId) {
      postQuery = { videoId: { $ne: "" } };
    } else {
      postQuery = query;
    }
    const posts: IPostDocument[] = await Post.aggregate([{ $match: postQuery }, { $sort: sort }, { $skip: skip }, { $limit: limit }]);
    return posts;
  }

  public async getPostsCount(): Promise<number> {
    const count: number = await Post.find({}).countDocuments();

    return count;
  }

  public async deletePost(postId: string, userId: string): Promise<void> {
    const deletePost = Post.findByIdAndDelete(postId);
    //Delete reactions and comments here later
    const updateUserPostsCount = User.findByIdAndUpdate(userId, { $inc: { postsCount: -1 } });

    await Promise.all([deletePost, updateUserPostsCount]);
  }

  public async updatePost(postId: string, updatedPost: IPostDocument): Promise<void> {
    const postToUpdate = Post.findByIdAndUpdate(postId, { $set: updatedPost });
    await Promise.all([postToUpdate]);
  }
}

export const postServices: PostServices = new PostServices();
