const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const errorHandler = require("./middlewares/error-handler");
const path = require("path");

const authRoute = require("./routes/auth.route");
const pageRoute = require("./routes/page.route");
const diceRoute = require("./routes/dice.route");
const Session = require("./models/Session");

const app = express();
app.use(express.static(path.join(__dirname, "../public")));
app.use(cookieParser());

app.use(
  session({
    secret: "amar",
    saveUninitialized: true,
    resave: false,
  })
);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

const dbUrl = "mongodb://localhost:27017/3icp";

mongoose
  .connect(process.env.DB_URL || dbUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then((db) => {
    console.log("Connexion à MongoDB réussie !");

    setInterval(() => {
      const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);

      // console.log(threeMinutesAgo);

      Session.deleteMany({
        status: "init",
        createdAt: { $lte: threeMinutesAgo },
      })
        .then(async (result) => {
          const io = app.get("io");

          if (result.deletedCount > 0) {
            const sessions = await Session.find({
              status: { $ne: "end" },
            }).populate("creator");
            io.sockets.emit("session:list", sessions);
          }
        })
        .catch((error) => {
          console.error(
            "Une erreur s'est produite lors de la suppression des jeux :",
            error
          );
        });
    }, 20000);
  })
  .catch(() => console.log("Connexion à MongoDB échouée !"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    allowedHeaders: "Content-Type, Authorization",
  })
);

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content, Accept, Content-Type, Authorization"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  );
  next();
});

app.get("/", (req, res) => {
  res.render("login");
});
app.use("/", pageRoute);
app.use("/signin", authRoute);
app.use("/auth", authRoute);
app.use("/dice", diceRoute);

app.use(errorHandler);
module.exports = app;
