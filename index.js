// Config parameters.
const config = require('./config.json')

var express = require("express")
var https = require("https")
var http = require("http")
var fs = require("fs")
var bodyParser = require('body-parser');
var multer = require('multer');
var cookieParser = require('cookie-parser');
var mongoose = require('mongoose');
var sha256 = require('js-sha256').sha256;

var $ =require('jquery');
var csv = require('./jquery.csv.js');
var studentSchema = require('./storage/studentSchema.js')
var adminSchema = require('./storage/adminSchema.js')
var timezone = require('./time.js');

if (process.env.NODE_ENV != 'production') {
  mongoose.connect(config.development.dbUrl);
}
else {
  mongoose.connect(process.env.MONGODB_URI);
}
var upload = multer();
var compression = require('compression');
var helmet = require('helmet');
var privateKey  = fs.readFileSync(config.general.serverKeyPath, 'utf8');
var certificate = fs.readFileSync(config.general.serverCrtPath, 'utf8');
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
    console.log(req.body);
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
            let passTimeZoneVerdict = timezone.checkTimeZone(response.timeSection);
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
                    studentData.push('C. Flight Ticket');
                }
                if(!response.entryFee && response.isChinese){
                    studentData.push('C. Entry Permit');
                }
                if(!response.receipt && !response.isVisiting){
                    studentData.push('I. Payment Receipt');
                }
                if(!response.emergency){
                    studentData.push('E. Emergency Contact in Taiwan and International Student Declaration Form');
                }
                if(!response.health){
                    studentData.push('H. NTU Health Exam Form and Form C');
                }
                if(!response.insurance && !response.isVisiting){
                    studentData.push('I. Insurance Proof');
                }
                if(!response.visiting && response.isVisiting){
                    studentData.push('V. Visiting Student');
                }
                // Shuffle to avoid everyone in same counter.
                var currentIndex = studentData.length, temporaryValue, randomIndex;
                // While there remain elements to shuffle...
                while (0 !== currentIndex) {
                    // Pick a remaining element...
                    randomIndex = Math.floor(Math.random() * currentIndex);
                    currentIndex -= 1;
                    // And swap it with the current element.
                    temporaryValue = studentData[currentIndex];
                    studentData[currentIndex] = studentData[randomIndex];
                    studentData[randomIndex] = temporaryValue;
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
    initDB(config.general.studentInfoPath, config.general.adminInfoPath);
    res.send('Database initialized.');
});

app.post('/isAllPass', function(req, res){
    Student.findOne({id: req.body.id}, function(err, response){
        console.log(response);
        let allPass = true;
        let notPassed = []
        if (response.isChinese && (!response.plane || !response.entryFee)){
            allPass = false;
            notPassed.push('plane or entryfee');
        }
        if (response.isVisiting && !response.visiting){
            allPass = false;
            notPassed.push('visiting');
        }
        if (!response.insurance && !response.isVisiting){
            allPass = false;
            notPassed.push('insurance');
        }
        if (!response.health){
            allPass = false;
            notPassed.push('health');
        }
        if (!response.receipt && !response.isVisiting){
            allPass = false;
            notPassed.push('receipt');
        }
        if (!response.emergency){
            allPass = false;
            notPassed.push('emergency');
        }
        res.send({
          'verdict': allPass,
          'notPassedList': notPassed
        });
        /*
        if (allPass){
            res.send();
        }
        else {
            res.status(404).send({success: false, error: {message: 'No blah Found'}});
        }
        */
    });
});

// Database stuff.

var Student = mongoose.model("Student", studentSchema);
var Admin = mongoose.model("Admin", adminSchema);

function initDB(studentInfoFilePath, adminInfoFilePath){
    // Student.
    Student.remove({}).exec()
      .then(() => {
        fs.readFile(studentInfoFilePath, 'utf-8', function(err, data) {  
          if (err) throw err;
          let csvData = csv.toObjects(data);
          let students = csvData.map(element => new Student({
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
      })
    // Admin.
    Admin.remove({}).exec()
      .then(() => {
        fs.readFile(adminInfoFilePath, 'utf-8', function(err, data) {  
          if (err) throw err;
          let csvData = csv.toObjects(data);
          console.log(csvData)
          let admins = csvData.map(element => new Admin({
            serviceName: element.serviceName,
            password: sha256(element.password)
          }));
          console.log(admins)
          admins.forEach(x => {
            x.save(function(err){
              if (err) throw err;
            })
          });
        });
      })
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
