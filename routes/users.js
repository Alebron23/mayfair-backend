var express = require("express");
var router = express.Router();
const bcrypt = require("bcryptjs");
const passport = require("passport");
const User = require("../models/user");
const initializePassport = require("../passportConfig.js");

initializePassport(passport);

/* GET users listing. */
router.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) throw err;
    if (!user) res.status(400).send("No User Exists");
    else {
      req.logIn(user, (err) => {
        if (err) throw err;
        res.send({ status: "USER SUCCESSFULLY AUTHENTICATED", user });
      });
    }
  })(req, res, next);
});

router.post("/register", (req, res) => {
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

router.get("/", checkAuthenticated, (req, res) => {
  res.send({ isAuthed: req.isAuthenticated() }); // The req.user stores the entire user that has been authenticated inside of it.
});

function checkAuthenticated(req, res, next) {
  console.log(req.isAuthenticated());
  if (req.isAuthenticated()) {
    return next();
  }
}

module.exports = router;
