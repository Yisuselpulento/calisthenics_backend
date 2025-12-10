import mongoose from "mongoose";

const { Schema } = mongoose;

const ComboElementSchema = new Schema(
  {
    userSkill: {
      type: Schema.Types.ObjectId,
      ref: "UserSkill",
      required: true,
    },

    // 🔥 NUEVO: referenciar el skill original
    skill: {
      type: Schema.Types.ObjectId,
      ref: "Skill",
      required: true,
    },

    variantKey: {
      type: String,
      required: true,
    },

    variantData: { type: Schema.Types.Mixed, required: true },

    hold: { type: Number, min: 0, default: 0 },
    reps: { type: Number, min: 0, default: 0 },
  },
  { _id: false }

);

ComboElementSchema.pre("validate", function () {
  if (!this.hold && !this.reps) {
    throw new Error("Cada variante debe tener hold o reps mayor a 0.");
  }
});

const ComboSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: ["static", "dynamic"],
      required: true,
    },
    video: { type: String, required: true },

    elements: {
      type: [ComboElementSchema],
      validate: [
        (val) => val.length >= 3,
        "Un combo debe tener al menos 3 skills",
      ],
      required: true,
    },

    totalEnergyCost: { type: Number, default: 0 },
    totalPoints: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Combo", ComboSchema);
