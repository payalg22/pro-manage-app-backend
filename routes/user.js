const express = require("express");
const router = express.Router();
const { User } = require("../schemas/user.schema");
const bcrypt = require("bcrypt");

router.get("/", async (req, res) => {
  const allUsers = await User.find().select("-password -_id -__v");
  res.status(200).json({
    allUsers,
  });
});

router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  //Check if user already exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400).json({
      message: "User already exists",
    });
  }
  //hashing password
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = new User({
    name,
    email,
    password: hashedPassword,
  });
  await newUser.save();
  res.status(201).json({
    message: "User Created succesfully",
    email,
  });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  //find user
  const userData = await User.findOne({ email });
  console.log(userData);
  if (!userData) {
    res.status(400).json({
      message: "User does not exist. Please register",
    });
  } else {
    const isValid = await bcrypt
      .compare(password, userData.password)
      .then((data) => {
        if (data) {
          res.status(200).json({
            message: "User logged in succesfully",
          });
        } else {
          res.status(400).json({
            message: "Invalid user or password",
          });
        }
      });
  }
});

module.exports = router;
