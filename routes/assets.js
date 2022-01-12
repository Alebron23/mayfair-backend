var express = require("express");
var router = express.Router();
const mongoose = require("mongoose");
import { uploadMiddleware, gfs } from "./vehicles";
const Asset = require("../models/assets");

router.post("/upload", uploadMiddleware, (req, res, next) => {
  const { files } = req;

  const asset = new Asset({
    name: req.body.name,
    picIds: files.map((file) => file.id),
  });
  console.log(asset);
  asset.save().then((assetRes) => {
    if (assetRes && assetRes._id) {
      return res.send({ id: assetRes._id });
    }
  });
});

router.get("/", (req, res) => {
  Asset.find().then((assets) => res.json(assets));
});

router.get("/:id", ({ params: { id } }, res) => {
  // if no id return error
  if (!id || id === "undefined") return res.status(400).send("no image id");
  // if there is an id string, cast it to mongoose's objectId type
  const _id = new mongoose.Types.ObjectId(id);
  // search for the image by id
  gfs.find({ _id }).toArray((err, files) => {
    if (!files || files.length === 0)
      return res.status(400).send("no files exist");
    // if a file exists, send the data
    gfs.openDownloadStream(_id).pipe(res);
  });
});

module.exports = router;
