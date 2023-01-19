import { Request, Response, NextFunction } from "express";

export const validateRegister = async (req: Request, res: Response, next: NextFunction) => {
  const { username, email, password } = req.body;

  const errors = [];
  if (!username) {
    errors.push("Please enter your username!");
  } else if (username.length > 20) {
    errors.push("Username field can't be longer than 20 chars!");
  }

  if (!email) {
    errors.push("Please enter your email!");
  } else if (!validateEmail(email)) {
    errors.push("Invalid email!");
  }

  if (!password) {
    errors.push("Please enter your password!");
  } else if (password.length < 4) {
    errors.push("Password field must be min 4 chars!");
  }

  if (errors.length > 0) {
    return res.status(400).json(errors);
  } else {
    next();
  }
};

export const validateLogin = async (req: Request, res: Response, next: NextFunction) => {
  const { username, password } = req.body;
  const errors = [];

  if (!username) {
    errors.push("Please enter your username!");
  } else if (username.length > 20) {
    errors.push("Username field can't be longer than 20 chars!");
  }

  if (!password) {
    errors.push("Please enter your password!");
  } else if (password.length < 4) {
    errors.push("Password field must be min 4 chars!");
  }

  if (errors.length > 0) {
    return res.status(400).json(errors);
  } else {
    next();
  }
};
export const validatePasswordMail = async (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;
  const errors = [];
  if (!email) {
    errors.push("Please enter your email!");
  } else if (!validateEmail(email)) {
    errors.push("Invalid email!");
  }
  if (errors.length > 0) {
    return res.status(400).json(errors);
  } else {
    next();
  }
};
export const validatePostWithImage = async (req: Request, res: Response, next: NextFunction) => {
  const { image } = req.body;
  const errors = [];
  if (!image) {
    errors.push("Please upload your image!");
  }
  if (errors.length > 0) {
    return res.status(400).json(errors);
  } else {
    next();
  }
};

export const validatePostWithVideo = async (req: Request, res: Response, next: NextFunction) => {
  const { video } = req.body;
  const errors = [];
  if (!video) {
    errors.push("Please upload your video!");
  }
  if (errors.length > 0) {
    return res.status(400).json(errors);
  } else {
    next();
  }
};

export const validateCommentOps = async (req: Request, res: Response, next: NextFunction) => {
  const { userTo, postId, comment } = req.body;
  const errors = [];
  if (!comment) {
    errors.push("Please enter your comment!");
  }
  if (!postId) {
    errors.push("Please enter postId!");
  }
  if (!userTo) {
    errors.push("Please enter userTo!");
  }
  if (errors.length > 0) {
    return res.status(400).json(errors);
  } else {
    next();
  }
};
export const validateChatOps = async (req: Request, res: Response, next: NextFunction) => {
  const { receiverId, receiverUsername } = req.body;
  const errors = [];
  if (!receiverId) {
    errors.push("Please enter your receiverId!");
  }
  if (!receiverUsername) {
    errors.push("Please enter receiverUsername!");
  }
  if (errors.length > 0) {
    return res.status(400).json(errors);
  } else {
    next();
  }
};

export function validateEmail(email: string) {
  const re =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}
