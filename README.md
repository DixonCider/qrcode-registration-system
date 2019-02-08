# QRcode Registration System

## Installation
1. Install npm packages.
```
npm install
```
2. Place the certification key in proper location (default `./sslcert/`). Can path change in `index.js`. Must contain two files `.key` and `.crt`. This is for https for secure connection required to allow access for camera. 
3. Put in the mongoDB url in `index.js`.

## Workflow

### Student
1. Input student id at student login page.
2. Let admin scan qrcode for each counter.

### Admin
1. Input username and password at admin login page.
2. Allow camera access.
3. Scan student qrcode. (or manually type id)
4. Comment. (optional)
5. Press pass or fail. (Success alert will pop)
6. (For card counter) If student all pass, will pop "All pass" alert when scan qrcode.

## API Documentation

### Query student information (POST)
Returns an instance of student collection from database.
#### Resource URL
`/studentInfo`
#### Parameters
Name|Required|Description|Default Value|Example
---|---|---|---|---
`id`|required|student id of the target||A00000000
#### Example request
```
curl --data "id=A0000000" http://localhost:8080/studentInfo
```
#### Example response
```=javascript
{
    "_id":"5b908251a207860004c3e75a",
    "englishName":"Bobby",
    "chineseName":"王小明",
    "timeSection":1,
    "id":"A00000000",
    "isChinese":true,
    "isVisiting":false,
    "commentLog":"",
    "receipt":true,
    "health":true,
    "insurance":true,
    "plane":true,
    "visiting":false,
    "emergency":true,
    "card":false,
    "isEntered":true,
    "entryFee":true,
    "__v":0
}
```

### Render student login page (GET)
Renders student login page.
#### Resource URL
`/`

### Login student QRcode page (GET)
If target is valid, render QRcode page. Else, render student login page.
#### Resource URL
`/registration`
#### Parameters
Name|Required|Description|Default Value|Example
---|---|---|---|---
`id`|required|student id of the target||A00000000
#### Example request
```
curl http://localhost:8080/registration?id=A00000000
```

### Render admin login page (GET)
Renders admin login page.
#### Resource URL
`/adminLogin`
#### Example request
```
curl http://localhost:8080/adminLogin
```

### Login admin validation page (POST)
If username and password is valid, render validation page. Else, render admin login page.
#### Resource URL
`/adminInfo`
#### Parameters
Name|Required|Description|Default Value|Example
---|---|---|---|---
`username`|required|username of the target||insurance
`password`|required|password of the target||insurance
#### Example request
```
curl --data "username=card&password=card" http://localhost:8080/adminInfo
```

### Update student information (POST)
Updates the property of target student.
#### Resource URL
`/adminSetProperty`
#### Parameters
Name|Required|Description|Default Value|Example
---|---|---|---|---
`id`|required|student id of the target||A00000000
`serviceName`|required|property name to update||card
`password`|required|SHA256 hashed password of admin||`8367cd66fdd136bba8ba23f8805bb050dd6289401c8ec3b0be44a3c233eef90d`
`verdict`|required|verdict of pass or fail (boolean)||`true`
`comment`|required|comment regarding verdict (string)||Pass but have to provide more info later.
#### Example request
```
curl\
    --data "id=A00000000"\
    --data "serviceName=card"\
    --data "password=8367cd66fdd136bba8ba23f8805bb050dd6289401c8ec3b0be44a3c233eef90d"\
    --data "verdict=true"\
    --data "comment=Pass but have to provide more info later."\
    http://localhost:8080/adminSetProperty
```
#### Example response
If successfully modified, returns `Success`.
Else, currently will not return anything and keeps hanging. (To be fixed)

### Initialize database (GET)
Initializes database with files with hardcoded path
#### Resource URL
`/initDB`
#### Example request
```
curl http://localhost:8080/initDB
```
#### Example response
Returns `Database initialized.`

### Check all pass (POST)
Check whether target passed all the requirements for registration.
#### Resource URL
`/isAllPass`
#### Parameters
Name|Required|Description|Default Value|Example
---|---|---|---|---
`id`|required|student id of the target||A00000000
#### Example request
```
curl --data "id=A00000000" http://localhost:8080/isAllPass
```
#### Example response
If all pass, `Success=true` in post request response.
Else, `Sucess=false` in post request response.

## Quirks
* If user initially denied permission for camera, then ssl will remeber so have to remove manually the settings.
* Allow camera and javascript access in Safari settings.
* QRcode scanner won't work on android (still no fix).
* If student cannot render qrcode, try using other browser (Chrome usually works).

## Future improvements
* Let `isAllPass` return the missed counters instead of not returning anything when fail.
* When the admin scans qrcode, (default) send request to let student pass (to avoid forgetting to press pass).
* Enlarge font for counter display in student QRcode page (shrink qrcode?).
