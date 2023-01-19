import mongoose, { model, Model, Schema } from 'mongoose';
import { IReactionDocument } from '../interfaces/reaction.interface';

const reactionSchema: Schema = new Schema({
    postId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Post', index: true },
    type: { type: String, default: '' },
    username: { type: String, default: '' },
    avatarColor: { type: String, default: '' },
    profilePicture: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now() },
});

const ReactionModel: Model<IReactionDocument> = model<IReactionDocument>('Reaction', reactionSchema, 'Reaction');

export { ReactionModel };
