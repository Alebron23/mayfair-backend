const express = require("express");
const mongoose = require("mongoose");
const { GridFsStorage } = require("multer-gridfs-storage");
const multer = require("multer");
const crypto = require("crypto");
const path = require("path");

const Vehicle = require("../models/vehicle");
const router = express.Router();
require("dotenv").config();

//############################# MONGO CONNECTIONS #############################

const mongoURI = process.env.MONGO_URI;
const bucketName = "pics";
const conn = mongoose.createConnection(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
  useFindAndModify: false,
});

export let gfs;
// once the connection is open
conn.once("open", () => {
  // gfs is going to be like a mongoose model with methods on it
  // we use to interact with collection of documents in the db.
  // Collection of files and junks representing our images.
  gfs = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName,
  });
});

// storage engine setup by multerGrid package.
const storage = new GridFsStorage({
  url: mongoURI,
  // options: { useUnifiedTopology: true },
  // Gives each file uploaded unique name to avoid naming collisions.
  file: (req, file) => {
    // this function runs every time a new file is created
    return new Promise((resolve, reject) => {
      // use the crypto package to generate some random hex bytes
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        // turn the random bytes into a string and add the file extention at the end of it (.png or .jpg)
        // this way our file names will not collide if someone uploads the same file twice.
        // Gives the file a unique Id
        const fileInfo = {
          filename: buf.toString("hex") + path.extname(file.originalname),
          bucketName,
        };
        // resolve these properties so they will be added to the new file document
        resolve(fileInfo);
      });
    });
  },
});

// set up our multer to use the gridfs storage defined above
const upload = multer({
  storage,
  // limit the size to 20mb for any files coming in
  limits: { fileSize: 20000000 },
  // filer out invalid filetypes. Runs each time file is uploaded.
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
});

function checkFileType(file, cb) {
  // https://youtu.be/9Qzmri1WaaE?t=1515
  // define a regex that includes the file types we accept
  const filetypes = /jpeg|jpg|png|gif/;
  //check the file extention
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // more importantly, check the mimetype
  const mimetype = filetypes.test(file.mimetype);
  // if both are good then continue
  if (mimetype && extname) return cb(null, true);
  // otherwise, return error message
  cb("filetype");
}

// wrap the multer connections from above in middleware to
// send back errors depending on what went wrong.
export const uploadMiddleware = (req, res, next) => {
  const upl = upload.array("uploaded_files", 12);

  upl(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).send("File too large");
    } else if (err) {
      // check if our filetype error occurred
      if (err === "filetype") return res.status(400).send("Image files only");
      // An unknown error occurred when uploading.
      console.log("BEFORE 500:", err);
      return res.sendStatus(500);
    }
    // all good, proceed
    next();
  });
};

//############################# ROUTES #############################

router.post("/upload", uploadMiddleware, (req, res, next) => {
  const { files } = req;
  const vehicle = {
    vin: req.body.vin,
    year: req.body.year,
    make: req.body.make,
    model: req.body.model,
    mileage: req.body.mileage,
    price: req.body.price,
    drivetrain: req.body.drivetrain,
    transmission: req.body.transmission,
    motor: req.body.motor,
    description: req.body.description,
    picIds: files.map((file) => file.id.toString()),
  };

  const newVehicle = new Vehicle({
    ...vehicle,
  });

  newVehicle.save().then((vehicleRes) => {
    if (vehicleRes && vehicleRes._id) {
      return res.send(vehicleRes._id);
    }
  });
});

router.delete(
  "/pics/:id",
  async ({ body: { vehicleId }, params: { id } }, res) => {
    if (!id || id === "undefined") return res.status(400).send("no image id");

    const _id = new mongoose.Types.ObjectId(id);
    let updates;
    let findRes;

    try {
      findRes = await Vehicle.findById(vehicleId, (err, vehicle) => {
        if (err) res.status(400).send({ error: "Error Finding Vehicle" });
      });
    } catch (err) {
      res.status(400).send(err);
    }

    if (findRes.picIds) {
      updates = {
        picIds: findRes.picIds.filter((picId) => {
          return picId !== id;
        }),
      };
    }

    if (updates) {
      try {
        const updateRes = await Vehicle.findByIdAndUpdate(vehicleId, updates, {
          new: true,
        });

        if (updateRes) {
          gfs.delete(_id, (err) => {
            if (err) return res.status(500).send("image deletion error");

            res.send({ vehicleId });
          });
        }
      } catch (err) {
        res.status(400).send(err);
      }
    }
  }
);

router.get("/", (req, res) => {
  console.log("IS VEHICLE AUTHED:", req.isAuthenticated());
  Vehicle.find().then((vehicles) => res.json(vehicles));
});

router.get("/:id", ({ params: { id }, isAuthenticated }, res) => {
  Vehicle.findById(id, (err, vehicle) => {
    if (err) res.status(400).send({ error: "Error Finding Vehicle" });
    res.json(vehicle);
  });
});

router.get("/pics/:id", (req, res) => {
  const {
    params: { id },
  } = req;
  console.log("IS AUTHED:", req.isAuthenticated());
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

// upload.none()
// uploadMiddleware
router.patch("/:id", uploadMiddleware, async (req, res) => {
  const { files } = req;
  const { id } = req.params;
  let newFilesId = [];
  const parsedPicIds = JSON.parse(req.body.picIds);

  if (files) {
    newFilesId = files.map((file) => file.id.toString());
  }

  const updates = {
    ...req.body,
    picIds: [...parsedPicIds, ...newFilesId],
  };

  try {
    const result = await Vehicle.findByIdAndUpdate(id, updates, { new: true });
    res.send(result);
  } catch (err) {
    res.status(400).send(err);
  }
});

export default router;
