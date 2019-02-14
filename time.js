const config = require('./config.json').timezone

function checkTimeZone(index) {
  // testing purpose.
  if (index < 0) {
    return 'ontime';
  }
  let now = new Date();
  let sessionStartTime = new Date();
  // Move now to GMT+8.
  const TIMEZONEDIFF = 8;
  now.setHours(now.getUTCHours() + TIMEZONEDIFF);

  let minutes = 0;
  if (index <= config.lastMorningSessionIndex){
    sessionStartTime.setHours(config.startTime.morning.hour);
    sessionStartTime.setMinutes(config.startTime.morning.min);
    minutes = 30 * (index - 1);
  }
  else {
    sessionStartTime.setHours(config.startTime.afternoon.hour);
    sessionStartTime.setMinutes(config.startTime.afternoon.min);
    minutes = 30 * (index - 1 - config.lastMorningSessionIndex);
  }
  sessionStartTime = addMinutes(sessionStartTime, minutes);
  sessionEndTime = addMinutes(sessionStartTime, 30);
  // Minutes off set.
  let timeOffsetMinute = -5
  sessionStartTime = addMinutes(sessionStartTime, timeOffsetMinute);
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

module.exports = {
  checkTimeZone: checkTimeZone,
}
