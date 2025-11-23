import mongoose from "mongoose";

const { Schema } = mongoose;

const ComboElementSchema = new Schema(
  {
    userSkill: {
      type: Schema.Types.ObjectId,
      ref: "UserSkill",
      required: true,
    },

    hold: {
      type: Number,
      required: true,
      min: 3, 
    },
  },
  { _id: false }
);

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
