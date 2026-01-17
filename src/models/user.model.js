import mongoose from "mongoose";

const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    /* ---------------------- AUTH ---------------------- */
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    fullName: {
        type: String,
        required: true,
        trim: true,
        minlength: [3, "El nombre debe tener al menos 3 caracteres"],
        maxlength: [20, "El nombre no puede exceder los 20 caracteres"],
      },

    username: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      minlength: [3, "El username debe tener al menos 3 caracteres"],
      maxlength: [15, "El username no puede exceder los 15 caracteres"],
      match: [
        /^[a-zA-Z0-9_]+$/,
        "El username solo puede contener letras, números y guiones bajos (sin espacios)"
      ],
    },

    gender: {
      type: String,
      enum: ["male", "female"],
      required: true,
    },

    isVerified: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false },

    verificationToken: String,
    verificationTokenExpiresAt: Date,
    lastVerificationTokenSentAt: Date,

    resetPasswordToken: String,
    resetPasswordExpiresAt: Date,

    loginAttempts: { type: Number, default: 0 },
    lockUntil: Date,

    lastEditAt: {
      type: Date,
      default: new Date(0),
    },

    /* ---------------------- PROFILE ---------------------- */

    profileType: {
      type: String,
      enum: ["static", "dynamic"],
      default: "static",
    },

    avatar: {
        url: {
    type: String,
    default: "https://i.pinimg.com/1200x/3c/67/75/3c67757cef723535a7484a6c7bfbfc43.jpg",
          },
          publicId: {
            type: String,
            default: null,
          },
        },
    country: {
  type: String,
  default: "",
    },  
 altura: { type: Number, default: 0 },
peso: { type: Number, default: 0 },
videoProfile: {
  url: { type: String },
  publicId: { type: String },
},

    stats: {
  mainAura: { type: Number, default: 0 },
  staticAura: { type: Number, default: 0 },
  dynamicAura: { type: Number, default: 0 },

  energy: { type: Number, default: 1000 },

  // 🔒 Timestamp genérico (NO SE TOCA)
  lastUpdated: { type: Date, default: new Date(0) },

  // ⚡ Solo energía
  energyLastUpdatedAt: { type: Date, default: Date.now },

  // 🔥 Boosts
  energyRegenMultiplier: { type: Number, default: 1 },
  energyRegenBoostUntil: { type: Date, default: null },
},

    /* ---------------------- RELACIONES ---------------------- */

    skills: [
      {
        type: Schema.Types.ObjectId,
        ref: "UserSkill",
      },
    ],

    combos: [
      {
        type: Schema.Types.ObjectId,
        ref: "Combo",
      },
    ],

    favoriteSkills: [
    {
    userSkill: { type: Schema.Types.ObjectId, ref: "UserSkill", required: true },
    userSkillVariantId: { type: Schema.Types.ObjectId, ref: "UserSkill.variants", required: true },
    }
],

    favoriteCombos: {
      static: { type: Schema.Types.ObjectId, ref: "Combo", default: null },
      dynamic: { type: Schema.Types.ObjectId, ref: "Combo", default: null },
    },

    matches: {
        ranked: [{ type: Schema.Types.ObjectId, ref: "Match" }],
        casual: [{ type: Schema.Types.ObjectId, ref: "Match" }],
      },

    followers: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    following: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    teams: [
      {
        type: Schema.Types.ObjectId,
        ref: "Team",
      },
    ],

    /* ---------------------- RANKING SYSTEM ---------------------- */

    ranking: {
  static: {
    elo: { type: Number, default: 1000 },
    tier: { type: String, default: "Bronze" },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
     draws: { type: Number, default: 0 },
  },
  dynamic: {
    elo: { type: Number, default: 1000 },
    tier: { type: String, default: "Bronze" },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
     draws: { type: Number, default: 0 },
    },
  },
  
    pendingChallenge: {
      type: Schema.Types.ObjectId,
      ref: "Challenge",
      default: null,
    },

     hasPendingChallenge: {
      type: Boolean,
      default: false,
    },

    lastChallengeAt: {
      type: Date,
      default: null,
    },
    rankingUnlocked: {
  type: Boolean,
    default: true,
  },

  /* ---------------------- PUSH NOTIFICATIONS ---------------------- */

    pushTokens: {
      type: [String],
      default: [],
    },

    /* ---------------------- NOTIFICATIONS ---------------------- */

    notifications: [
      {
        type: Schema.Types.ObjectId,
        ref: "Notification",
      },
    ],

    notificationsCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);


export default mongoose.model("User", UserSchema);
