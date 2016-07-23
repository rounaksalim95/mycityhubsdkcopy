/**
 * Main application file
 */
'use strict';

// Set default node environment to development
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
console.log('==> NODE_ENV =', process.env.NODE_ENV);

var express = require('express');
var config = require('./config/environment');

// Set up MongoDB 
var mongo = require('mongodb');
var monk = require('monk');
var db = monk('localhost:27017/first');

// Setup server
var app = express();
var server = require('http').createServer(app);
require('./config/express')(app);
// Make our db accessible to our router 
app.use(function(req, res, next) {
	req.db = db;
	next();
});
require('./routes')(app);

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
