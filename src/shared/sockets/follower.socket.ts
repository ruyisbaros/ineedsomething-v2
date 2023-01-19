import { IFollowers } from "./../../features/interfaces/follower.interface";
import { Server, Socket } from "socket.io";

let socketIOFollowerObject: Server;

export class SocketIOFollowerHandler {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
    socketIOFollowerObject = io;
  }

  public listen(): void {
    this.io.on("connection", (socket: Socket) => {
      //Follower
      socket.on("unFollow", (reaction: IFollowers) => {
        this.io.emit("remove follower", reaction);
      });
    });
  }
}

export { socketIOFollowerObject };
