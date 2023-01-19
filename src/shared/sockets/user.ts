import { ILogin } from "./../../features/interfaces/user.interface";
import { ISocketData } from "./../../features/interfaces/user.interface";
import { Server, Socket } from "socket.io";

let socketIOUserObject: Server;
export const connectedUsersMap: Map<string, string> = new Map();

let users: string[] = [];
export class SocketIOUserHandler {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
    socketIOUserObject = io;
  }

  public listen(): void {
    this.io.on("connection", (socket: Socket) => {
      socket.on("setup", (data: ILogin) => {
        this.addClientToMap(data.userId, socket.id);
        this.addUser(data.userId);
        this.io.emit("user online", users);
      });
      socket.on("block user", (data: ISocketData) => {
        this.io.emit("blocked userId", data);
      });
      socket.on("unblock user", (data: ISocketData) => {
        this.io.emit("unblocked userId", data);
      });
      socket.on("disconnect", () => {
        this.removeClientFromMap(socket.id);
      });
    });
  }

  private addClientToMap(username: string, socketId: string): void {
    if (!connectedUsersMap.has(username)) {
      connectedUsersMap.set(username, socketId);
    }
  }

  private removeClientFromMap(socketId: string): void {
    if (Array.from(connectedUsersMap.values()).includes(socketId)) {
      const disconnectedUser: [string, string] = [...connectedUsersMap].find((user: [string, string]) => user[1] === socketId) as [string, string];
      connectedUsersMap.delete(disconnectedUser[0]);
      this.removeUser(disconnectedUser[0]);
      this.io.emit("user online", users);
    }
  }

  private addUser(username: string): void {
    users.push(username);
    //prevent duplicate
    users = [...new Set(users)];
  }

  private removeUser(username: string): void {
    users = users.filter((name) => name !== username);
  }
}

export { socketIOUserObject };
