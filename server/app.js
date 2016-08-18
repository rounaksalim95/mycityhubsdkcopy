/**
 * Main application file
 */
'use strict';

// Set default node environment to development
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
console.log('==> NODE_ENV =', process.env.NODE_ENV);

var express = require('express');
var config = require('./config/environment');
// Require this for database helper methods 
var database = require('./middleware/database');


// Setup MongoDB
var mongo = require('mongodb');
var monk = require('monk');


// Setup server
var app = express();
var server = require('http').createServer(app);
require('./config/express')(app);
require('./routes')(app);

// Setup MongoOplog to check for changes in the database (parking data)
var MongoOplog = require('mongo-oplog');

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
var _ = require('lodash');
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

// Get the devices to check for ParkingData sensor so that 
// we can attach WebSocket to specified port 
var devices = require('./config/sensors').getDevices();

// Multidimensional holders to hold values for different sensors in different devices 
// First value is for devices and second is for sensors
var oplogHolder = []; 
var parkingDataHolder = [];
var collectionHolder = [];
var websocketportHolder = [];
var wssHolder = [];

for (let i = 0; i < devices.length; ++i) {
  let device = devices[i];
  let sensorIndex = _.findIndex(device.sensors, {id: "ParkingData"});

  // Setup if sensor exists 
  if (sensorIndex !== -1) {
    let sensor = device.sensors[sensorIndex];
    let collection = sensor.collection;
    let dbName = sensor.dbName;
    let mongoUri = sensor.mongoAddress + '/' + dbName;
    let parkingData = monk(mongoUri);
    let oplog = MongoOplog('mongodb://' + mongoUri + '/local', { ns: dbName + '.' + collection}).tail();
      
    oplogHolder[i] = oplog;
    parkingDataHolder[i] = parkingData;
    collectionHolder[i] = collection;
    websocketportHolder[i] = sensor.WebSocketPort;
  }
}

for (let i = 0; i < websocketportHolder.length; ++i) {
  // Check to see if port has already been used 
  let firstIndex = _.indexOf(websocketportHolder, websocketportHolder[i])
  if (firstIndex < i) {
    console.log('Port : ' + websocketportHolder[i] + ' is already being used by ' + devices[firstIndex].id);
  }
  else {
    // Initialize WebSockets for use with ParkingData 
    let WebSocketServer = require('ws').Server,
    wss = new WebSocketServer({ port: websocketportHolder[i] });

    wssHolder[i] = wss;
  }
}


for (let i = 0; i < oplogHolder.length; ++i) {
  // Setup the listener for any updates to the database
      oplogHolder[i].on('update', function (doc) {
        database.getParkingDataWebSockets(collection, function(err, result) {
          // Broadcast the message to every client 
          wssHolder[i].clients.forEach(function (client) {
            client.send(JSON.stringify(result));
          });
        });
      });

      oplogHolder[i].on('insert', function (doc) {
        database.getParkingDataWebSockets(parkingDataHolder[i].get(collectionHolder[i]), function(err, result) {
          console.log('INSERTED INTO : ' + collectionHolder[i]);
          // Broadcast the message to every client 
          wssHolder[i].clients.forEach(function (client) {
            client.send(JSON.stringify(result));
          });
        });
      });

      oplogHolder[i].on('delete', function (doc) {
        database.getParkingDataWebSockets(parkingDataHolder[i].get(collectionHolder[i]), function(err, result) {
          console.log('DELETED FROM : ' + collectionHolder[i]);
          // Broadcast the message to every client 
          wssHolder[i].clients.forEach(function (client) {
            client.send(JSON.stringify(result));
          });
        });
      });
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

// init websocket
app.socketio = require('socket.io')(server, {
  serveClient: (config.env === 'production') ? false : true,
  path: '/socket.io-client'
});
require('./config/socketio')(app.socketio);

// Connect to MQTT Broker
var MqttService = require('./components/mqtt/mqttService').MqttService;
app.mqttService = new MqttService(function() {
  // upon connection notify initial sensor values
  var deviceController = require('./api/device/device.controller.js');
  deviceController.notifySensorValuesMqtt(app);
});

// Start server
server.listen(config.port, config.ip, function() {
  console.log('Express server listening on port %d, in %s mode', config.port, app.get('env'));
});

// Expose app
exports = module.exports = app;