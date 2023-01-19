import express from "express";
const router = express.Router();
import userCtrl from "../controllers/userController";
import { protect } from "../middlewares/auth";

router.get("/get_one/:id", userCtrl.getOne);
router.get("/is_online", protect, userCtrl.currentUser);
router.get("/get_all/:page", protect, userCtrl.getAll);
router.get("/get_me", protect, userCtrl.getMe);
router.get("/profile_posts/:userId/:username/:uId", protect, userCtrl.getProfileWithPosts);
router.get("/follow_offers", protect, userCtrl.getRandomUserOffersToFollow);
router.get("/search_users/:query", protect, userCtrl.searchUsers);
router.put("/update_password", protect, userCtrl.changePassword);
router.put("/update_user_info", protect, userCtrl.updateBasicUserInfo);
router.put("/update_socials", protect, userCtrl.updateUserSocials);
router.put("/update_nots_receive", protect, userCtrl.updateNotificationReceive);

export default router;
