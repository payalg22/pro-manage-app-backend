const mongoose = require("mongoose");
const { Schema, model, SchemaTypes } = mongoose;

const taskSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  priority: {
    type: String,
    required: true,
    enum: ["high", "moderate", "low"],
  },
  assignee: {
    type: SchemaTypes.ObjectId,
    ref: "User",
  },
  owner: {
    type: SchemaTypes.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  checklist: [
    {
      type: String,
      required: true,
    },
  ],
  category: {
    type: String,
    enum: ["backlog", "to-do", "in-progress", "done"],
    default: "to-do",
  },
  duedate: {
    type: Date,
  },
});

const Task = new model("Task", taskSchema);

module.exports = { Task };
