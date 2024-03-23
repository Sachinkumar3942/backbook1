const mongoose = require("mongoose");
const express = require("express");
const User = require("./models/User.js");
const Place = require("./models/Place.js");
const Booking = require("./models/Booking.js");
const cors = require("cors");
const bcrypt = require("bcrypt");
const imageDownloader = require("image-downloader");
const multer = require("multer");
const app = express();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const jwtSecret = "GHVHGFHGVGFHDHCdfdfdg";
const bcryptSalt = bcrypt.genSaltSync(10);
const fs = require("fs");
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(__dirname + "/uploads"));
app.use(
  cors({
    credentials: true,
    origin: "http://localhost:3000",
  })
);
require("dotenv").config();

mongoose.connect(process.env.mongo_url);
app.get("/test", (req, resp) => {
  resp.send("test ok");
});

const getUserDataFromToken=(req)=>{
  return new Promise((resolve,reject)=>{
    jwt.verify(req.cookies.token, jwtSecret, {}, async (err, userData) => {
      if (err) throw err;
      resolve(userData);
    });
  })
}

const photosMiddleware = multer({ dest: "uploads" });
app.post("/upload", photosMiddleware.array("photos", 100), (req, resp) => {
  const uploadedFiles = [];
  for (let i = 0; i < req.files.length; i++) {
    const { path, originalname } = req.files[i];
    const parts = originalname.split(".");
    const ext = parts[parts.length - 1];
    const newPath = path + "." + ext;
    fs.renameSync(path, newPath);
    uploadedFiles.push(newPath.replace("uploads/", ""));
  }
  resp.send(uploadedFiles);
});

app.get("/places/:id", async (req, resp) => {
  const { id } = req.params;
  resp.send(await Place.findById(id));
});

// app.get("/place/:id",async(req,resp)=>{
//   const {id}=req.params;
//    resp.send(await Place.findById(id))
// })

app.post("/login", async (req, resp) => {
  const { email, password } = req.body;
  const userDoc = await User.findOne({ email });
  if (userDoc) {
    const passOk = bcrypt.compareSync(password, userDoc.password);
    if (passOk) {
      jwt.sign(
        {
          email: userDoc.email,
          id: userDoc._id,
          name: userDoc.name,
        },
        jwtSecret,
        {},
        (err, token) => {
          if (err) throw err;
          resp.cookie("token", token).json(userDoc);
        }
      );
    } else {
      resp.status(422).json("wrong password");
    }
  } else {
    resp.send("Not found");
  }
});

app.get("/profile", (req, resp) => {
  const { token } = req.cookies;
  if (token) {
    jwt.verify(token, jwtSecret, {}, async (err, userData) => {
      if (err) throw err;
      const { name, email, _id } = await User.findById(userData.id);
      resp.send({ name, email, _id });
    });
  } else {
    resp.send(null);
  }
});

app.post("/register", async (req, resp) => {
  const { name, email, password } = req.body;
  try {
    const userDoc = await User.create({
      name,
      email,
      password: bcrypt.hashSync(password, bcryptSalt),
    });
    resp.send(userDoc);
  } catch (e) {
    resp.status(422).json(e);
  }
});

app.get("/places", (req, resp) => {
  const { token } = req.cookies;
  // const {data}=req.body;
  jwt.verify(token, jwtSecret, {}, async (err, userData) => {
    const { id } = userData;
    resp.send(await Place.find({ owner: id }));
  });
});

app.post("/upload-by-link", async (req, resp) => {
  const { link } = req.body;
  const newName = "photo" + Date.now() + ".jpg";
  await imageDownloader.image({
    url: link,
    dest: __dirname + "/uploads/" + newName,
  });
  resp.send(__dirname + "/uploads/" + newName);
});

app.get("/download-by-link", async (req, resp) => {
  try {
    const { link } = req.query;
    if (!link) {
      return resp.status(400).json({ error: "Link is required" });
    }

    const newName = "photo" + Date.now() + ".jpg";
    await imageDownloader.image({
      url: link,
      dest: __dirname + "/uploads/" + newName,
    });

    resp.status(200).json({ filename: newName });
  } catch (error) {
    console.error("Error downloading image:", error);
    resp.status(500).json({ error: "Failed to download image" });
  }
});
app.post("/places", (req, resp) => {
  try {
    const { token } = req.cookies;
    const {
      title,
      address,
      photos,
      description,
      perks,
      extra,
      cin,
      cout,
      guests,
      price,
    } = req.body;
    jwt.verify(token, jwtSecret, {}, async (err, userData) => {
      if (err) throw err;
      const placeDoc = await Place.create({
        owner: userData.id,
        title,
        address,
        photos,
        description,
        perks,
        extra: extra,
        cin: cin,
        cout: cout,
        guests,
        price,
      });
      // console.log("data",placeDoc)
      resp.json(placeDoc);
    });
  } catch (err) {
    resp.send("Add place error");
  }
});

app.put("/places", async (req, resp) => {
  try {
    const { token } = req.cookies;
    const {
      id,
      title,
      address,
      photos,
      description,
      perks,
      extra,
      cin,
      cout,
      guests,
      price,
    } = req.body;
    jwt.verify(token, jwtSecret, {}, async (err, userData) => {
      if (err) throw err;
      const placeDoc = await Place.findById(id);
      if (userData.id === placeDoc.owner.toString()) {
        placeDoc.set({
          owner: userData.id,
          title,
          address,
          photos,
          description,
          perks,
          extra: extra,
          cin: cin,
          cout: cout,
          guests,
          price,
        });
        await placeDoc.save();
      }
      resp.json(placeDoc);
    });
  } catch (err) {
    resp.send("Add place error");
  }
});

app.post("/logout", (req, resp) => {
  resp.cookie("token", "").json(true);
});

app.get("/allPlaces", async (req, resp) => {
  resp.send(await Place.find());
});

app.post("/bookings", async (req, resp) => {
  try {
    const userData=await getUserDataFromToken(req);
    const { place, cin, cout, guests, name, number, email, price } = req.body;
    // console.log(userData)
    const result = new Booking({
      place,
      cin,
      user:userData.id,
      cout,
      guests,
      name,
      number,
      email,
      price,
    });
    const resu = await result.save()
    console.log(resu)
    resp.send(resu);
    
  } catch (err) {
    resp.send(err);
  }
});



app.get('/bookings',async(req,resp)=>{
  const userData = await getUserDataFromToken(req);
  resp.json(await Booking.find({ user:userData.id }).populate('place'))
})

app.listen(5600); 
