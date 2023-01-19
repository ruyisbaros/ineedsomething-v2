import express from "express";
const router = express.Router();
import { protect } from './../middlewares/auth';
import commentsCtrl from "../controllers/commentsController";
import { validateCommentOps } from "../middlewares/validator";


router.post('/add', protect, validateCommentOps, commentsCtrl.create)
router.get('/post_comments/:postId', protect, commentsCtrl.getCommentsOfPost)
router.get('/comment_names/:postId', protect, commentsCtrl.getCommentNames)
router.get('/single_comment/:postId/:commentId', protect, commentsCtrl.getSingleComment)


export default router