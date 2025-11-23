import mongoose from "mongoose";

const { Schema } = mongoose;

const NotificationSchema = new Schema(
  {
    // Usuario que recibe la notificación
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Usuario que la generó (opcional)
    fromUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Tipo de notificación
    type: {
      type: String,
      enum: [
        "follow",
        "new_skill",
        "new_combo",
        "team_invite",
        "system",
      ],
      required: true,
    },

    // Texto visible al usuario
    message: {
      type: String,
      required: true,
      trim: true,
    },

    // Para notificaciones relacionadas a entidades (skill, combo, team, etc.)
    relatedSkill: {
      type: Schema.Types.ObjectId,
      ref: "Skill",
      default: null,
    },

    relatedCombo: {
      type: Schema.Types.ObjectId,
      ref: "Combo",
      default: null,
    },

    relatedTeam: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      default: null,
    },

    // Información extra dinámica
    metadata: {
      type: Object,
      default: {},
    },

    // Estado de lectura
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Notification", NotificationSchema);
