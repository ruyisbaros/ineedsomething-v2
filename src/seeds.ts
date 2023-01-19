import dotenv from "dotenv";
import { faker } from "@faker-js/faker";
import { floor, random } from "lodash";
import axios from "axios";
import { createCanvas } from "canvas";
import Logger from "bunyan";
import { config } from "./config";

const log: Logger = config.createLogger("seedData");
dotenv.config({});

function avatarColor(): string {
  const colors: string[] = [
    "#f44336",
    "#e91e63",
    "#2196f3",
    "#9c27b0",
    "#3f51b5",
    "#00bcd4",
    "#4caf50",
    "#ff9800",
    "#8bc34a",
    "#009688",
    "#03a9f4",
    "#cddc39",
    "#2962ff",
    "#448aff",
    "#84ffff",
    "#00e676",
    "#43a047",
    "#d32f2f",
    "#ff1744",
    "#ad1457",
    "#6a1b9a",
    "#1a237e",
    "#1de9b6",
    "#d84315",
  ];
  return colors[floor(random(0.9) * colors.length)];
}

function generateAvatar(text: string, backgroundColor: string, foregroundColor = "white") {
  const canvas = createCanvas(200, 200);
  const context = canvas.getContext("2d");

  context.fillStyle = backgroundColor;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.font = "normal 80px sans-serif";
  context.fillStyle = foregroundColor;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  return canvas.toDataURL("image/png");
}

async function generateSeedUserData(count: number): Promise<void> {
  let i = 0;

  try {
    for (i = 0; i < count; i++) {
      const username: string = faker.helpers.unique(faker.word.adjective, [8]);
      const color = avatarColor();
      const avatar = generateAvatar(username, color);

      const body = {
        username,
        email: faker.internet.email(),
        password: "123123",
        avatarColor: color,
        avatarImage: avatar,
      };
      log.info(`***ADDING USER TO DATABASE*** - ${i + 1} of ${count} - ${username}`);
      await axios.post(`${process.env.BEND_URL}/auth/register`, body);
    }
  } catch (error: any) {
    log.error(error?.response?.data);
  }
}

generateSeedUserData(10);
