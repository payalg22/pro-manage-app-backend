const express = require("express");
const router = express.Router();
const { User } = require("../schemas/user.schema");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

router.get("/", async (req, res) => {
  const allUsers = await User.find().select("-password -_id -__v");
  return res.status(200).json({
    allUsers,
  });
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;
  const userInfo = await User.findById(id, "name email");
  if (userInfo) {
    return res.status(200).json({
      userInfo,
    });
  }
  return res.status(400).json({
    message: "User not found",
  });
});

router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  console.log(req.body);
  //Check if user already exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    return res.status(400).json({
      message: "User already exists. Please login.",
    });
  }

  try {
    //hashing password
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
    });
    await newUser.save();
    return res.status(201).json({
      message: "User Created succesfully",
      email,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unexpected error occurred. Please try again",
    });
  }
});

//User login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  //find user
  const userData = await User.findOne({ email });
  console.log(userData);
  if (!userData) {
    return res.status(404).json({
      message: "Invalid username or password",
    });
  }
  const isValid = await bcrypt.compare(password, userData.password);
  if (!isValid) {
    return res.status(400).json({
      message: "Invalid username or password",
    });
  }
  const payload = { id: userData._id };
  const token = jwt.sign(payload, process.env.JWT_SECRET);
  return res.status(200).json({
    message: "User logged in succesfully",
    token,
  });
});

module.exports = router;
