import dotenv from "dotenv";
dotenv.config({});
import bunyan from "bunyan";
import cloudinary from "cloudinary";

class Config {
  public NODE_ENV: string | undefined;
  public ROOT_URL: string | undefined;
  public MONGO_URL: string | undefined;
  public JWT_ACCESS_KEY: string | "";
  public JWT_REFRESH_KEY: string | "";
  public KEY_ONE: string | undefined;
  public KEY_TWO: string | undefined;
  public CLOUD_NAME: string | undefined;
  public CLOUD_KEY: string | undefined;
  public CLOUD_SECRET: string | undefined;
  public SENDER_EMAIL: string | undefined;
  public SENDER_EMAIL_PASSWORD: string | undefined;
  public SENDGRID_API_KEY: string | undefined;
  public SENDGRID_SENDER: string | undefined;
  public MAIL_CLIENT_ID: string | undefined;
  public MAIL_CLIENT_SECRET: string | undefined;
  public MAIL_REFRESH_TOKEN: string | undefined;
  public SENDER_EMAIL_ACCOUNT: string | undefined;
  public REDIS_HOST: string | undefined;
  public EC2_URL: string | undefined;

  constructor() {
    this.NODE_ENV = process.env.NODE_ENV;
    this.ROOT_URL = process.env.ROOT_URL;
    this.MONGO_URL = process.env.MONGO_URL;
    this.JWT_ACCESS_KEY = process.env.JWT_ACCESS_KEY!;
    this.JWT_REFRESH_KEY = process.env.JWT_REFRESH_KEY!;
    this.KEY_ONE = process.env.KEY_ONE;
    this.KEY_TWO = process.env.KEY_TWO;
    this.CLOUD_NAME = process.env.CLOUD_NAME;
    this.CLOUD_KEY = process.env.CLOUD_KEY;
    this.CLOUD_SECRET = process.env.CLOUD_SECRET;
    this.MAIL_CLIENT_ID = process.env.MAIL_CLIENT_ID;
    this.MAIL_CLIENT_SECRET = process.env.MAIL_CLIENT_SECRET;
    this.MAIL_REFRESH_TOKEN = process.env.MAIL_REFRESH_TOKEN;
    this.SENDER_EMAIL_ACCOUNT = process.env.SENDER_EMAIL_ACCOUNT;
    this.REDIS_HOST = process.env.REDIS_HOST;
    this.SENDER_EMAIL = process.env.SENDER_EMAIL;
    this.SENDER_EMAIL_PASSWORD = process.env.SENDER_EMAIL_PASSWORD;
    this.SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
    this.SENDGRID_SENDER = process.env.SENDGRID_SENDER;
    this.EC2_URL = process.env.EC2_URL;
  }

  public createLogger(name: string): bunyan {
    return bunyan.createLogger({ name, level: "debug" });
  }

  public checkConfigValues(): void {
    for (const [key, value] of Object.entries(this)) {
      if (value === undefined || value === null || value === "") {
        throw new Error(`${key} is not defined`);
      }
    }
  }

  public cloudinaryConfig(): void {
    cloudinary.v2.config({
      cloud_name: this.CLOUD_NAME,
      api_key: this.CLOUD_KEY,
      api_secret: this.CLOUD_SECRET,
    });
  }
}

export const config: Config = new Config();
