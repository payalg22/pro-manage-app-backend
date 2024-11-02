const mongoose = require("mongoose");
const { Schema, model, SchemaTypes } = mongoose;

const checklistSchema = new Schema({
  content: String,
  completed: {
    type: Boolean,
    default: false,
  },
});

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
  member: {
    type: SchemaTypes.ObjectId,
    ref: "User",
    default: null,
  },
  owner: {
    type: SchemaTypes.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  checklist: [checklistSchema],
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
