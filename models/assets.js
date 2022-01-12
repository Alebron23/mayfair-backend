const mongoose = require("mongoose");

const assetSchema = {
  name: String,
  picIds: Array,
};

const Asset = mongoose.model("asset", assetSchema);

module.exports = Asset;
