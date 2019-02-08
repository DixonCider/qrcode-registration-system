var mongoose = require('mongoose');
const studentSchema = mongoose.Schema({
    englishName: String,
    chineseName: String,
    timeSection: Number,
    id: String,
    isChinese: Boolean,
    isVisiting: Boolean,
    commentLog: String,
    entryFee: Boolean,
    receipt: Boolean,
    health: Boolean,
    insurance: Boolean,
    plane: Boolean,
    visiting: Boolean,
    emergency: Boolean,
    card: Boolean,
    isEntered: Boolean
});

module.exports = studentSchema;
