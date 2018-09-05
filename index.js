const PowerVars = require('./PowerVars.js');
const Tresholds = require('./Tresholds.js');
const schedule = require('node-schedule');
const nordpool = require('nordpool');
const moment = require('moment-timezone');
const prices = new nordpool.Prices();
const config = require('./config');
const findStreak = require('findstreak');
const request = require('request');

const veryLowEvent = 1.5;
const lowEvent = 0.5;
const normEvent = 0;
const highEvent = -0.5;
const veryHighEvent = -1.5;

let myTZ = moment.tz.guess();
let jobs = [];

// get latest prices immediately
getPrices();

// Prices for tomorrow are published today at 12:42 CET or later
// (http://www.nordpoolspot.com/How-does-it-work/Day-ahead-market-Elspot-/)
// update prices at 13:00 UTC
let cronPattern = moment.tz('18:00Z', 'HH:mm:Z', myTZ).format('m H * * *');
// cronPattern = '* */12 * * *';
// console.log(cronPattern);
let getPricesJob = schedule.scheduleJob(cronPattern, getPrices);

function getPrices() {
  prices.hourly(config, (error, results) => {
    if (error) {
      console.error(error);
      return;
    }
    let powerVars = getPowerVars(results);
    if (powerVars === null) {
      return;
    }
    let tresholds = getTresholds(powerVars);

    let events = [];
    let tmpHours = [];
    let previousEvent = normEvent;
    results.forEach((item, index) => {
      item.date.tz(myTZ);
      if (config.vatPercent) {
        item.value = Math.round(item.value * (100 + config.vatPercent))/100;
      }
      if (item.value > tresholds.veryHighTreshold) {
        item.event = veryHighEvent;
      }
      else if (item.value > tresholds.highTreshold) {
        item.event = highEvent;
      }
      else if (item.value < tresholds.veryLowTreshold) {
        item.event = veryLowEvent;
      }
      else if (item.value < tresholds.lowTreshold) {
        item.event = lowEvent;
      }
      else {
        item.event = normEvent;
      }
      // treshold crossed; let's see what we have stored...
      if (item.event != previousEvent) {
        var max = 24;
        var lo = false;
        if (previousEvent == highEvent || previousEvent == veryHighEvent) {
          max = config.maxHighHours;
        }
        else if (previousEvent == lowEvent || previousEvent == veryLowEvent) {
          max = config.maxLowHours;
          var lo = true;
        }
        let rf = (a, b) => a + b.value;
        // stored values exist
        if (tmpHours.length > 0) {
          // find correct number of hours
          let streak = findStreak(tmpHours, max, rf, lo);
          // no events for the first normal streak 
          if ((events.length > 0) || (previousEvent != normEvent)) {
            // create an event from the first hour in the streak
            events.push(streak[0]);
          }
          // if only some of the stored hours were included in the streak,
          // mark the rest of the hours as normal and trigger events
          if ((previousEvent != normEvent) && (streak.length < tmpHours.length)) {
            let firstIndex = streak[0].date.get('hours') - tmpHours[0].date.get('hours');
            let lastIndex = firstIndex + streak.length;
            // hours were clipped from the beginning of stored hours
            if (firstIndex > 0) {
              tmpHours[0].event = normEvent;
              events.push(tmpHours[0]);
            }
            // hours were clipped from the end of stored hours
            if (tmpHours.length > lastIndex) {
              tmpHours[lastIndex].event = normEvent;
              events.push(tmpHours[lastIndex]);
            }
          }
        }
        // start a new treshold interval
        previousEvent = item.event;
        tmpHours = [];
      }
      // last hour in the Nordpool results, create event at the first stored hour
      else if (index == results.length - 1) {
        events.push(tmpHours[0]);
      }
      // store all items in the current treshold interval
      tmpHours.push(item);
    });
    events.forEach(item => {
      jobs.push(schedule.scheduleJob(item.date.toDate(), trigger.bind(null, item)));
      console.log(item.date.format('HH:mm:ss DD-MM-YYYY'), item.value, item.event)
    });
  });
}

function getTresholds(powerVars) {
  if (powerVars instanceof PowerVars === false) {
    console.error('Wrong type!');
    return null;
  }

  let veryHighTreshold = Math.round(powerVars.average * 2);
  let highTreshold = Math.round(powerVars.average + ((powerVars.max - powerVars.average) / 2));
  if (highTreshold > veryHighTreshold) {
    let temp = veryHighTreshold;
    highTreshold = veryHighTreshold;
    veryHighTreshold = temp;
  }

  let veryLowTreshold = Math.round(powerVars.average / 2);
  let lowTreshold = Math.round(powerVars.average - ((powerVars.average - powerVars.min) / 2));
  if (lowTreshold < veryLowTreshold) {
    let temp = veryLowTreshold;
    lowTreshold = veryLowTreshold;
    veryLowTreshold = temp;
  }
  let treshold = new Tresholds(veryLowTreshold, lowTreshold, highTreshold, veryHighTreshold);
  return treshold;
}

function getPowerVars(results) {
  if (results === null) {
    console.error('Results is none!');
    return null
  }
  let counter = 0;
  let value = 0;

  let average = null;
  let min = null;
  let max = null;

  results.forEach((item, index) => {
    counter++;
    value += item.value;

    if (min === null || item.value < min) {
      min = item.value
    }
    if (max === null || item.value > max) {
      max = item.value
    }
  });

  average = Math.round(value / counter);

  if (average === null) {
    console.error('Average is null...');
    return null;
  }
  return new PowerVars(average, min, max);;
}

function trigger(item) {
  dateStr = item.date.format('HH:mm:ss DD-MM-YYYY')
  let values = {
    state: item.value,
    attributes: {
      'friendly_name': 'Temperature offset',
      'power_offset': item.event
    },
    last_changed: dateStr,
    last_updated: dateStr,
    unit_of_measurement: config.currency + '/MWh',
    from_date: item.date.format('HH:mm')
  };

  var opts = {
    url: config.hassUrl + 'api/states/' + config.hassSensorName,
    json: true,
    body: values,
    headers: {
      'x-ha-access': config.hassPassword,
      'Content-Type': 'application/json',
    }
  };
  request.post(opts, function(err, res) {
    if (err) {
      console.error(err);
      return;
    }
    console.log('Success! New value: ' + item.value + ', ' + res.body)
  })
}