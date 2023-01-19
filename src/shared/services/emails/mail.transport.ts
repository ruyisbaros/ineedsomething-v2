import nodemailer from "nodemailer";
import Mail from "nodemailer/lib/mailer";
import Logger from "bunyan";
import sendGridMail from "@sendgrid/mail";
import { config } from "../../../config";

interface IMailOptions {
  from: string;
  to: string;
  subject: string;
  html: string;
}

const log: Logger = config.createLogger("mailOptions");

sendGridMail.setApiKey(config.SENDGRID_API_KEY!);

class MailTransport {
  public async sendEmail(receiverMail: string, subject: string, body: string): Promise<void> {
    if (config.NODE_ENV === "development") {
      this.developmentMailService(receiverMail, subject, body);
    } else {
      this.productionMailService(receiverMail, subject, body);
    }
  }

  private async developmentMailService(receiverMail: string, subject: string, body: string): Promise<void> {
    const transporter: Mail = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: config.SENDER_EMAIL!, // generated ethereal user
        pass: config.SENDER_EMAIL_PASSWORD!, // generated ethereal password
      },
    });

    const mailOptions: IMailOptions = {
      from: `iNeedSomething <${config.SENDER_EMAIL}>`,
      to: receiverMail,
      subject,
      html: body,
    };

    try {
      await transporter.sendMail(mailOptions);
      log.info("Development E-mail sent successfully");
    } catch (error) {
      log.error("Error sending email: " + error);
      throw new Error("Error sending email: " + error);
    }
  }

  private async productionMailService(receiverMail: string, subject: string, body: string): Promise<void> {
    const mailOptions: IMailOptions = {
      from: `iNeedSomething <${config.SENDGRID_SENDER}>`,
      to: receiverMail,
      subject,
      html: body,
    };

    try {
      await sendGridMail.send(mailOptions);
      log.info("Production E-mail sent successfully");
    } catch (error) {
      log.error("Error sending email: " + error);
      throw new Error("Error sending email: " + error);
    }
  }
}

export const mailTransport: MailTransport = new MailTransport();
