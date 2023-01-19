import express from "express";
const router = express.Router();
import { protect } from "./../middlewares/auth";
import { validateChatOps } from "./../middlewares/validator";
import chatCtrl from "../controllers/chatController";

router.post("/message", protect, validateChatOps, chatCtrl.sendMessage);
router.post("/add_users", protect, chatCtrl.addChatUsersCache);
router.post("/remove_users", protect, chatCtrl.removeChatUsersCache);
router.get("/last_messages", protect, chatCtrl.getUsersLastMessage);
router.get("/between_messages/:id", protect, chatCtrl.getMessagesBetweenTwoUsers);
router.put("/mark_deleted", protect, chatCtrl.markMessageAsDeleted);
router.put("/mark_read", protect, chatCtrl.markMessagesAsRead);
router.put("/msg_reaction", protect, chatCtrl.addMessageReaction);

export default router;
