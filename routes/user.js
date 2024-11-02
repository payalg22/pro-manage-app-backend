const express = require("express");
const router = express.Router();
const { User } = require("../schemas/user.schema");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const authMiddleware = require("../middleware/auth");

//get all users
router.get("/", authMiddleware, async (req, res) => {
  const { user } = req;
  try {
    const allUsers = await User.find({ _id: { $ne: user } }).select(
      "-password -__v"
    );
    return res.status(200).json({
      allUsers,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: "Something went wrong. Try again.",
    });
  }
});

//get user details
router.get("/details", authMiddleware, async (req, res) => {
  const { user } = req;
  try {
    const userInfo = await User.findById(user, "name email");
    if (userInfo) {
      return res.status(200).json({
        userInfo,
      });
    }
    return res.status(404).json({
      message: "User not found",
    });
  } catch (error) {
    console.log(err);
    return res.status(500).json({
      message: "Something went wrong. Try again.",
    });
  }
});

router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    //Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        message: "User already exists. Please login.",
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

  try {
    //find user
    const userData = await User.findOne({ email });
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
      user: userData.name,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Unexpected error occurred. Please try again",
    });
  }
});

//update user details
router.put("/update", authMiddleware, async (req, res) => {
  const { user } = req;
  let data = req.body;

  try {
    let userInfo = await User.findById(user);
    if (!userInfo) {
      return res.status(404).json({ messsage: "User not found" });
    }

    if (userInfo._id.toString() !== data._id.toString()) {
      return res.status(400).json({ messsage: "Can't update user" });
    }

    if (data.newPassword != "") {
      const isValid = await bcrypt.compare(data.oldPassword, userInfo.password);
      if (!isValid) {
        return res.status(400).json({
          message: "Invalid password",
        });
      }
    }
    const hashedPassword = await bcrypt.hash(data.newPassword, 10);
    data = {
      ...data,
      password: hashedPassword,
    };
    userInfo = await User.findByIdAndUpdate(user, data, { new: true });
    res.status(201).json(userInfo);
  } catch (err) {
    return res.status(500).json({
      message: "Unexpected error occurred. Please try again",
    });
  }
});

module.exports = router;
