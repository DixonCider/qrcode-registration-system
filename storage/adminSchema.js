var mongoose = require('mongoose');
const adminSchema = mongoose.Schema({
    serviceName: String,
    password: String
});

module.exports = adminSchema;
