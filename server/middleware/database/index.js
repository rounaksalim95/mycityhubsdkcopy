var mongo = require('mongo');

function getParkingData(collection, res) {
	collection.find({}, {}, function (e, docs) {
		res.json(docs);
	});
}

module.exports = {
	getParkingData: getParkingData
}