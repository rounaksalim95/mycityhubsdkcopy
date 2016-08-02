'use strict';

var mongo = require('mongodb');

function getParkingData(collection, res) {
	collection.find({}, {}, function (e, docs) {
		res.json(docs);
	});
}

function getParkingData(collection) {
	collection.find({}, {}, function (e, docs) {
		return json(docs);
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