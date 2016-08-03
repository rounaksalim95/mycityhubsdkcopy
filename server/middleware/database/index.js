'use strict';

var mongo = require('mongodb');

function getParkingData(collection, res) {
	collection.find({}, {}, function (e, docs) {
		res.json(docs);
	});
}

// Used to get ParkingData from the database (for use with WebSockets)
function getParkingData(collection, callback) {
	collection.find({}, {}, function (e, docs) {
		callback(null, docs);
	});
}

function getBusDelay(collection, tripId, res) {
	collection.find({trip_id : tripId}, {}, function(e, docs) {
		res.json(docs);
	});
}

module.exports = {

	// Gets all the parking data present in the DB 
	getParkingData: getParkingData,

	// Gets bus delay data pertaining to the specified trip_id
	getBusDelay: getBusDelay
}