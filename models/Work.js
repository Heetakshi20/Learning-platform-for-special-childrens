const mongoose = require("mongoose");

const workSchema = new mongoose.Schema({

  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  studentName: String,

  imageUrl: String,

  createdAt: {
    type: Date,
    default: Date.now
  }

});

module.exports = mongoose.model("Work", workSchema);