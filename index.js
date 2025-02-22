const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const indexRouter = require("./routes/index");
const userRouter = require("./routes/user");
const taskRouter = require("./routes/task");

const app = express();
dotenv.config();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use("/api/v1", indexRouter);
app.use("/api/v1/user", userRouter);
app.use("/api/v1/task", taskRouter);
const port = process.env.PORT || 3000;

app.listen(port, (req, res) => {
  console.log(`Server running on port ${port}`);
  mongoose.connect(process.env.MONGOOSE_URI_STRING).then(() => {
    console.log("Connected to database");
  });
});
