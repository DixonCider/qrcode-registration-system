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
