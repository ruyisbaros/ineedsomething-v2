import { IResetPasswordParams } from '../../../features/interfaces/user.interface';
import fs from 'fs';
import ejs from "ejs"


class ResetPasswordTemplate {
    public resetPasswordTemplater(templateParams: IResetPasswordParams): string {
        const { email, date, ipaddress, username } = templateParams
        return ejs.render(fs.readFileSync(__dirname + "/reset.password.ejs", "utf8"), {
            email,
            ipaddress,
            date,
            username,
            image_url: "https://www.shutterstock.com/image-vector/lock-reload-600w-687869377.jpg"
        })
    }
}

export const resetPasswordTemplate: ResetPasswordTemplate = new ResetPasswordTemplate()