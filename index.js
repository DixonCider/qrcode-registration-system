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

app.get('/studentLogin', function(req, res){
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
    Student.findOne({id: req.param('id')}, function(err, response){
        if (response !== null){
            let studentData = [];
            if(!response.plane && response.isChinese){
                studentData.push('Plane');
            }
            if(!response.receipt && response.isChinese){
                studentData.push('Receipt');
            }
            if(!response.emergency){
                studentData.push('Emergency Contact');
            }
            if(!response.health){
                studentData.push('Health Exam Sheet');
            }
            if(!response.insurance){
                studentData.push('Proof of Insurance');
            }
            if(!response.visiting && response.isVisiting){
                studentData.push('Visiting');
            }
            response.displayData = studentData;
            res.render('registration', { 'data': response });
        }
        else {
            res.redirect('/studentLogin');
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

// Database stuff.
var studentSchema = mongoose.Schema({
    englishName: String,
    chineseName: String,
    timeSection: Number,
    id: String,
    isChinese: Boolean,
    isVisiting: Boolean,
    commentLog: String,
    receipt: Boolean,
    health: Boolean,
    insurance: Boolean,
    plane: Boolean,
    visiting: Boolean,
    emergency: Boolean,
    card: Boolean
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
            isChinese: element.isChinese === undefined ? false : element.isChinese,
            isVisiting: element.isVisiting === undefined ? false : element.isVisiting,
            commentLog: element.commentLog === undefined ? "" : element.commentLog,
            receipt: element.receipt === undefined ? false : element.receipt,
            health: element.health === undefined ? false : element.health,
            insurance: element.insurance === undefined ? false : element.insurance,
            plane: element.plane === undefined ? false : element.plane,
            visiting: element.visiting === undefined ? false : element.visiting,
            emergency: element.emergency === undefined ? false : element.emergency,
            card: element.card === undefined ? false : element.card
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

app.get('*', function(req, res){
	res.send('Sorry, this is an invalid URL.');
});

var httpServer = http.createServer(app);
var httpsServer = https.createServer(credentials, app);

httpServer.listen(8081);
httpsServer.listen(8444);
