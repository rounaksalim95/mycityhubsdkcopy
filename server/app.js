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
// Used for testing purposes; replace with actual DB 
var parkingDB = monk('localhost:27017/first');
var busDelayDB = monk('localhost:27017/busDelay');

// Collection being used for ParkingData 
var collection = parkingDB.get('readings');

// Setup server
var app = express();
var server = require('http').createServer(app);
require('./config/express')(app);
// Make our DB accessible to our router 
app.use(function(req, res, next) {
  req.parkingDB = parkingDB;
  next();
});
app.use(function(req, res, next) {
  req.busDelayDB = busDelayDB;
  next();
});
require('./routes')(app);

// WebSockets for use with ParkingData 
var WebSocketServer = require('ws').Server,
  wss = new WebSocketServer({ server: server });

/*wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(message, flags) {
    if (flags.binary) {
      console.log('Not managed yet...');
    } else {
      console.log('Received: %s', message);
      ws.send('ping');
    }
  });
});*/

// Setup MongoOplog to check for changes in the database (parking data)
var MongoOplog = require('mongo-oplog');
var oplog = MongoOplog('mongodb://localhost:27017/local', { ns: 'first.readings'}).tail();

// Setup the listener for any updates to the database
oplog.on('update', function (doc) {
  console.log(JSON.stringify(doc));
});

oplog.on('insert', function (doc) {
  database.getParkingDataWebSockets(collection, function(err, result) {
    // Broadcast the message to every client 
    wss.clients.forEach(function (client) {
      client.send(JSON.stringify(result));
      console.log(JSON.stringify(result));
    });
  });
});

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
