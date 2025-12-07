import mongoose from "mongoose";

const { Schema } = mongoose;

const ReportSchema = new Schema(
  {
    reporter: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    targetType: {
      type: String,
      enum: ["User", "UserSkill", "Combo", "Team"], 
      required: true,
    },

    target: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: "targetType", 
    },
     variantInfo: {
        variantKey: String,
        fingers: Number,
      }, 
    reason: {
      type: String,
      enum: [
        "identity_fraud",
        "explicit_content",
        "violence_content",
        "wrong_skill",
        "copyright_violation",
        "hate_speech",
        "spam",
        "other",
      ],
      required: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: ["pending", "reviewed", "action_taken"],
      default: "pending",
    },

    moderatorNote: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Report", ReportSchema);
