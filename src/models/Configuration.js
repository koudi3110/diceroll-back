const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const schema = new mongoose.Schema(
  {
    nb_players: { type: Number, default: null },
    nb_partie: { type: Number, default: null },
    nb_dices: { type: Number, default: null },
    timer: { type: Number, default: null },
    player: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
  },
  { timestamps: true }
);

schema.plugin(uniqueValidator);
module.exports = mongoose.model("Configuration", schema);
