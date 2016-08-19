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
        
      oplogGlobalHolder[i] = oplog;
      parkingDataGlobalHolder[i] = parkingData;
      collectionGlobalHolder[i] = collection;
      websocketportGlobalHolder[i] = sensor.WebSocketPort;
    }
  }
};

// Sets up the WebSockets 
function setWebSockets(devices) {
  for (let i = 0; i < websocketportGlobalHolder.length; ++i) {
    // Check to see if port has already been used 
    let firstIndex = _.indexOf(websocketportGlobalHolder, websocketportGlobalHolder[i])
    if (firstIndex < i) {
      console.log('Port : ' + websocketportGlobalHolder[i] + ' is already being used by ' + devices[firstIndex].id);
      // Set the websocket at ith position to the websocket that was initialized previously
      wssGlobalHolder[i] = wssGlobalHolder[firstIndex];
    }
    else {
      // Initialize WebSockets for use with ParkingData   ws://localhost:3545
      let WebSocketServer = require('ws').Server,
      wss = new WebSocketServer({ port: websocketportGlobalHolder[i] });

      wssGlobalHolder[i] = wss;
    }
  }
}

// Sets up the oplog listeners 
function setMongoOplog() {
  for (let i = 0; i < oplogGlobalHolder.length; ++i) {
  // Setup the listener for any updates to the database
      oplogGlobalHolder[i].on('update', function (doc) {
        database.getParkingDataWebSockets(collection, function(err, result) {
          // Broadcast the message to every client 
          wssGlobalHolder[i].clients.forEach(function (client) {
            client.send(JSON.stringify(result));
          });
        });
      });

      oplogGlobalHolder[i].on('insert', function (doc) {
        database.getParkingDataWebSockets(parkingDataGlobalHolder[i].get(collectionGlobalHolder[i]), function(err, result) {
          console.log('INSERTED INTO : ' + collectionGlobalHolder[i]);
          // Broadcast the message to every client 
          wssGlobalHolder[i].clients.forEach(function (client) {
            client.send(JSON.stringify(result));
          });
        });
      });

      oplogGlobalHolder[i].on('delete', function (doc) {
        database.getParkingDataWebSockets(parkingDataGlobalHolder[i].get(collectionGlobalHolder[i]), function(err, result) {
          console.log('DELETED FROM : ' + collectionGlobalHolder[i]);
          // Broadcast the message to every client 
          wssGlobalHolder[i].clients.forEach(function (client) {
            client.send(JSON.stringify(result));
          });
        });
      });
  }
};

// Sets up everything for ParkingData sensor 
exports.setupParkingDataSensor = function() {
  // End connection if we're already tailing and close all websockets so that we can reopen them 
  if (oplogGlobalHolder.length > 0) {
    console.log('CLEARING OPLOG');
    for (let i = 0; i < oplogGlobalHolder.lenght; ++i) {
      // End all tailing connections 
      oplogGlobalHolder[i].stop(function() {
        console.log('Stopped tailing ' + collectionGlobalHolder[i]);
      });

      // Delete all instances of websockets
      wssGlobalHolder[i].close();
    }
    
    oplogGlobalHolder = []; 
    parkingDataGlobalHolder = [];
    collectionGlobalHolder = [];
    websocketportGlobalHolder = [];
    wssGlobalHolder = [];
  }


  console.log('CLEARED OPLOG');

  getOplogWebsocketsData();
  console.log('GOT DATA');
  setWebSockets(devices);
  console.log('SET UP WEBSOCKETS');
  setMongoOplog();
  console.log('SET UP MONGO-OPLOG');  
}