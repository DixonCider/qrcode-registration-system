var express = require('express');
var https = require('https');
var http = require('http');
var fs = require('fs');
var bodyParser = require('body-parser');
var multer = require('multer');
var cookieParser = require('cookie-parser');;
var mongoose = require('mongoose');
var sha256 = require('js-sha256').sha256;
var $ = require('jquery');
$.csv = require('./jquery.csv.js');
const dbWebUrl = 'mongodb://heroku_4tb37jv8:755bbs9nud5v68trfli5n8n04m@ds225902.mlab.com:25902/heroku_4tb37jv8'
const dbLocalUrl = 'mongodb://localhost/oia_db'
mongoose.connect(dbWebUrl);
var upload = multer();
var compression = require('compression');
var helmet = require('helmet');
var privateKey  = fs.readFileSync('sslcert/server.key', 'utf8');
var certificate = fs.readFileSync('sslcert/server.crt', 'utf8');
var credentials = {key: privateKey, cert: certificate};
var app = express();

app.set('view engine', 'pug');
app.set('views','./views');

app.use(express.static('public'));

// for parsing application/json
app.use(bodyParser.json()); 
// for parsing application/xwww-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true })); 

app.use(compression());
app.use(helmet());

app.get('/', function(req, res){
    res.render('student');
});

app.post('/studentInfo', function(req, res){
    // Query data base.
    Student.findOne({id: req.body.id},
        function(err, response){
            console.log(response);
            res.send(response);
    });
});

app.get('/registration', function(req, res){
    // Render registration page.
    Student.findOne({id: req.query.id}, function(err, response){
        if (response !== null){
            let passTimeZoneVerdict = checkTimeZone(response.timeSection);
            let passTimeZoneTest = passTimeZoneVerdict == 'ontime';
            if (passTimeZoneTest && !response.isEntered){
                // Update isEntered to TRUE.
                Student.updateOne(
                    {id: req.query.id},
                    {isEntered: true},
                    function(err, response){
                        console.log(response);
                    }
                );
            }
            if (passTimeZoneTest || response.isEntered){
                let studentData = [];
                if(!response.plane && response.isChinese){
                    studentData.push('[F] Flight Ticket');
                }
                if(!response.entryFee && response.isChinese){
                    studentData.push('[F] Entry Permit');
                }
                if(!response.receipt){
                    studentData.push('[I] Payment Receipt');
                }
                if(!response.emergency){
                    studentData.push('[E] Emergency Contact in Taiwan');
                }
                if(!response.health){
                    studentData.push('[H] NTU Health Exam Form and Form C');
                }
                if(!response.insurance){
                    studentData.push('[I] Insurance Proof');
                }
                if(!response.visiting && response.isVisiting){
                    studentData.push('[V] Visiting Student');
                }
                response.displayData = studentData;
                res.render('registration', { 'data': response });
            }
            else {
                if (passTimeZoneVerdict == 'early'){
                    res.send('Login time error. (too early) Please try again later.');
                }
                else if (passTimeZoneVerdict == 'late'){
                    res.send('Login time error. (too late) Please contact your regional coordinator for make-up registration.');   
                }
            }
        }
        else {
            // alert('Incorrect student information. Please try again.');
            res.redirect('/');
        }
    });
});

app.get('/adminLogin', function(req, res){
    res.render('admin_login');
});

app.post('/adminInfo', function(req, res){
    let username = req.body.username;
    let password = sha256(req.body.password);
    // Query database.
    Admin.findOne({serviceName: username, password: password}, function(err, response){
        if (response !== null){
            res.render('admin_validate', {
                'serviceName': response.serviceName,
                'key': response.password
            });
        }
        else {
            res.redirect('/adminLogin');
        }
    });
});

app.post('/adminSetProperty', function(req, res){
    // console.log(req.body);
    let id = req.body.id;
    let serviceName = req.body.serviceName;
    let password = req.body.password;
    let verdict = req.body.verdict;
    let comment = req.body.comment;
    let updateObj = {};
    updateObj[serviceName] = verdict == 'true';
    if (comment !== ''){
        updateObj.commentLog = comment;
    }
    let conditionObj = {'id': id};
    // Admin validation.
    Admin.findOne({serviceName: serviceName, password: password}, function(err, response){
        console.log(response);
        if (response !== null){
            Student.updateOne(
                conditionObj,
                updateObj,
                function(err, response){
                    console.log(response);
                    if (response !== null){
                        res.send('Success');
                    }
                }
            );
        }
    });
});

app.get('/initDB', function(req, res){
    let filePath = './db_input.csv';
    initDB(filePath);
    res.send('Database initialized.');
});

app.get('/test', function(req, res){
    // let filePath = './db_input.csv';
    // initDB(filePath);
    res.send('Test database initialized.');
});

app.post('/isAllPass', function(req, res){
    Student.findOne({id: req.body.id}, function(err, response){
        console.log(response);
        let allPass = true;
        if (response.isChinese && (!response.plane || !response.entryFee)){
            allPass = false;
        }
        if (response.isVisiting && !response.visiting){
            allPass = false;
        }
        if (!response.insurance){
            allPass = false;
        }
        if (!response.health){
            allPass = false;
        }
        if (!response.receipt){
            allPass = false;
        }
        if (!response.emergency){
            allPass = false;
        }
        if (allPass){
            res.send();
        }
        else {
            res.status(404).send({success: false, error: {message: 'No blah Found'}});
        }
    });
});

// Database stuff.
var studentSchema = mongoose.Schema({
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
var Student = mongoose.model("Student", studentSchema);
var adminSchema = mongoose.Schema({
    serviceName: String,
    password: String
});
var Admin = mongoose.model("Admin", adminSchema);
let adminPw = [
    { 'serviceName': 'receipt', 'password': sha256('receipt') },
    { 'serviceName': 'health', 'password': sha256('health') },
    { 'serviceName': 'insurance', 'password': sha256('insurance') },
    { 'serviceName': 'plane', 'password': sha256('plane') },
    { 'serviceName': 'visiting', 'password': sha256('visiting') },
    { 'serviceName': 'emergency', 'password': sha256('emergency') },
    { 'serviceName': 'card', 'password': sha256('card') },
    { 'serviceName': 'isEntered', 'password': sha256('isEntered') },
    { 'serviceName': 'entryFee', 'password': sha256('entryFee') },
];
function initDB(filePath){
    // Student.
    Student.remove({}).exec();
    fs.readFile(filePath, 'utf-8', function(err, data) {  
        if (err) throw err;
        let csv = $.csv.toObjects(data);
        let students = csv.map(element => new Student({
            englishName: element.englishName,
            chineseName: element.chineseName,
            timeSection: element.timeSection,
            id: element.id,
            // isChinese: element.isChinese,
            isChinese: element.isChinese === undefined || element.isChinese === null ? false : element.isChinese == 'true',
            isVisiting: element.isVisiting === undefined || element.isVisiting === null ? false : element.isVisiting == 'true',
            commentLog: element.commentLog === undefined || element.commentLog === null ? "" : element.commentLog,
            receipt: element.receipt === undefined || element.receipt === null ? false : element.receipt == 'true',
            health: element.health === undefined || element.health === null ? false : element.health == 'true',
            insurance: element.insurance === undefined || element.insurance === null ? false : element.insurance == 'true',
            plane: element.plane === undefined || element.plane === null ? false : element.plane == 'true',
            visiting: element.visiting === undefined || element.visiting === null ? false : element.visiting == 'true',
            emergency: element.emergency === undefined || element.emergency === null ? false : element.emergency == 'true',
            card: element.card === undefined || element.card === null ? false : element.card == 'true',
            isEntered: element.isEntered === undefined || element.isEntered === null ? false : element.isEntered == 'true',
            entryFee: element.entryFee === undefined || element.entryFee === null ? false : element.entryFee == 'true'
        }));
        students.forEach(x => {
            x.save(function(err){
                if(err) throw err;
            });
        });
    });
    // Admin.
    Admin.remove({}).exec();
    let admins = adminPw.map(element => new Admin({
        serviceName: element.serviceName,
        password: element.password
    }));
    admins.forEach(x => {
        x.save(function(err){
            if (err) throw err;
        })
    });
}

// Timezone stuff.
function checkTimeZone(index) {
    // Have to remove!!
    return 'ontime';
    let now = new Date();
    let sessionStartTime = new Date();
    // Move now to GMT+8.
    const TIMEZONEDIFF = 8;
    now.setHours(now.getUTCHours() + TIMEZONEDIFF);

    let minutes = 0;
    if (index <= 4){
        sessionStartTime.setHours(10);
        sessionStartTime.setMinutes(0);
        minutes = 30 * (index - 1);
    }
    else {
        sessionStartTime.setHours(13);
        sessionStartTime.setMinutes(30);
        minutes = 30 * (index - 5);
    }
    sessionStartTime = addMinutes(sessionStartTime, minutes);
    sessionEndTime = addMinutes(sessionStartTime, 30);
    if (sessionStartTime > now){
        return 'early';
    }
    else if (sessionEndTime < now){
        return 'late';
    }
    else {
        return 'ontime';
    }
}
function addMinutes(date, minutes) {
    return new Date(date.getTime() + minutes*60000);
}

app.get('*', function(req, res){
	res.send('Sorry, this is an invalid URL.');
});
// Start server.
var port = process.env.PORT || 8080; // Used by Heroku and http on localhost
process.env['PORT'] = process.env.PORT || 8444; // Used by https on localhost

http.createServer(app).listen(port, function () {
    console.log("Express server listening on port %d in %s mode", this.address().port, app.settings.env);
});

// Run separate https server if on localhost
if (process.env.NODE_ENV != 'production') {
    https.createServer(credentials, app).listen(process.env.PORT, function () {
        console.log("Express server listening with https on port %d in %s mode", this.address().port, app.settings.env);
    });
};

if (process.env.NODE_ENV == 'production') {
    app.use(function (req, res, next) {
        res.setHeader('Strict-Transport-Security', 'max-age=8640000; includeSubDomains');
        if (req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] === "http") {
            return res.redirect(301, 'https://' + req.host + req.url);
        } else {
            return next();
            }
    });
} else {
    app.use(function (req, res, next) {
        res.setHeader('Strict-Transport-Security', 'max-age=8640000; includeSubDomains');
        if (!req.secure) {
            return res.redirect(301, 'https://' + req.host  + ":" + process.env.PORT + req.url);
        } else {
            return next();
            }
    });
};
/*
var httpServer = http.createServer(app);
var httpsServer = https.createServer(credentials, app);

httpServer.listen(8081);
httpsServer.listen(8444);
*/
