const express = require("express");
const validateRequest = require("../middlewares/validate-request");
const Joi = require("joi");
const Player = require("../models/Player");
const moment = require("moment");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();

router.post("/", async (req, res, next) => {
  const { username, itsMe, anonymous } = req.body;

  if (username) {
    let player = await Player.findOne({ username });

    if (player) {
      console.log(player);
      if (!itsMe) {
        return res.render("login", {
          _id: player._id,
          name: player.username,
          last_connexion: moment(player.last_connexion).format("DD/MM/YYYY"),
        });
      }
    } else {
      player = new Player({ username, last_connexion: new Date() });
      await player.save();
    }

    const infosuser = {
      _id: player._id,
      name: player.username,
      last_connexion: moment(player.last_connexion).format("DD/MM/YYYY"),
    };
    req.session.player = infosuser;

    player.last_connexion = new Date();
    await player.save();
    return res.redirect(`/home/${player?._id}`);
  }

  return res.render("login", {
    message:
      "Veuillez changer de nom d'utilisateur car celui ci est déjà utilisé",
    error: true,
  });
});

router.post("/signin", async (req, res, next) => {
  try {
    const { username } = req.body;
    let player = null;

    if (!username) throw "username is required";

    player = await Player.findOne({ username });

    let is_exist = true;

    if (!player) {
      is_exist = false;
      player = new Player({ username });
    }

    player.last_connexion = new Date();
    await player.save();

    return res.json({ data: player, is_exist });
  } catch (error) {
    res.status(400).json({ message: error?.message || error });
  }
});

router.get("/anonyme", async (req, res) => {
  try {
    const uid = uuidv4().split("-");
    const player = new Player({
      username: uid[uid.length - 1],
      last_connexion: new Date(),
    });
    await player.save();
    return res.json(player);
  } catch (error) {
    res.status(400).json({ message: error?.message || error });
  }
});

router.get("/visitor", async (req, res) => {
  const player = new Player({ username: uuidv4(), last_connexion: new Date() });
  await player.save();

  const infosuser = {
    _id: player._id,
    name: player.username,
    last_connexion: moment(player.last_connexion).format("DD/MM/YYYY"),
  };
  req.session.player = infosuser;

  return res.redirect(`/home/${player?._id}`);
});

router.get("/", (req, res) => {
  res.render("login");
});

module.exports = router;
