import { ICommentDocument } from "./../../features/interfaces/comments.interface";
import { IReactionDocument } from "./../../features/interfaces/reaction.interface";
import { config } from "./../../config";
import { Server, Socket } from "socket.io";
import Logger from "bunyan";

const log: Logger = config.createLogger("socketConnection");

let socketIOPostObject: Server;

export class SocketIOPostHandler {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
    socketIOPostObject = io;
  }

  public listen(): void {
    this.io.on("connection", (socket: Socket) => {
      //Reactions
      socket.on("reaction", (reaction: IReactionDocument) => {
        this.io.emit("update like", reaction);
      });
      //Comments
      socket.on("comment", (data: ICommentDocument) => {
        this.io.emit("update comment", data);
      });
    });
  }
}

export { socketIOPostObject };
