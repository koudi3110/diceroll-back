const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const schema = new mongoose.Schema(
  {
    begin_date: { type: String, default: null },
    end_date: { type: Date, default: null },
    lastUpdate: { type: Date, default: null },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Player",
      default: null,
    },
    nb_parties: { type: Number, required: true },
    nb_players: { type: Number, required: true },
    nb_dices: { type: Number, required: true },
    players: [
      {
        player: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
        status: {
          type: String,
          enum: ["in", "out"],
          default: "in",
        },
      },
    ],
    timer: { type: Number, require: true },
    hand: { type: String },
    towers: Array,
    winner: { type: Object, default: null },
    currentTower: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["init", "pending", "end"],
      default: "init",
    },
  },
  { timestamps: true }
);

schema.plugin(uniqueValidator);
module.exports = mongoose.model("Session", schema);
