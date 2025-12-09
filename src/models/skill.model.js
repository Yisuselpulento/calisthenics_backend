import mongoose from "mongoose";

const { Schema } = mongoose;

/* ---------------------------- VARIANT SCHEMA ---------------------------- */

const VariantSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },

    variantKey: { type: String, required: true, trim: true },

    type: {
      type: String,
      enum: ["static", "dynamic", "basic"],
      required: true,
    },

    stats: {
      pointsPerSecond: { type: Number, default: 0 },
      energyPerSecond: { type: Number, default: 0 },
      pointsPerRep: { type: Number, default: 0 },
      energyPerRep: { type: Number, default: 0 },
    },

    staticAu: { type: Number, default: 0 },
    dynamicAu: { type: Number, default: 0 },

    difficulty: {
      type: String,
      enum: ["basic", "intermediate", "advanced", "elite", "legendary"],
      default: "basic",
      trim: true,
    },
    progressionLevel: {
      type: Number,
      required: true,
      min: 1,
      max: 4,
    },
  },
  { timestamps: true }
);

/* ----------------------------- SKILL SCHEMA ----------------------------- */

const SkillSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },

    skillKey: { type: String, required: true, trim: true },

    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },

    variants: { type: [VariantSchema], default: [] },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

SkillSchema.index({ skillKey: 1 }, { unique: true });

SkillSchema.methods.getVariantByKey = function (variantKey) {
  return this.variants.find((v) => v.variantKey === variantKey) || null;
};

export default mongoose.model("Skill", SkillSchema);
