import express from "express";
const router = express.Router();
import reactionCtrl from "../controllers/reactionController";
import { protect } from './../middlewares/auth';
router.post("/add", protect, reactionCtrl.create)
router.get("/post_reactions/:postId", protect, reactionCtrl.getPostReactions)
router.get("/pr_user/:username/:postId", protect, reactionCtrl.getSingleReactionByUser)
router.get("/pr_user_all/:username", protect, reactionCtrl.getUsersPostReactions)
router.delete("/delete/:postId/:previousReaction/:postReactions", protect, reactionCtrl.delete)

export default router