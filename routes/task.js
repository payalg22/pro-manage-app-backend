const express = require("express");
const router = express.Router();
const { Task } = require("../schemas/task.schema");
const { User } = require("../schemas/user.schema");
const { Types } = require("mongoose");
const authMiddleware = require("../middleware/auth");
const getCurrentWeek = require("../utils/getCurrentWeek");
const getCurrentMonth = require("../utils/getCurrentMonth");

//Getting all the tasks as per category and filter
//TODO: create single function for getting the schema for week and month
router.get("/:filter", authMiddleware, async (req, res) => {
  const owner = await User.findOne({ email: req.user.email }).select("_id");
  const { filter } = req.params;
  console.log(req.user);
  let allTasks;
  if (filter === "week") {
    const { startDate, endDate } = getCurrentWeek();
    allTasks = await Task.find({
      $or: [{ owner }, { assignee: owner }],
    })
      .select("-__v")
      .sort({ createdAt: 1 })
      .where({
        $and: [
          { createdAt: { $gt: startDate } },
          { createdAt: { $lt: endDate } },
        ],
      });
  } else if (filter === "month") {
    const { startDate, endDate } = getCurrentMonth();
    allTasks = await Task.find({
      $or: [{ owner }, { assignee: owner }],
    })
      .select("-__v")
      .sort({ createdAt: 1 })
      .where({
        $and: [
          { createdAt: { $gt: startDate } },
          { createdAt: { $lt: endDate } },
        ],
      });
  } else {
    allTasks = await Task.find({
      $or: [{ owner }, { assignee: owner }],
    })
      .select("-__v")
      .sort({ createdAt: 1 });
  }

  const backlogTasks = allTasks.filter((task) => task.category === "backlog");
  const toDoTasks = allTasks.filter((task) => task.category === "to-do");
  const inProgressTasks = allTasks.filter(
    (task) => task.category === "in-progress"
  );
  const doneTasks = allTasks.filter((task) => task.category === "done");

  return res.status(200).json({
    backlogTasks,
    toDoTasks,
    inProgressTasks,
    doneTasks,
  });
});

//Creating a new task
router.post("/new", authMiddleware, async (req, res) => {
  const { title, priority, checklist, assigneeId, duedate } = req.body;
  const owner = await User.findOne({ email: req.user.email }).select("_id");
  //Splitting checlist items
  const checklistItems = checklist.split(",").map((item) => item.trim());
  const dDate = new Date(duedate);
  //parsing owner id
  //const owner = Types.ObjectId.createFromHexString(ownerId);
  //parsing assignee's id
  let newTask;
  if (assigneeId) {
    const assignee = Types.ObjectId.createFromHexString(assigneeId);
    newTask = new Task({
      title,
      priority,
      checklist: checklistItems,
      owner,
      assignee,
      duedate: dDate,
    });
  } else {
    newTask = new Task({
      title,
      priority,
      checklist: checklistItems,
      owner,
      duedate: dDate,
    });
  }

  await newTask.save();
  return res.status(201).json({ message: "Task created successfully" });
});

//Tasks for specific users
router.get("/user/:userid", async (req, res) => {
  let { userid } = req.params;
  userid = Types.ObjectId.createFromHexString(userid);
  let tasks = await Task.find({
    $or: [{ owner: userid }, { assignee: userid }],
  });
  console.log(tasks);
  if (tasks) {
    return res.status(200).json({ tasks });
  }
  return res.status(404).json({
    message: "No tasks found",
  });
});

//Get a specific task
router.get("/:taskId", async (req, res) => {
  const { taskId } = req.params;
  const getTask = await Task.findById(taskId).select("-__v");
  if (!getTask) {
    return res.status(404).json({
      message: "Task doesn't exist or was deleted",
    });
  }
  return res.status(200).json({
    getTask,
  });
});

module.exports = router;
