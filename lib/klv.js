/**
 * KLV (Key Value Length) parser
 * http://en.wikipedia.org/wiki/KLV
 */
var stream = require('stream'),
	util = require('util');

// Add the Buffer shim
require('./buffer');

var KLV_STATES = {KEY: 0, LENGTH: 1, VALUE: 2};

var KEY_LENGTH = 16;

/**
 * Creates a KLV streaming parser
 */
exports.createStream = function() {
	var klvStream = new stream.Stream;
	klvStream.writable = true;
	klvStream.readable = true;

	var buffer = new Buffer(0);
	var state = KLV_STATES.KEY;

	var valueLength = 0;

	klvStream.write = function(data) {

		buffer = Buffer.concat([buffer, data]);
		// Iterate through the buffer, pulling out the KLV components
		// There may be multiple KLVs in the buffer
		var done = false;
		while(!done) {
			// Emit the key
			if (state === KLV_STATES.KEY && buffer.length >= KEY_LENGTH) {
				var key = buffer.slice(0, 16);
				buffer = buffer.slice(16); // Remove the key portion from the buffer
				state = KLV_STATES.LENGTH;
				this.emit('key', key);
			}

			// Emit the length
			else if (state === KLV_STATES.LENGTH) {
				var decodedBER = decodeBER(buffer);
				buffer = buffer.slice(decodedBER.bytesRead);
				state = KLV_STATES.VALUE;
				valueLength = decodedBER.value; // Record to track the value
				// Don't emit the length; it'll never be needed
				// this.emit('length', decodedBER.value);
			}

			// Emit the value
			else if (state === KLV_STATES.VALUE && buffer.length >= valueLength) {
				var value = buffer.slice(0, valueLength);
				buffer = buffer.slice(valueLength);
				state = KLV_STATES.KEY;
				this.emit('value', value);
			}
			else
				done = true;
		}

		// Pass through the data so the stream can be chained
		// this.emit('data', data);
		return true;
	};

	klvStream.end = function(data) {
		this.emit('end');
	};

	return klvStream;
};

/**
 * Encodes a key and value buffer into a KLV
 * The length in bytes of the BER encoded length can be optionally specified
 */
 exports.encodeKLV = function(key, value, berLength) {
 	// Convert arrays to buffers if necessary
 	if (util.isArray(key)) key = new Buffer(key);
 	if (util.isArray(value)) value = new Buffer(value);
	return Buffer.concat([key, encodeBER(value.length, berLength), value]);
};

/**
 * Decodes a BER integer value
 * See http://en.wikipedia.org/wiki/KLV for more info, but to paraphrase:
 *
 * If the first byte in the BER length field does not have the high bit set (0x80),
 * then that single byte represents an integer between 0 and 127 and indicates
 * the number of Value bytes that immediately follows. If the high bit is set,
 * then the lower seven bits indicate how many bytes follow that themselves make up a length field.
 *
 * Bytes should be passed in as a Buffer
 */
var decodeBER = exports.decodeBER = function(buffer) {
	var length = buffer[0];
	var bytesRead = 1;
	if (length > 127) {
		bytesRead += length & 127; // Strip off the high bit
		length = 0;
		for (var i = 1; i < bytesRead; i++) {
			length += buffer[i] << (8 * (bytesRead - i - 1));
		}
	}
	return {value: length, bytesRead: bytesRead};
};

/**
 * Encodes an integer to BER
 *
 * The length of the encoded BER value (in bytes) can be optionally specified.
 */
var encodeBER = exports.encodeBER = function(value, berLength) {
	if (!berLength) {
		if (value < 127)
			return new Buffer([value]);
		else if (value < 256)
			berLength = 2;
		else if (value < 256 * 256)
			berLength = 3;
		else if (value < 256 * 256 * 256)
			berLength = 4;
		else
			berLength = 5; // 32 bit unsigned int is the max for this function
	}
	// Add the BER byte length
	var ber = [127 + berLength];
	for (var i = 1; i < berLength; i++)
		ber[i] = (value >> (8 * (berLength - i - 1))) & 255
	return new Buffer(ber);
};