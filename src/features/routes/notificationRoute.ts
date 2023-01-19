import express from "express";
const router = express.Router();
import { protect } from "./../middlewares/auth";
import notificationCtrl from "../controllers/notificationController";

router.put("/update/:id", protect, notificationCtrl.update);
router.delete("/delete/:id", protect, notificationCtrl.delete);
router.get("/get", protect, notificationCtrl.get);

export default router;
