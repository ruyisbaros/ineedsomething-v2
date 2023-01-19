import mongoose from "mongoose";
import { config } from "./config";
import Logger from "bunyan";
import { redisConnection } from "./shared/services/redis/redis.connection";
const log: Logger = config.createLogger("setUpMongoose");
export default () => {
  const connect = () => {
    mongoose.set("strictQuery", false);
    mongoose
      .connect(config.MONGO_URL!)
      .then(() => {
        log.info("Db connection done");
        redisConnection.connect();
      })
      .catch((e) => {
        log.error("Something went wrong with error:" + e);
        return process.exit(1);
      });
  };
  connect();
  mongoose.connection.on("disconnected", connect);
};
