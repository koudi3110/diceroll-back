const http = require("http");
// const http = require("http");
require("dotenv").config();
const app = require("./src/app");
const Socket = require("socket.io");
const fs = require("fs");
const Session = require("./src/models/Session");

const normalizePort = (val) => {
  const port = parseInt(val, 10);

  if (isNaN(port)) {
    return val;
  }
  if (port >= 0) {
    return port;
  }
  return false;
};

const port = normalizePort(process.env.PORT || "4000");
app.set("port", port);

const errorHandler = (error) => {
  if (error.syscall !== "listen") {
    throw error;
  }
  const address = server.address();
  const bind =
    typeof address === "string" ? "pipe " + address : "port: " + port;
  switch (error.code) {
    case "EACCES":
      console.error(bind + " requires elevated privileges.");
      process.exit(1);
      break;
    case "EADDRINUSE":
      console.error(bind + " is already in use.");
      process.exit(1);
      break;
    default:
      throw error;
  }
};

const server = http.createServer(app, "10.2.101.12");
server.on("error", errorHandler);
server.on("listening", () => {
  const address = server.address();
  const bind = typeof address === "string" ? "pipe " + address : "port " + port;
  console.log("Listening on " + bind);
});

server.listen(port);

const io = Socket(server, {
  pingTimeout: 60000,
  pingInterval: 20000,
  cors: {
    origin: "*",
    credentials: true,
  },
});

app.set("io", io);

io.on("connection", async (socket) => {
  console.log("socket");
  socket.on("dice:launch", async (data) => {
    io.sockets.emit(`dice:launch:${data._id}`);
  });

  socket.on("disconnect", async () => {
    console.log("déconnexion");
  });

  try {
    const sessions = await Session.find({ status: { $ne: "end" } })
      .sort({ createdAt: -1 })
      .populate("creator")
      .populate("players.player");

    socket.emit(`session:list`, sessions);
  } catch (error) {
    console.log("errrr", error);
  }
});

io.on("error", (error) => {
  console.error("Socket.IO Server Error:", error);
});
