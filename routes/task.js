const express = require("express");
const router = express.Router();
const { Task } = require("../schemas/task.schema");
const { Types } = require("mongoose");

//Getting all the tasks
router.get("/", async (req, res) => {
  const allTasks = await Task.find().select("-__v");
  res.status(200).json({
    allTasks,
  });
});

//Creating a new task
router.post("/new", async (req, res) => {
  const { title, priority, checklist, ownerId, assigneeId } = req.body;
  //Splitting checlist items
  const checklistItems = checklist.split(",").map((item) => item.trim());
  console.log(checklistItems);
  //parsing owner id
  const owner = Types.ObjectId.createFromHexString(ownerId);
  //parsing assignee's id
  const assignee = Types.ObjectId.createFromHexString(assigneeId);
  const newTask = new Task({
    title,
    priority,
    checklist: checklistItems,
    owner,
    assignee,
  });
  await newTask.save();
  res.status(201).json({ message: "Task created successfully" });
});

//Tasks for specific users
router.get("/user/:userid", async (req, res) => {
  const { userid } = req.params;
  //TODO: Better solution for this one
  const assignedTasks = await Task.where("assignee").equals(userid);
  let tasks = await Task.where("owner").equals(userid);
  tasks = [...assignedTasks, ...tasks];
  if (tasks) {
    res.status(200).json({ tasks });
  } else {
    res.json({
      message: "No tasks found",
    });
  }
});

module.exports = router;
