import express from "express";
const router = express.Router();
import { protect } from "./../middlewares/auth";
import imageCtrl from "../controllers/imageController";
import { validatePostWithImage } from "./../middlewares/validator";

router.post("/profile_img", protect, validatePostWithImage, imageCtrl.addProfileImage);
router.post("/bg_img", protect, validatePostWithImage, imageCtrl.addBackgroundImage);
router.delete("/delete/:imageId", protect, imageCtrl.deleteAnyImage);
router.delete("/delete_bg/:bgImageId", protect, imageCtrl.deleteBgImage);
router.get("/get/:userId", protect, imageCtrl.getUserImages);

export default router;
