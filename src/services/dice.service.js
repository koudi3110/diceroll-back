const Session = require("../models/Session");
const Party = require("../models/Party");
const Player = require("../models/Player");

let timeoutId = {};

const create = async (body, io) => {
  try {
    const player = await Player.findOne({ _id: body?.creator });
    const session = new Session({
      creator: player._id,
      nb_parties: body.nb_parties,
      nb_players: body.nb_players,
      nb_dices: body.nb_dices,
      timer: body.timer,
      towers: Array.from({ length: body.nb_parties }, (_, i) => ({})),
    });

    session.players = [{ player: player._id, status: "in" }];

    await session.save();
    await notification(io);

    return session;
  } catch (error) {
    throw error?.message;
  }
};

const init = async (idsession, io) => {
  try {
    const session = await Session.findOne({ _id: idsession }).populate(
      "players.player"
    );

    const player = session.players[0]?.player;
    session.hand = player?.username;
    session.begin_date = new Date();
    session.lastUpdate = new Date();
    session.status = "pending";

    await session.save();

    timer(session, player, io);

    io.sockets.emit(`session:init:${session?._id}`, session);
    await notification(io);
    return session;
  } catch (error) {
    throw error?.message;
  }
};

const join = async (idsession, idplayer, io) => {
  try {
    const session = await Session.findOne({ _id: idsession });
    const player = await Player.findOne({ _id: idplayer });

    if (session?.players?.length >= session?.nb_players)
      throw "Limite de joueurs atteint";
    if (session?.players?.find((e) => e?.player == player?._id))
      throw "Déjà dans la session";

    session?.players?.push({ player: player._id, status: "in" });
    await session?.save();

    const nsession = await Session.findOne({ _id: idsession }).populate(
      "players.player"
    );

    io.sockets.emit(`session:join:${session?._id}`, nsession?.players);
    return session;
  } catch (error) {
    throw error?.message || error;
  }
};

const play = async (idsession, idplayer, io) => {
  try {
    const session = await Session.findById(idsession).populate(
      "players.player"
    );

    if (timeoutId[session?._id]) {
      clearTimeout(timeoutId[session._id]);
      delete timeoutId[session._id];
    }

    if (session.currentTower == session.nb_parties || session.status == "end")
      return session;

    if (!session.players.find((e) => e.player._id == idplayer)) return session;

    const player = await Player.findById(idplayer);
    if (session.hand !== player.username) return session;

    const result = getRandom(6, session.nb_dices);
    session.towers[session.currentTower][player.username] = result;

    await updateSession(session);

    const party = new Party({
      begin_date: new Date(),
      end_date: new Date(),
      player: player._id,
      score: result.reduce(
        (accumulator, currentValue) => accumulator + currentValue,
        0
      ),
      session: session._id,
    });
    await party.save();

    let validPlayers = getValidePlayer(session);
    const indexOfPlayer = validPlayers
      .map((e) => e.player.username)
      .indexOf(player?.username);

    session.hand =
      validPlayers[(indexOfPlayer + 1) % validPlayers.length].player.username;

    session.lastUpdate = new Date();

    console.log(session.towers[session.currentTower]);
    //verifier si le tour est terminé
    if (
      Object.keys(session.towers[session.currentTower]).length ==
      validPlayers.length
    ) {
      session.currentTower = session.currentTower + 1;
    }

    if (session.currentTower >= session.nb_parties) {
      if (session.status != "end") {
        let i = 0;
        const validPlayer = getValidePlayer(session);
        session.towers.forEach((e) => {
          if (Object.keys(e).length >= validPlayer.length) i++;
        });
        if (i == session.nb_parties) {
          session.status = "end";
          session.endAt = new Date();
          session.winner = getWinner(session);
        }
      }

      await updateSession(session);
      // await session.save();
      notification(io);
    } else {
      timer(session, player, io);
    }

    await updateSession(session);
    const newSession = await findSession(session?._id);
    io.sockets.emit(`session:play:${session._id.toString()}`, newSession);
    io.sockets.emit(`dice:roll:${session._id.toString()}`, result);

    return newSession;
  } catch (error) {
    console.log(error);
    throw error?.message;
  }
};

const finish = async () => {
  try {
  } catch (error) {
    throw error?.message;
  }
};

const out = async (idsession, player, io) => {
  try {
    const session = await Session.findById(idsession);
    session.players = session.players?.filter((e) => e.player != player);
    await session.save();

    const nsession = await Session.findById(idsession).populate(
      "players.player"
    );
    io.sockets.emit(`session:join:${session?._id}`, nsession?.players);
    return nsession?.players;
  } catch (error) {
    throw error?.message;
  }
};

const deleteSession = async (id, io) => {
  try {
    const data = await Session.deleteOne({ _id: id });
    console.log(data);
    if (data.deletedCount > 0) {
      notification(io);
      io.sockets.emit(`session:cancel:${id}`, {
        data: "game cancelled",
      });

      return true;
    } else {
      throw "Aucune partie n'a été supprimée";
    }
  } catch (error) {
    throw error?.message || error;
  }
};

const abandon = async (session, idplayer, io) => {
  try {
    const session = await Session.findById(session);
    const player = await Player.findById(idplayer);

    if (session.hand != player.username) {
      throw "Vous ne pouvez pas quitter la partrie tant que vous n'avez pas la main";
    }
    const newGame = outGame(session, player, io, true, Status.CANCEL, socket);

    const returnPlay = await Session.findById(game._id);

    io.sockets.emit(`session:abandon:${game._id}`, {
      data: returnPlay,
    });

    return returnPlay;
  } catch (error) {
    throw error?.message || error;
  }
};

const history = async (idplayer, limit) => {
  try {
    const sessions = await Session.find({ "players.player": idplayer })
      .populate("players.player")
      .limit(limit)
      .sort({ createdAt: -1 });

    return {
      datas: sessions,
      total: await Session.find({ "players.player": idplayer }).length,
    };
  } catch (error) {
    throw error?.message || error;
  }
};

// -------------------------------------
// TOOOOOLLSSSSSSSSSSSSSSSSSSSSSSSSSSSSS
// -------------------------------------

const timer = (session, player, io) => {
  return new Promise((resolve, reject) => {
    timeoutId[session._id] = setTimeout(() => {
      console.log("timer launch");
      outGame(session, player, io);
      resolve();
    }, session.timer * 1000 + 2000);
  });
};

const notification = async (io) => {
  try {
    const sessions = await Session.find({ status: { $ne: "end" } })
      .sort({ createdAt: -1 })
      .populate("creator")
      .populate("players.player");
    io.sockets.emit(`session:list`, sessions);
  } catch (error) {
    console.log("errrr", error);
  }
};

const findSession = async (id) => {
  try {
    return await Session.findById(id).populate("players.player");
  } catch (error) {
    return null;
  }
};

const outGame = async (nsession, player, io) => {
  const session = await Session.findById(nsession._id).populate(
    "players.player"
  );
  try {
    if (timeoutId[session._id]) {
      clearTimeout(timeoutId[session._id]);
      delete timeoutId[session._id];
    }

    let validPlayers = getValidePlayer(session);

    const indexOfPlayer = validPlayers
      .map((e) => e.player.username)
      .indexOf(player?.username);

    session.hand =
      validPlayers[(indexOfPlayer + 1) % validPlayers.length].player.username;

    session.players = session.players.map((e) => {
      const elt = { ...e };
      if (e.player.username == player?.username) elt.status = "out";
      return elt;
    });

    await updateSession(session);

    validPlayers = getValidePlayer(session);

    if (
      Object.keys(session.towers[session.currentTower] || {}).length >=
      validPlayers.length
    ) {
      // session.hand = session.control;
      session.currentTower = session.currentTower + 1;
    }

    if (validPlayers.length == 0) {
      session.winner = getWinner(session);
      session.isFinish = true;
      session.status = "end";
      session.endAt = new Date();
      await updateSession(session);

      notification(io);
    } else {
      session.lastUpdate = new Date(); // <---------------

      const newhand = await Player.findOne({ username: session.hand });
      timer(session, newhand, io);
      await updateSession(session);
    }
    // await updateSession(session);

    console.log(session);

    const newSession = await Session.findById(session._id).populate(
      "players.player"
    );

    io.sockets.emit(`session:keep-out:${session._id.toString()}`, {
      username: player?.username,
    });

    io.sockets.emit(`session:play:${session._id.toString()}`, newSession);
  } catch (error) {
    console.log(error);
  }

  return session;
};

const getValidePlayer = (session) => {
  return session.players.filter((e) => e.status == "in");
};

const getWinner = (session) => {
  const result = {};
  for (let tower of session.towers) {
    for (let [key, value] of Object.entries(tower)) {
      const sum = value.reduce((accumulator, currentValue) => {
        return accumulator + currentValue;
      }, 0);
      result[key] = !result[key] ? sum : result[key] + sum;
    }
  }

  const winerusername = getKeyWithMaxValue(result);

  let win = session.players.find((e) => e.player.username == winerusername);
  if (!win) win = session.players[0];

  return {
    username: win?.player?.username,
    _id: win?.player?._id,
  };
};

const getRandom = (n, k) => {
  const resultat = [];
  for (let i = 0; i < k; i++) {
    const nombreTire = Math.floor(Math.random() * n);
    resultat.push(nombreTire + 1);
  }
  return resultat;
};

const getKeyWithMaxValue = (obj) =>
  Object.entries(obj).reduce(
    (a, b) => (a[1] > b[1] ? a : b),
    [0, -Infinity]
  )[0];

const updateSession = async (data) => {
  return await Session.updateOne({ _id: data._id }, data);
};

module.exports = {
  create,
  join,
  play,
  finish,
  out,
  init,
  deleteSession,
  abandon,
  history,
};
