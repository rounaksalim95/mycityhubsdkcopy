'use strict';

// Require this for database helper methods 
var database = require('../middleware/database');

// Setup MongoDB
var mongo = require('mongodb');
var monk = require('monk');

// Setup MongoOplog to check for changes in the database (parking data)
var MongoOplog = require('mongo-oplog');

var _ = require('lodash');

// Get the devices to check for ParkingData sensor so that 
// we can attach WebSocket to specified port 
var devices = require('./sensors').getDevices();

// Holders for different sensor values 
var oplogHolder = [];
var parkingDataHolder = [];
var collectionHolder = [];
var websocketportHolder = [];
var wssHolder = [];

// Gets the data required for setting up the mongo-oplog and WebSockets 
function getOplogWebsocketsData() {
  // Get all the requied data from ParkingData sensor in all devices  
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

      // Set configured to true
      sensor.configured = true;
        
      oplogHolder[i] = oplog;
      parkingDataHolder[i] = parkingData;
      collectionHolder[i] = collection;
      websocketportHolder[i] = sensor.WebSocketPort;
    }
  }
};

// Sets up the WebSockets 
function setWebSockets() {
  for (let i = 0; i < websocketportHolder.length; ++i) {
    // Check to see if port has already been used 
    let firstIndex = _.indexOf(websocketportHolder, websocketportHolder[i])
    if (firstIndex < i) {
      console.log('Port : ' + websocketportHolder[i] + ' is already being used by ' + devices[firstIndex].id);
      // Set the websocket at ith position to the websocket that was initialized previously
      wssHolder[i] = wssHolder[firstIndex];
    }
    else {
      // Initialize WebSockets for use with ParkingData   ws://localhost:3545
      let WebSocketServer = require('ws').Server,
        wss = new WebSocketServer({ port: websocketportHolder[i] });

      wssHolder[i] = wss;
    }
  }
}

// Sets up the oplog listeners 
// Can be changed as required 
function setMongoOplog() {
  for (let i = 0; i < oplogHolder.length; ++i) {
    // Setup the listener for any updates to the database
    oplogHolder[i].on('update', function (doc) {
      database.getParkingDataWebSockets(parkingDataHolder[i].get(collectionHolder[i]), function(err, result) {
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
};

// Sets up websockets and mongo oplog listeners for ParkingData sensor 
exports.setupParkingDataSensor = function() {
  getOplogWebsocketsData();
  setWebSockets();
  setMongoOplog(); 
}