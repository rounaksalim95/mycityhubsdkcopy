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
var parkingDB = monk('localhost:27017/garageinfo');
var busDelayDB = monk('localhost:27017/busDelay');

// Collection being used for ParkingData 
var collection = parkingDB.get('info');


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
  wss = new WebSocketServer({ port: 1024 });

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
var oplog = MongoOplog('mongodb://localhost:27017/local', { ns: 'garageinfo.info'}).tail();


//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
var _ = require('lodash');
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

// Get the devices to check for ParkingData sensor so that 
// we can attach WebSocket to specified port 
var devices = require('./config/sensors').getDevices();
var device = devices[0];
var sensorIndex = _.findIndex(device.sensors, {id: 'ParkingData'});
console.log(sensorIndex);
console.log(device.sensors[sensorIndex].mongoAddress);

var oplogHolder = []; 
var parkingDataHolder = [];
var collectionHolder = [];

console.log('Devices length : ' + devices.length);
for (let i = 0; i < devices.length; ++i) {
  let device = devices[i];
  for (let j = 0; j < device.sensors.length; ++j) {
    if (device.sensors[j].id == 'ParkingData') {
      let sensor = device.sensors[j];
      let collection = sensor.collection;
      let dbName = sensor.dbName;
      let mongoUri = sensor.mongoAddress + '/' + dbName;
      let parkingData = monk(mongoUri);
      let oplog = MongoOplog('mongodb://' + mongoUri + '/local', { ns: dbName + '.' + collection}).tail();
      
      oplogHolder[j] = oplog;
      parkingDataHolder[j] = parkingData;
      collectionHolder[j] = collection;

      /*var WebSocketServer = require('ws').Server,
        wss = new WebSocketServer({ port: sensor.WebSocketPort });*/

      // Setup the listener for any updates to the database
     /* oplog.on('update', function (doc) {
        console.log(JSON.stringify(doc));
      });

      oplog.on('insert', function (doc) {
        database.getParkingDataWebSockets(parkingData.get(collection), function(err, result) {
        console.log('INSERTED');
        // Broadcast the message to every client 
        wss.clients.forEach(function (client) {
          client.send(JSON.stringify(result));
          });
        });
      });

      oplog.on('delete', function (doc) {
        database.getParkingDataWebSockets(parkingData.get(collection), function(err, result) {
          console.log('DELETED');
          console.log(JSON.stringify(result));
          // Broadcast the message to every client 
          wss.clients.forEach(function (client) {
            client.send(JSON.stringify(result));
          });
        });
      });*/
    }
  }


 /* if (sensorIndex != -1) {
      var sensor = device.sensors[sensorIndex];
      var collection = sensor.collection;
      var dbName = sensor.dbName;
      var mongoUri = sensor.mongoAddress + '/' + dbName;
      var parkingData = monk(mongoUri);
      var oplog = MongoOplog('mongodb://' + mongoUri + '/local', { ns: dbName + '.' + collection}).tail();

      var WebSocketServer = require('ws').Server,
        wss = new WebSocketServer({ port: sensor.WebSocketPort });

      // Setup the listener for any updates to the database
      oplog.on('update', function (doc) {
        console.log(JSON.stringify(doc));
      });

      oplog.on('insert', function (doc) {
        database.getParkingDataWebSockets(parkingData.get(collection), function(err, result) {
        // Broadcast the message to every client 
        wss.clients.forEach(function (client) {
          client.send(JSON.stringify(result));
          });
        });
      });

      oplog.on('delete', function (doc) {
        database.getParkingDataWebSockets(parkingData.get(collection), function(err, result) {
          // Broadcast the message to every client 
          wss.clients.forEach(function (client) {
            client.send(JSON.stringify(result));
          });
        });
      });

  }*/
}

for (let i = 0; i < oplogHolder.length; ++i) {
  // Setup the listener for any updates to the database
      oplogHolder[i].on('update', function (doc) {
        console.log(JSON.stringify(doc));
      });

      oplogHolder[i].on('insert', function (doc) {
        database.getParkingDataWebSockets(parkingDataHolder[i].get(collectionHolder[i]), function(err, result) {
          console.log('INSERTED INTO : ' + collectionHolder[i]);
        // Broadcast the message to every client 
        wss.clients.forEach(function (client) {
          client.send(JSON.stringify(result));
          });
        });
      });

      oplogHolder[i].on('delete', function (doc) {
        database.getParkingDataWebSockets(parkingDataHolder[i].get(collectionHolder[i]), function(err, result) {
          console.log('DELETED FROM : ' + collectionHolder[i]);
          console.log(JSON.stringify(result));
          // Broadcast the message to every client 
          wss.clients.forEach(function (client) {
            client.send(JSON.stringify(result));
          });
        });
      });
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++




// Setup the listener for any updates to the database
/*oplog.on('update', function (doc) {
  console.log(JSON.stringify(doc));
});

oplog.on('insert', function (doc) {
  database.getParkingDataWebSockets(collection, function(err, result) {
    // Broadcast the message to every client 
    wss.clients.forEach(function (client) {
      client.send(JSON.stringify(result));
    });
  });
});

oplog.on('delete', function (doc) {
  database.getParkingDataWebSockets(collection, function(err, result) {
    // Broadcast the message to every client 
    wss.clients.forEach(function (client) {
      client.send(JSON.stringify(result));
    });
  });
});*/

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
