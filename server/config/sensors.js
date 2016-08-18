/*
 * (C) Copyright 2015, Siemens AG
 * Author: Marcos J. S. Rocha
 *
 * SPDX-License-Identifier:     BSD-2-Clause
 */
'use strict';

var fs = require('fs');
var path = require('path');
var config = require('./environment');

var devices = [
    {id: 'TransitHub', info: '1025 16th Avenue Parking Garage, Nashville', latitude: 36.174465, longitude: -86.767960},
    {id: 'TransitHub1', info: '1025 16th Avenue Parking Garage, Nashville', latitude: 36.174465, longitude: -86.767960}];

// Make sure specified ports are 1024 or above 
var sensors = [
	  {id: 'ParkingData', index: 1, info: 'Actual data that we need', type: 'JSON', timestamp: '1970-01-01T00:00:00.000Z', mongoAddress: 'localhost:27017', dbName: 'garageinfo', collection: 'info', WebSocketPort: '7000'},
    {id: 'ParkingData', index: 1, info: 'Actual data that we need', type: 'JSON', timestamp: '1970-01-01T00:00:00.000Z', mongoAddress: 'localhost:27017', dbName: 'first', collection: 'readings', WebSocketPort: '8080'},
    {id: 'BusDelayData', index: 2, info: 'Bus Delay Data', type: 'JSON', timestamp: '1970-01-01T00:00:00.000Z', mongoAddress: 'localhost:27017', dbName: 'busDelay', collection: 'delay'}];

var currentSensorDevices;
var forecastSensorDevices = {};

/**
 * Parse time string "HH:MM:SS"
 * @param timeString
 * @returns Date object / null
 */
function parseTime(timeString) {
  if (timeString == '') return null;

  var time = timeString.match(/(\d+)(:(\d\d))?(:(\d\d))/i);
  if (time == null) return null;

  var hours = parseInt(time[1],10);
  var d = new Date();
  d.setHours(hours);
  d.setMinutes(parseInt(time[3],10) || 0);
  d.setSeconds(parseInt(time[5],10) || 0, 0);
  return d;
}

/**
 * Read sensor values from file (JSON file array of objects: [{"dayOfWeek": 0-6, "time": "HH:MM:SS", "value": n}, ... ])
 * @param filePath
 * @returns {Array} {time: "HH:MM:SS", hours: 0-24, minutes: 0-59, seconds: 0-59, dayOfWeek: 0-6, value: n}, sorted by dayOfWeek/time
 */
function readSensorValuesJsonFile(filePath, isNumber) {
  var data = fs.readFileSync(filePath, 'utf8');
  var values = JSON.parse(data).values;
  for(var i = 0; i < values.length; i++) {
    // parse hours, minutes, seconds and add them to the objects
    if(values[i].time && !(values[i].hours || values[i].minutes || values[i].seconds)) {
      var date = parseTime(values[i].time);
      values[i].hours = date.getHours();
      values[i].minutes = date.getMinutes();
      values[i].seconds = date.getSeconds();
    }
    if(isNumber) {
      // convert values to number
      values[i].value = Number(values[i].value);
    }
  }
  return values.sort(sortEntryDateTime);
}

/**
 *
 * @param a {dayOfWeek: 0-6, hours: 0-24, minutes: 0-59, seconds: 0-59}
 * @param b {dayOfWeek: 0-6, hours: 0-24, minutes: 0-59, seconds: 0-59}
 */
function sortEntryDateTime(a, b) {
  var diff = a.dayOfWeek - b.dayOfWeek;
  if (diff !== 0) {
    return diff;
  }
  diff = a.hours - b.hours;
  if (diff !== 0) {
    return diff;
  }
  diff = a.minutes - b.minutes;
  if (diff !== 0) {
    return diff;
  }
  diff = a.seconds - b.seconds;
  return diff;
}

/**
 * Returns clone of the default list of devices with their associated sensors
 * @returns default list of devices
 */
function getDefaultDevices() {
  // clone device list
  var sensorDevices = JSON.parse(JSON.stringify(devices));
  // attach clone of sensors list to the devices
  for (var i = 0; i < sensorDevices.length; i++) {
    sensorDevices[i].sensors = JSON.parse(JSON.stringify(sensors));
  }
  return sensorDevices;
}

/**
 * Gets the current list of devices with their associated sensors
 * @returns list of devices
 */
function getDevices() {
  if (!currentSensorDevices) {
    currentSensorDevices = getDefaultDevices();
  }
  return currentSensorDevices;
}

/**
 * Sets the current list of devices with their associated sensors
 * @param sensorDevices
 */
function setDevices(sensorDevices) {
  currentSensorDevices = sensorDevices;
}

/**
 * Sets the current list of devices to its default value
 * @returns updated list of devices
 */
function setDevicesToDefault() {
  currentSensorDevices = getDefaultDevices();
  return currentSensorDevices;
}

/**
 * Gets the expected sensor value at the specified date
 * @param deviceId
 * @param sensorId
 * @param date
 * @returns {dayOfWeek: 0-6, hours: 0-23, minutes: 0-59, seconds: 0-59, value: value}
 */
function getSensorValueForecast(deviceId, sensorId, date) {
  // forecast look-up
  var dayOfWeek = date.getDay();
  var hours = date.getHours();
  var minutes = date.getMinutes();
  var seconds = date.getSeconds();
  var forecastValues;

  // read forecast values from JSON file
  var valueFilesBasePath = path.join(config.root, 'values');
  var deviceSensorFile =  valueFilesBasePath + path.sep + deviceId + path.sep + sensorId + '.json';
  var genericSensorFile =  valueFilesBasePath + path.sep + sensorId + '.json';
  if (deviceId && fs.existsSync(deviceSensorFile)) {
    if (!forecastSensorDevices[deviceSensorFile]) {
      console.log('sensors.js getSensorValueForecast reading values from ' + deviceSensorFile + '...');
      forecastSensorDevices[deviceSensorFile] = readSensorValuesJsonFile(deviceSensorFile, true);
    }
    forecastValues = forecastSensorDevices[deviceSensorFile];
  } else if (fs.existsSync(genericSensorFile)) {
    if (!forecastSensorDevices[genericSensorFile]) {
      console.log('sensors.js getSensorValueForecast reading values from ' + genericSensorFile + '...');
      forecastSensorDevices[genericSensorFile] = readSensorValuesJsonFile(genericSensorFile, true);
    }
    forecastValues = forecastSensorDevices[genericSensorFile];
  }

  if (!forecastValues) {
    console.warn('sensors.js getSensorValueForecast no sensor forecast JSON file found!');
    return undefined;
  }

  // look-up value for the desired date/time on sorted list (sequential search, 1st entry before later timestamp)
  //console.log('sensors.js getSensorValueForecast', forecastValues);
  var foundEntry;
  var prevEntry;
  for (var i = 0; i < forecastValues.length; i++) {
    var entry = forecastValues[i];
    if (entry.dayOfWeek > dayOfWeek) {
      foundEntry = prevEntry;
      break;
    } else if (entry.dayOfWeek === dayOfWeek) {
      if (entry.hours > hours) {
        foundEntry = prevEntry;
        break;
      } else if (entry.hours === hours) {
        if (entry.minutes > minutes) {
          foundEntry = prevEntry;
          break;
        } else if (entry.minutes === minutes) {
          if (entry.seconds > seconds) {
            foundEntry = prevEntry;
            break;
          } else if (entry.seconds === seconds) {
            foundEntry = entry;
          }
        }
      }
    }
    prevEntry = entry;
  }

  if (!foundEntry) {
    console.warn('sensors.js getSensorValueForecast no sensor value forecast found!');
    return undefined;
  }
  else {
    //console.info('sensors.js getSensorValueForecast found sensor value forecast', foundEntry);
    return foundEntry;
  }
}


module.exports = {
  /**
   * Returns clone of the default list of devices with their associated sensors
   * @returns default list of devices
   */
  getDefaultDevices: getDefaultDevices,

  /**
   * Gets the current list of devices with their associated sensors
   * @returns list of devices
   */
  getDevices: getDevices,

  /**
   * Sets the current list of devices to its default value
   * @returns updated list of devices
   */
  setDevices: setDevices,

  /**
   * Sets the current list of devices to its default value
   * @returns updated list of devices
   */
  setDevicesToDefault: setDevicesToDefault,

  /**
   * Gets the expected sensor value at the specified date
   * @param deviceId
   * @param sensorId
   * @param date
   * @returns {dayOfWeek: 0-6, hours: 0-23, minutes: 0-59, seconds: 0-59, value: value}
   */
  getSensorValueForecast: getSensorValueForecast
};
