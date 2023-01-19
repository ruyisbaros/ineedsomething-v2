import { config } from './../../config';
import { Request, Response, NextFunction } from "express";
import User from "../models/userModel"
import jwt from "jsonwebtoken";
import { AuthPayload } from "../interfaces/auth.interfaces"
import { IUserDocument } from '../interfaces/user.interface';




export const protect = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.session?.jwt;
        //const token = req.headers.authorization;
        //console.log(token)
        if (!token) {
            return res.status(401).json({ message: "You should Sign In!" });
        }
        const decoded: AuthPayload = jwt.verify(token, config.JWT_ACCESS_KEY!) as AuthPayload;
        if (!decoded) {
            return res.status(401).json({ message: "Authentication error" });
        }
        req.currentUser = decoded

        next()
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}

