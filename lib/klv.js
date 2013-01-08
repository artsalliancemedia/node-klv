/**
 * KLV (Key Value Length) parser
 * http://en.wikipedia.org/wiki/KLV
 */
var stream = require('stream');

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
				valueLength = decodedBER.length; // Record to track the value
				this.emit('length', decodedBER.length);
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

		// Pass through the data so stream can be chained
		this.emit('data', data);
		return true;
	};

	klvStream.end = function(data) {
		this.emit('end');
	};

	return klvStream;
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
var decodeBER = exports.decodeBER = function(bytes) {
	var length = bytes[0];
	var bytesRead = 1;
	if (length > 127) {
		bytesRead += length & 127; // Strip off the high bit
		length = 0;
		for (var i = 1; i < bytesRead; i++) {
			length += bytes[i] << (8 * (bytesRead - i - 1));
		}
	}
	return {length: length, bytesRead: bytesRead};
};