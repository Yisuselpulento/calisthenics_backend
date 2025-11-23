import mongoose from "mongoose";

const { Schema } = mongoose;

const TeamSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    avatar: {
      type: String, 
    },

    videoProfile: String,
  },
  { timestamps: true }
);

export default mongoose.model("Team", TeamSchema);
