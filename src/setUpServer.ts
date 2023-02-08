import { SocketIOUserHandler } from "./shared/sockets/user";
import { SocketIOFollowerHandler } from "./shared/sockets/follower.socket";
import { SocketIOPostHandler } from "./shared/sockets/post.socket";
import { Application, json, urlencoded, Response, Request, NextFunction } from "express";
import http from "http";
import cors from "cors";
import cookieSession from "cookie-session";
import helmet from "helmet";
import HTTP_STATUS from "http-status-codes";
import { Server } from "socket.io";
import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";
import hpp from "hpp";
import compression from "compression";
import morgan from "morgan";
import Logger from "bunyan";
import apiStats from "swagger-stats";
import "express-async-errors";
import { config } from "./config";
import { CustomError, IErrorResponse } from "./shared/globals/error.handler";
import Routes from "./features/routes/index";
import { serverAdapter } from "./shared/services/queues/base.queue";
import { SocketIONotificationHandler } from "./shared/sockets/notification";
import { SocketIOImageHandler } from "./shared/sockets/image";
import { SocketIOChatHandler } from "./shared/sockets/chat";
import { healthRoutes } from "./features/routes/healthRoutes";

const SERVER_PORT = 5000;
const log: Logger = config.createLogger("server");

export class MyServer {
  private app: Application;

  constructor(app: Application) {
    this.app = app;
  }
  public start(): void {
    this.securityMiddleware(this.app);
    this.standardMiddleware(this.app);
    this.routesMiddleware(this.app);
    this.apiMonitoring(this.app);
    this.globalErrorMiddleware(this.app);
    this.startServer(this.app);
  }

  private apiMonitoring(app: Application): void {
    app.use(
      apiStats.getMiddleware({
        uriPath: "/api-monitoring",
      })
    );
  }

  private securityMiddleware(app: Application): void {
    app.set("trust proxy", 1)
    app.use(
      cookieSession({
        name: "session",
        keys: [config.KEY_ONE!, config.KEY_TWO!],
        maxAge: 7 * 24 * 60 * 60 * 1000, //7 days
        secure: config.NODE_ENV === "production",
        sameSite: "none"  //use for production
      })
    );
    app.use(helmet());
    app.use(hpp());
    app.use(
      cors({
        origin: config.ROOT_URL,
        credentials: true,
        methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
        optionsSuccessStatus: 200,
      })
    );
  }
  private standardMiddleware(app: Application): void {
    app.use(compression());
    app.use(morgan("dev"));
    app.use(json({ limit: "50mb" }));
    app.use(urlencoded({ extended: true, limit: "50mb" }));
  }
  private routesMiddleware(app: Application): void {
    app.use("/queues", serverAdapter.getRouter());
    app.use("", healthRoutes.health());
    app.use("", healthRoutes.env());
    app.use("", healthRoutes.instance());
    app.use("", healthRoutes.fiboRoutes());

    app.use("/api/v1/auth", Routes.authRouter);
    app.use("/api/v1/user", Routes.userRouter);
    app.use("/api/v1/posts", Routes.postRouter);
    app.use("/api/v1/post/reactions", Routes.reactionsRouter);
    app.use("/api/v1/post/comments", Routes.commentsRouter);
    app.use("/api/v1/user/followers", Routes.followerRouter);
    app.use("/api/v1/notifications", Routes.notificationRouter);
    app.use("/api/v1/images", Routes.imageRouter);
    app.use("/api/v1/chat", Routes.chatRouter);
  }
  private globalErrorMiddleware(app: Application): void {
    app.all("*", (req: Request, res: Response) => {
      res.status(HTTP_STATUS.NOT_FOUND).json({ message: `${req.originalUrl} not found` });
    });

    app.use((err: IErrorResponse, _req: Request, res: Response, next: NextFunction) => {
      log.error(err);
      if (err instanceof CustomError) {
        return res.status(err.statusCode).json(err.serializeErrors());
      }
      next();
    });
  }

  private async startServer(app: Application): Promise<void> {
    if (!config.JWT_ACCESS_KEY) {
      throw new Error(`JWT Access Key not specified`);
    }
    try {
      const server: http.Server = new http.Server(app);
      const socketIO: Server = await this.createSocketIO(server);
      this.startHttpServer(server);
      this.socketIOConnections(socketIO);
    } catch (error: any) {
      log.error(error.message);
    }
  }

  private async createSocketIO(httpServer: http.Server): Promise<Server> {
    const io: Server = new Server(httpServer, {
      cors: {
        origin: config.ROOT_URL,
        methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
      },
    });
    const pubClient = createClient({ url: config.REDIS_HOST });
    const subClient = pubClient.duplicate();
    await Promise.all([subClient.connect(), pubClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    return io;
  }
  private startHttpServer(httpServer: http.Server): void {
    log.info(`Worker with process id of: ${process.pid} has started.`);
    log.info(`Server started with process: ${process.pid}`);
    httpServer.listen(SERVER_PORT, () => {
      log.info(`Server listening on port ${SERVER_PORT}`);
    });
  }

  private socketIOConnections(io: Server): void {
    const postSocketHandler: SocketIOPostHandler = new SocketIOPostHandler(io);
    const followerSocketHandler: SocketIOFollowerHandler = new SocketIOFollowerHandler(io);
    const userSocketHandler: SocketIOUserHandler = new SocketIOUserHandler(io);
    const notificationSocketHandler: SocketIONotificationHandler = new SocketIONotificationHandler();
    const imageSocketHandler: SocketIOImageHandler = new SocketIOImageHandler();
    const chatSocketHandler: SocketIOChatHandler = new SocketIOChatHandler(io);

    postSocketHandler.listen();
    followerSocketHandler.listen();
    userSocketHandler.listen();
    notificationSocketHandler.listen(io);
    imageSocketHandler.listen(io);
    chatSocketHandler.listen();
  }
}
