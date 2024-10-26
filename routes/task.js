const express = require("express");
const router = express.Router();
const { Task } = require("../schemas/task.schema");
const { Types } = require("mongoose");
const authMiddleware = require("../middleware/auth");
const getCurrentWeek = require("../utils/getCurrentWeek");
const getCurrentMonth = require("../utils/getCurrentMonth");

//Getting all the tasks as per category and filter
router.get("/user/:dateFilter", authMiddleware, async (req, res) => {
  const { dateFilter } = req.params;

  //Fetch tasks for month and week
  const fetchTasks = async (user, startDate, endDate) => {
    const tasks = await Task.find({
      $or: [{ owner: user }, { assignee: user }],
    })
      .select("-__v")
      .sort({ createdAt: 1 })
      .where({
        $and: [
          { createdAt: { $gt: startDate } },
          { createdAt: { $lt: endDate } },
        ],
      });

    return tasks;
  };

  let allTasks;
  if (dateFilter === "week") {
    const { startDate, endDate } = getCurrentWeek();
    allTasks = await fetchTasks(req.user, startDate, endDate);
  } else if (dateFilter === "month") {
    const { startDate, endDate } = getCurrentMonth();
    allTasks = await fetchTasks(req.user, startDate, endDate);
    console.log(allTasks);
  } else {
    allTasks = await Task.find({
      $or: [{ owner: req.user }, { assignee: req.user }],
    })
      .select("-__v")
      .sort({ createdAt: 1 });
  }

  if (!allTasks) {
    return res.status(404).json({
      message: "No tasks found",
    });
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
  const owner = req.user;
  //Splitting checklist items
  const checklistItems = checklist.split(",").map((item) => item.trim());
  //date format
  const dDate = duedate ? new Date(duedate) : null;
  //parsing assignee's id
  const assignee = assigneeId
    ? Types.ObjectId.createFromHexString(assigneeId)
    : null;
  const newTask = new Task({
    title,
    priority,
    checklist: checklistItems,
    owner,
    assignee,
    duedate: dDate,
  });

  await newTask.save();
  return res.status(201).json({ message: "Task created successfully" });
});

//all tasks
router.get("/", async (req, res) => {
  let tasks = await Task.find({});
  console.log(tasks);
  if (tasks) {
    return res.status(200).json({ tasks });
  }
  return res.status(404).json({
    message: "No tasks found",
  });
});

//Get a specific task
router.get("/specific/:taskId", async (req, res) => {
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

//Delete a task
router.delete("/:taskId", authMiddleware, async (req, res) => {
  const id = req.params.taskId;
  const task = await Task.findById(id);
  if (!task) {
    return res.status(404).json({
      message: "Task not found",
    });
  }

  if (
    req.user.toString() !== task.owner.toString() &&
    req.user.toString() !== task?.assignee?.toString()
  ) {
    return res.status(401).json({
      message: "You are not authorized to delete this task",
    });
  }

  await Task.findByIdAndDelete(id);
  res.status(200).json({
    message: "Task deleted successfully",
  });
});

//Update a task
router.put("/:taskId", authMiddleware, async (req, res) => {
  const { taskId } = req.params;
  const { title, priority, checklist, assigneeId, duedate, category } =
    req.body;
  const owner = req.user;
  //Splitting checklist items
  const checklistItems = checklist.split(",").map((item) => item.trim());

  let task = await Task.findById(taskId);
  if (!task) {
    return res.status(404).json({
      message: "Task not found",
    });
  }

  if (
    req.user.toString() !== task.owner.toString() &&
    req.user.toString() !== task?.assignee?.toString()
  ) {
    return res.status(401).json({
      message: "You are not authorized to edit this task",
    });
  }

  //date format
  const dDate = duedate ? new Date(duedate) : task.duedate;
  //parsing assignee's id
  const assignee = assigneeId
    ? Types.ObjectId.createFromHexString(assigneeId)
    : task.assignee;

  try {
    task = await Task.findByIdAndUpdate(
      taskId,
      {
        title,
        priority,
        checklist: checklistItems,
        assignee,
        duedate: dDate,
        category,
      },
      { new: true }
    );
    return res.status(200).json(task);
  } catch (err) {
    return res.status(400).json({
      message: "Couldn't update task. Please try again",
    });
  }
});

//Grouping tasks
router.get("/analytics/all", authMiddleware, async (req, res) => {
  //sorting as per category
  try {
    const categories = await Task.aggregate([
      {
        $match: {
          $or: [
            {
              owner: Types.ObjectId.createFromHexString(req.user),
            },
            {
              assignee: Types.ObjectId.createFromHexString(req.user),
            },
          ],
        },
      },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
    ]);

    const priorities = await Task.aggregate([
      {
        $match: {
          $or: [
            {
              owner: Types.ObjectId.createFromHexString(req.user),
            },
            {
              assignee: Types.ObjectId.createFromHexString(req.user),
            },
          ],
        },
      },
      {
        $group: {
          _id: "$priority",
          count: { $sum: 1 },
        },
      },
    ]);

    const dueDateTasks = await Task.aggregate([
      {
        $match: {
          $or: [
            {
              owner: Types.ObjectId.createFromHexString(req.user),
            },
            {
              assignee: Types.ObjectId.createFromHexString(req.user),
            },
          ],
          duedate: { $ne: null },
        },
      },
      {
        $count: "count",
      },
    ]);

    //creating single object for all tasks
    let allCount = {
      duedate: dueDateTasks[0].count,
    };

    categories.forEach((item) => {
      const key = item._id.replace("-", "");
      allCount[key] = item.count;
    });

    priorities.forEach((item) => {
      const key = item._id.replace("-", "");
      allCount[key] = item.count;
    });

    console.log(allCount);

    return res.status(200).json(allCount);
  } catch (error) {
    console.log(error);
    return res.status(500);
  }
});

//Change category
router.patch("/edit/:id/:category", authMiddleware, async (req, res) => {
  const { id, category } = req.params;

  let task = await Task.findById(id);
  if (!task) {
    return res.status(404).json({
      message: "Task not found",
    });
  }

  if (
    req.user.toString() !== task.owner.toString() &&
    req.user.toString() !== task?.assignee?.toString()
  ) {
    return res.status(401).json({
      message: "You are not authorized to edit this task",
    });
  }

  try {
    task = await Task.findByIdAndUpdate(id, { category }, { new: true });
    return res.status(200).json(task);
  } catch (err) {
    return res.status(400).json({
      message: "Couldn't update task. Please try again",
    });
  }
});

module.exports = router;
