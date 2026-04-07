const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
    fullName: String,
    gender: String,
    dob: Date,
    age: Number,
    address: String,
    cityState: String,
    learningLevel: String,
    language: String,
    school: String,
    interests: [String],

    diagnosis: String,
    severity: String,
    therapy: [String],
    fitness: String,

    parentName: String,
    relation: String,
    contact: String,
    email: String,
    occupation: String,
    emergency: String,

    photoPath: String,
    medicalReportPath: String
}, { timestamps: true, collection: 'register' });

module.exports = mongoose.model('Registration', registrationSchema);
