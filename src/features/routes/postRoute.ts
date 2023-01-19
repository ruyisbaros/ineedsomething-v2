import express from "express";
const router = express.Router();
import { validatePostWithVideo, validatePostWithImage } from "../middlewares/validator";
import postCtrl from "../controllers/postController";
import { protect } from "./../middlewares/auth";

router.post("/create", protect, postCtrl.createNoImage);
router.post("/create_with_image", protect, validatePostWithImage, postCtrl.createWithImage);
router.post("/create_with_video", protect, validatePostWithVideo, postCtrl.createWithVideo);
router.get("/get_all/:page", protect, postCtrl.getallPosts);
router.get("/get_all_with_image/:page", protect, postCtrl.getPostsWithImages);
router.get("/get_all_with_video/:page", protect, postCtrl.getPostsWithVideos);
router.delete("/delete/:key/:imageId", protect, postCtrl.delete);
router.put("/update_img_case/:key", protect, postCtrl.updatePostImageCase);
router.put("/update_video_case/:key", protect, postCtrl.updatePostVideoCase);

export default router;
