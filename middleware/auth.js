const jwt = require("jsonwebtoken");

const verifyUser = (req, res, next) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(400).json({
        message: "Please login and try again",
      });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.log(err);
    return res.status(400).json({
      message: "Please login and try again",
    });
  }
};

module.exports = verifyUser;
