import { Request, Response, NextFunction } from "express";
import User from "../models/authModel"

export const userExist = async (req: Request, res: Response, next: NextFunction) => {
    const { username, email } = req.body
    //const user = await User.findOne({ $or: [{ username }, { email }] })
    const user = await User.findOne({ username })
    const user2 = await User.findOne({ email })

    if (user) {
        return res.status(400).json({ message: `User with: ${username} username already exists` })
    }
    if (user2) {
        return res.status(400).json({ message: `User with: ${email} email already exists` })
    }

    next()
}