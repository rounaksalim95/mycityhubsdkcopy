
function getParkingData(collection) {
    collection.find({}, {}, function(e, docs) {
        return JSON.stringify(docs);
    });
}

/*function addParkingData(db, data) {
    db.reading.insert(data);
}*/

module.exports = {
    getParkingData: getParkingData
}