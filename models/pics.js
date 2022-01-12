const mongoose = require("mongoose");

const picsSchema = {
  pics: Array,
};

const Pic = mongoose.model("Pics", picsSchema);

module.exports = Pic;
