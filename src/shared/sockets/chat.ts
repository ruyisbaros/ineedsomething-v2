import { connectedUsersMap } from "./user";
import { ISenderReceiver } from "./../../features/interfaces/chat.interfaces";
import { Server, Socket } from "socket.io";

let socketIOChatObject: Server;

export class SocketIOChatHandler {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
    socketIOChatObject = io;
  }

  public listen(): void {
    this.io.on("connection", (socket: Socket) => {
      //Chat
      socket.on("join room", (users: ISenderReceiver) => {
        const { senderName, receiverName } = users;
        const senderSocketId: string = connectedUsersMap.get(senderName) as string;
        const receiverSocketId: string = connectedUsersMap.get(receiverName) as string;
        socket.join(senderSocketId);
        socket.join(receiverSocketId);
      });
    });
  }
}

export { socketIOChatObject };
