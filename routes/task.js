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
  try {
    //Fetch tasks for month and week
    const fetchTasks = async (user, startDate, endDate) => {
      const tasks = await Task.find({
        $or: [{ owner: user }, { assignee: user }, { member: user }],
      })
        .populate("assignee", "name email")
        .populate("member", "name email")
        .select("-__v")
        .sort({ createdAt: 1 })
        .where({
          $and: [
            { createdAt: { $gte: startDate } },
            { createdAt: { $lte: endDate } },
          ],
        });

      return tasks;
    };

    let allTasks, start, end;
    if (dateFilter === "week") {
      const { startDate, endDate } = getCurrentWeek();
      start = startDate;
      end = endDate;
    } else if (dateFilter === "month") {
      const { startDate, endDate } = getCurrentMonth();
      start = startDate;
      end = endDate;
    } else if (dateFilter === "today") {
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      start = startDate;
      end = endDate;
    } else {
      return res.status(400).json({
        message: "Please select valid filter",
      });
    }
    allTasks = await fetchTasks(req.user, start, end);

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
  } catch (err) {
    res
      .status(500)
      .json({ message: "Something went wrong. Please try again." });
  }
});

//Creating a new task
router.post("/new", authMiddleware, async (req, res) => {
  const owner = req.user;
  try {
    let data = {
      ...req.body,
      owner,
    };
    const newTask = new Task(data);

    await newTask.save();
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Please try again" });
  }

  return res.status(201).json({ message: "Task created successfully" });
});

//all tasks
router.get("/", async (req, res) => {
  try {
    let tasks = await Task.find({});
    if (tasks) {
      return res.status(200).json({ tasks });
    }
    return res.status(404).json({
      message: "No tasks found",
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Something went wrong. Please try again." });
  }
});

//Get a specific task readonly
router.get("/specific/:taskId", async (req, res) => {
  const { taskId } = req.params;
  try {
    const getTask = await Task.findById(taskId).select(
      "-__v -_id -owner -assignee -member -createdAt"
    );
    if (!getTask) {
      return res.status(404).json({
        message: "Task doesn't exist or was deleted",
      });
    }
    return res.status(200).json({
      getTask,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Something went wrong. Please try again." });
  }
});

//Delete a task
router.delete("/:taskId", authMiddleware, async (req, res) => {
  const id = req.params.taskId;
  try {
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }
    if (
      req.user.toString() !== task.owner.toString() &&
      req.user.toString() !== task?.assignee?.toString() &&
      req.user.toString() !== task?.member?.toString()
    ) {
      return res.status(401).json({
        message: "You are not authorized to delete this task",
      });
    }
    await Task.findByIdAndDelete(id);
    res.status(200).json({
      message: "Task deleted successfully",
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Something went wrong. Please try again." });
  }
});

//Update a task
router.put("/:taskId", authMiddleware, async (req, res) => {
  const { taskId } = req.params;
  const owner = req.user;
  const data = { ...req.body, owner };
  let task = await Task.findById(taskId);
  if (!task) {
    return res.status(404).json({
      message: "Task not found",
    });
  }

  if (
    owner.toString() !== task.owner.toString() &&
    owner.toString() !== task?.assignee?.toString() &&
    owner.toString() !== task?.member?.toString()
  ) {
    return res.status(401).json({
      message: "You are not authorized to edit this task",
    });
  }

  try {
    task = await Task.findByIdAndUpdate(taskId, data, { new: true });
    return res.status(200).json(task);
  } catch (err) {
    return res.status(500).json({
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
            {
              member: Types.ObjectId.createFromHexString(req.user),
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
            {
              member: Types.ObjectId.createFromHexString(req.user),
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
            {
              member: Types.ObjectId.createFromHexString(req.user),
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
      duedate: dueDateTasks[0]?.count || 0,
    };

    categories.forEach((item) => {
      const key = item._id.replace("-", "");
      allCount[key] = item.count;
    });

    priorities.forEach((item) => {
      const key = item._id.replace("-", "");
      allCount[key] = item.count;
    });

    return res.status(200).json(allCount);
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Something went wrong. Please try again." });
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
    req.user.toString() !== task?.assignee?.toString() &&
    req.user.toString() !== task?.member?.toString()
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

router.patch("/list/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { listId, value } = req.body;

  let task = await Task.findById(id);
  if (!task) {
    return res.status(404).json({
      message: "Task not found",
    });
  }

  if (
    req.user.toString() !== task.owner.toString() &&
    req.user.toString() !== task?.assignee?.toString() &&
    req.user.toString() !== task?.member?.toString()
  ) {
    return res.status(401).json({
      message: "You are not authorized to edit this task",
    });
  }

  try {
    task = await Task.findOneAndUpdate(
      { _id: id, "checklist._id": listId },
      { $set: { "checklist.$.completed": value } },
      { new: true }
    );
    return res.status(200).json(task);
  } catch (err) {
    return res.status(400).json({
      message: "Couldn't update task. Please try again",
    });
  }
});

router.patch("/member", authMiddleware, async (req, res) => {
  const memberId = req.body?._id;
  const { user } = req;
  const owner = Types.ObjectId.createFromHexString(user);

  try {
    const allTasks = await Task.updateMany(
      { owner },
      { $set: { member: memberId } },
      { new: true }
    );
    return res.status(200).json({ message: "Member added to board" });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Something went wrong, please try again" });
  }
});
module.exports = router;
