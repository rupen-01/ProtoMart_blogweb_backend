exports.isValidLatitude = (lat) => lat >= -90 && lat <= 90;
exports.isValidLongitude = (lng) => lng >= -180 && lng <= 180;

exports.normalizeCoordinates = (lat, lng) => {
  lat = Number(lat);
  lng = Number(lng);

  if (isNaN(lat) || isNaN(lng)) return null;

  if (!exports.isValidLatitude(lat)) return null;
  if (!exports.isValidLongitude(lng)) return null;

  return [lng, lat]; // GeoJSON format
};
