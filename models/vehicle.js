const mongoose = require("mongoose");

const vehicleSchema = {
  vin: String,
  year: String,
  make: String,
  model: String,
  mileage: String,
  price: String,
  drivetrain: String,
  transmission: String,
  motor: String,
  description: String,
  picIds: Array,
};

const Vehicle = mongoose.model("vehicle", vehicleSchema);

module.exports = Vehicle;
