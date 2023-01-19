import { hash, compare } from 'bcrypt';
import { IAuthDocument } from '../interfaces/auth.interfaces';
import { model, Model, Schema } from 'mongoose';

const SALT_ROUND = 10;

const authSchema: Schema = new Schema(
    {
        username: { type: String, required: true, trim: true, unique: true },
        uId: { type: String, required: true },
        email: { type: String, required: true, trim: true, unique: true },
        password: { type: String, required: true },
        avatarColor: { type: String, default: "teal" },
        createdAt: { type: Date, default: Date.now },
        passwordResetToken: { type: String, default: '' },
        passwordResetExpires: { type: Number }
    }
);

authSchema.pre('save', async function (this: IAuthDocument, next: () => void) {
    this.password = await hash(this.password as string, SALT_ROUND);

    next();
});

authSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
    //const hashedPassword: string = (this as unknown as IAuthDocument).password!;
    return compare(password, this.password);
};

authSchema.methods.hashPassword = async function (password: string): Promise<string> {
    return hash(password, SALT_ROUND);
};

const AuthModel: Model<IAuthDocument> = model<IAuthDocument>('Auth', authSchema, 'Auth');
export default AuthModel;
