import { Request, Response, NextFunction } from "express";
import HTTP_STATUS from "http-status-codes";

export const validateRegister = async (req: Request, res: Response, next: NextFunction) => {
  const { username, email, password, avatarImage } = req.body;
  //console.log(avatarImage)
  const errors = [];
  if (!username) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Please enter your username" });
  } else if (username.length > 20) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Username must be lower than 20 chars" });

  }

  if (!email) {

    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Please enter your email!" });
  } else if (!validateEmail(email)) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Invalid email!" });
  }

  if (!avatarImage) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Avatar image can not be empty!" });
  } 

  if (!password) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Please enter your password!" });
  } else if (password.length < 4) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Password field must be min 4 chars!" });

  }

  next();
};

export const validateLogin = async (req: Request, res: Response, next: NextFunction) => {
  const { username, password } = req.body;
  const errors = [];

  if (!username) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Please enter your username!" });
  } else if (username.length > 20) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Username field can't be longer than 20 chars!" });

  }

  if (!password) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Please enter your password!" });
  } else if (password.length < 4) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Password field must be min 4 chars!" });
  }

  next();
};
export const validatePasswordMail = async (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;
  const errors = [];
  if (!email) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Please enter your email!" });
  } else if (!validateEmail(email)) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Invalid email!" });
  }
  next();
};
export const validatePostWithImage = async (req: Request, res: Response, next: NextFunction) => {
  const { image } = req.body;
  const errors = [];
  if (!image) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Image can not be empty!" });
  }
  next();
};

export const validatePostWithVideo = async (req: Request, res: Response, next: NextFunction) => {
  const { video } = req.body;
  const errors = [];
  if (!video) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Video can not be empty!" });
  }
  next();
};

export const validateCommentOps = async (req: Request, res: Response, next: NextFunction) => {
  const { userTo, postId, comment } = req.body;
  const errors = [];
  if (!comment) {
    throw new Error("Please enter your comment!");
  }
  if (!postId) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Please enter postId!" });
  }
  if (!userTo) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Please enter userTo!" });
  }
  next();
};
export const validateChatOps = async (req: Request, res: Response, next: NextFunction) => {
  const { receiverId, receiverUsername } = req.body;
  const errors = [];
  if (!receiverId) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Please enter your receiverId!" });
  }
  if (!receiverUsername) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Please enter receiverUsername!" });
  }
  next();
};

export function validateEmail(email: string) {
  const re =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}
