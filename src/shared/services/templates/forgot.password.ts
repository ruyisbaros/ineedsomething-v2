import fs from 'fs';
import ejs from "ejs"


class ForgotPasswordTemplate {
    public forgotPasswordTemplater(username: string, resetLink: string): string {
        return ejs.render(fs.readFileSync(__dirname + "/forgot.password.ejs", "utf8"), {
            username,
            resetLink,
            image_url: "https://www.shutterstock.com/image-vector/icon-concept-about-wrong-password-600w-1909183087.jpg"
        })
    }
}

export const forgotPasswordTemplate: ForgotPasswordTemplate = new ForgotPasswordTemplate()