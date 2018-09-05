
# Check Nordpool energy prices and send thermostat tresholds to Home Assistant
Gets day-ahead prices from [Nordpool](http://www.nordpoolspot.com/Market-data1/Elspot/)

## Installation
    npm install nordpool-hass
    cd nordpool-hass
    cp config-sample.js config.js
    $EDITOR config.js

## Configuration
Configuration parameters:
- `area`: Set the area where you want to follow the prices. You can see
  Nordpool/Elspot areas at http://www.nordpoolspot.com/maps/
  Currently the active areas are BERGEN, DK1, DK2, EE, ELE, FRE, KR.SAND,
  KT, LT, LV, MOLDE, OSLO, SE, SE1, SE2, SE3, SE4, SYS, TR.HEIM and TROMSØ
- `currency`: Choose either `DKK`, `EUR`, `NOK` or `SEK`
- `maxHighHours`: If you use IFTTT to turn off heating when the energy price
  is high, you may want to limit the time your heating is off. If you set the
  `maxHighHours` to 3 and the energy price will be above your `highTreshold`
  for 7 hours, only the 3 most expensive consecutive hours will be triggered.
  Set to 24 if you want triggers for actual events.
- `maxLowHours`: Same as `maxHighHours` but for hours below `lowTreshold`.
  If you want to turn some appliances on when the price is lowest, but don't
  want or need to have them on for too long, setting `maxLowHours` to 2 will
  select the two cheapest hours from every cheap streak (consecutive hours
  when the price is below `lowTreshold`). Set to 24 if you don't need limits.
- `veryLowOffset`: Temperature offset when the price is very low.
- `lowOffset`: Temperature offset when the price is low.
- `highOffset`: Temperature offset when the price is high
- `veryHighOffset`: Temperature offset when the price is very high
- `hassPassword`: API password to Home Assistant
- `hassUrl`: URL to Home Assistant. Remember the slash
- `hassSensorName`: Name of the sensor

## Usage

Start script will run [PM2](http://pm2.keymetrics.io/) to keep the script running.

    npm start

Will create a sensor on Home Assistant server with the name from `hassSensorName`, e.g. `sensor.thermostat_treshold`.

Enjoy!
