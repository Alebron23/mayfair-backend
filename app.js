var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var cors = require("cors");
const mongoose = require("mongoose");
const passport = require("passport");
const session = require("express-session");

const bcrypt = require("bcryptjs");
const User = require("./models/user");
const initializePassport = require("./passportConfig.js");

var indexRouter = require("./routes/index");
// var usersRouter = require("./routes/users");
import vehiclesRouter from "./routes/vehicles";
var assetsRouter = require("./routes/assets");

var app = express();
const port = process.env.PORT || 9000;

app.use(logger("dev"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:3000", // <-- location of the react app were connecting to
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

mongoose
  .connect(
    process.env.MONGO_URI,
    { useNewUrlParser: true },
    { useUnifiedTopology: true }
  )
  .then(() => {
    app.listen(port, function () {
      console.log("RUNNING ON PORT 9000");
    });
  });

app.use(
  session({
    secret: "secretcode",
    resave: true,
    saveUninitialized: true,
    // cookie: {
    //   maxAge: 1000 * 60 * 60 * 24, // one day
    // },
  })
);
app.use(cookieParser("secretcode"));
app.disable("etag");

// Passport setup
app.use(passport.initialize());
app.use(passport.session());
initializePassport(passport);

app.post("/users/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) throw err;
    if (!user) res.status(500).send("No User");
    else {
      req.logIn(user, (err) => {
        if (err) throw err;
        console.log("AUTHED:", req.isAuthenticated());
        res.send({ status: "USER SUCCESSFULLY AUTHENTICATED", user });
      });
    }
  })(req, res, next);
});

app.post("/users/register", (req, res) => {
  User.findOne({ username: req.body.username }, async (err, doc) => {
    if (err) throw err;
    if (doc) res.send("User Already Exists");
    if (!doc) {
      const hashedPassword = await bcrypt.hash(req.body.password, 10);

      const newUser = new User({
        username: req.body.username,
        password: hashedPassword,
      });
      await newUser.save();
      res.send("User Created");
    }
  });
});

// Visiting this route logs the user out
app.get("/users/logout", (req, res, next) => {
  req.logout();
  res.status(200).send("Logout Successful");
});

app.get("/users/authed-user", (req, res) => {
  console.log("AUTHED-USER:", req.isAuthenticated());
  if (req) res.status(200).json({ isAuthed: req.isAuthenticated() }); // The req.user stores the entire user that has been authenticated inside of it.
});

function checkAuthenticated(req, res, next) {
  console.log("IS AUTHED", req.isAuthenticated());
  if (req.isAuthenticated()) {
    return next();
  }
}

app.use("/", indexRouter);
// app.use("/users", usersRouter);
app.use("/vehicles", vehiclesRouter);
app.use("/assets", assetsRouter);

module.exports = app;
