import { config } from "./config";
import { MyServer } from "./setUpServer";
import express, { Express } from "express";
import Mongo_Connection from "./setUpDb";
import Logger from "bunyan";

const log: Logger = config.createLogger("app");

class Application {
  public initialize(): void {
    config.checkConfigValues();
    config.cloudinaryConfig();
    Mongo_Connection();
    const app: Express = express();
    const server: MyServer = new MyServer(app);
    server.start();
    this.handleExit();
  }

  private handleExit(): void {
    process.on("uncaughtException", (error: Error) => {
      log.error("Uncaught exception", error);
      this.shutDownProperly(1);
    });

    process.on("unhandledRejection", (error: Error) => {
      log.error("Unhandled rejection ", error);
      this.shutDownProperly(2);
    });

    process.on("SIGTERM", () => {
      log.error("Signal exception -SIGTERM-");
      this.shutDownProperly(2);
    });

    process.on("SIGINT", () => {
      log.error("Signal exception -SIGINT-");
      this.shutDownProperly(2);
    });

    process.on("exit", () => {
      log.info("Exiting");
    });
  }

  private shutDownProperly(exitCode: number): void {
    Promise.resolve()
      .then(() => {
        log.info("Shutting down completed");
        process.exit(exitCode);
      })
      .catch((error: any) => {
        log.error("Failed to shut down ", error);
        process.exit(exitCode);
      });
  }
}

const application: Application = new Application();
application.initialize();
