import mongoose from "mongoose";
const { Schema } = mongoose;

const UserSkillVariantSchema = new Schema(
  {
    variantKey: { type: String, required: true },
    fingers: {
      type: Number,
      required: true,
      enum: [1, 2, 5],
      default: 5,
    },
    video: { type: String, required: true },
  },
  { _id: false }
);

const UserSkillSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    skill: {
      type: Schema.Types.ObjectId,
      ref: "Skill",
      required: true,
    },

    variants: {
      type: [UserSkillVariantSchema],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.model("UserSkill", UserSkillSchema);
