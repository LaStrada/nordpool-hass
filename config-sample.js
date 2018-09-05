module.exports = {
  area: 'Tr.heim', // see http://www.nordpoolspot.com/maps/
  currency: 'NOK', // can also be 'DKK', 'NOK', 'SEK'
  maxHighHours: 4, // max consecutive high hours
  maxLowHours: 24, // max consecutive low hours
  veryLowOffset: 1.5, // Temperature offset when the price is very low
  lowOffset: 0.5, // Temperature offset when the price is low
  highOffset: -0.5,  // Temperature offset when the price is high
  veryHighOffset: -1.5, // Temperature offset when the price is very high
  hassPassword: 'PASSWORD', // API password to Home Assistant
  hassUrl: 'http://www.example.com/', // URL to Home Assistant. Remember the slash
  hassSensorName: 'sensor.power_price' // Name of the sensor
};
