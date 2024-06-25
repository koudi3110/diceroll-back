const express = require("express");
const router = express.Router();
const diceService = require("../services/dice.service");
const validateRequest = require("../middlewares/validate-request");
const Joi = require("joi");

const createSchema = (req, res, next) => {
  const schema = Joi.object({
    creator: Joi.string().required(),
    nb_players: Joi.number().required(),
    nb_parties: Joi.number().required(),
    nb_dices: Joi.number().required(),
    timer: Joi.number().required(),
  });
  validateRequest(req, next, schema);
};

const joinSchema = (req, res, next) => {
  const schema = Joi.object({
    player: Joi.string().required(),
  });
  validateRequest(req, next, schema);
};

router.post("/launch", (req, res, next) => {
  const randomNumber = Math.round(Math.random() * 6);

  return res.json({ value: randomNumber == 0 ? 1 : randomNumber });
});

router.post("/create", createSchema, async (req, res, next) => {
  try {
    const io = req.app.get("io");
    const response = await diceService.create(req.body, io);
    return res.json(response);
  } catch (error) {
    return res.status(400).json({ message: error?.message || error });
  }
});

router.post("/join/:id", joinSchema, async (req, res, next) => {
  try {
    const io = req.app.get("io");
    const response = await diceService.join(req.params.id, req.body.player, io);

    return res.json(response);
  } catch (error) {
    return res.status(400).json({ message: error?.message || error });
  }
});

router.get("/init/:id", async (req, res, next) => {
  try {
    const io = req.app.get("io");
    const response = await diceService.init(req.params.id, io);

    return res.json(response);
  } catch (error) {
    return res.status(400).json({ message: error?.message || error });
  }
});

router.post("/keepout/:id", joinSchema, async (req, res, next) => {
  try {
    const io = req.app.get("io");
    const response = await diceService.out(req.params.id, req.body.player, io);

    return res.json(response);
  } catch (error) {
    return res.status(400).json({ message: error?.message || error });
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const io = req.app.get("io");
    const response = await diceService.deleteSession(req.params.id, io);

    res.json({
      message: "La partie a été supprimée",
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: error?.message || error });
  }
});

router.post("/roll/:id", async (req, res, next) => {
  try {
    const io = req.app.get("io");
    const response = await diceService.play(req.params.id, req.body.player, io);
    res.json(response);
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: error?.message || error });
  }
});

router.get("/history/:id/:limit", async (req, res, next) => {
  try {
    const response = await diceService.history(req.params.id, req.params.limit);
    res.json(response);
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: error?.message || error });
  }
});

module.exports = router;
