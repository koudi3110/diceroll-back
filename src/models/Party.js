const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const schema = new mongoose.Schema(
  {
    begin_date: { type: String, default: null },
    end_date: { type: Date, default: null },
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Player",
      default: null,
    },
    score: { type: Number, default: null },
    session: { type: mongoose.Schema.Types.ObjectId, ref: "Session" },
  },
  { timestamps: true }
);

schema.plugin(uniqueValidator);
module.exports = mongoose.model("Party", schema);
