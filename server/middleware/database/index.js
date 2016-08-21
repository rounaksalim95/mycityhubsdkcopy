'use strict';

var mongo = require('mongodb');

// Used to get ParkingData from the databse (for GET request)
function getParkingData(collection, res) {
	collection.find({}, {}, function (e, docs) {
		res.json(docs);
	});
}

// Used to get ParkingData from the database (for use with WebSockets)
function getParkingDataWebSockets(collection, callback) {
	collection.find({}, {}, function (e, docs) {
		callback(null, docs);
	});
}

// Used to get BusDelayData from the database (for GET request)
function getBusDelay(collection, tripId, res) {
	collection.find({trip_id : tripId}, {}, function(e, docs) {
		res.json(docs);
	});
}

module.exports = {

	// Gets all the parking data present in the DB 
	getParkingData: getParkingData,

	// Gets all the parking data present in the DB for use with WebSockets 
	getParkingDataWebSockets: getParkingDataWebSockets,

	// Gets bus delay data pertaining to the specified trip_id
	getBusDelay: getBusDelay
}