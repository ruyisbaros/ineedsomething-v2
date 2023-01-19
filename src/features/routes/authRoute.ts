import express from "express";
const router = express.Router();
import authCtrl from "../controllers/authController";
import { userExist } from "../middlewares/isUserExist";
import { validateLogin, validateRegister, validatePasswordMail } from "../middlewares/validator";

router.post("/register", validateRegister, userExist, authCtrl.register)
router.post("/login", validateLogin, authCtrl.login)
router.get("/logout", authCtrl.logout)
router.post("/forgot_password", validatePasswordMail, authCtrl.forgot_password)
router.post("/reset_password/:token", authCtrl.reset_password)

export default router
