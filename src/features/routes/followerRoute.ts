import express from "express";
const router = express.Router();
import followerCtrl from "../controllers/followController";
import { protect } from "./../middlewares/auth";

router.put("/follow/:id", protect, followerCtrl.follow);
router.put("/un_follow/:id", protect, followerCtrl.unFollow);
router.put("/block/:id", protect, followerCtrl.block);
router.put("/un_block/:id", protect, followerCtrl.unBlock);
router.get("/get_followers/:userId", protect, followerCtrl.getFollowers);
router.get("/get_followings", protect, followerCtrl.getFollowings);

export default router;
