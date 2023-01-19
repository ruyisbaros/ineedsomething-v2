import { INotificationTemplate } from "../../../features/interfaces/notifications.interface";
import fs from "fs";
import ejs from "ejs";

class NotificationTemplate {
  public notificationTemplater(params: INotificationTemplate): string {
    const { header, message, username } = params;
    return ejs.render(
      fs.readFileSync(__dirname + "/notification.ejs", "utf8"),
      {
        username,
        header,
        message,
        image_url:
          "https://www.shutterstock.com/image-vector/icon-concept-about-wrong-password-600w-1909183087.jpg",
      }
    );
  }
}

export const notificationTemplate: NotificationTemplate =
  new NotificationTemplate();
