/**
 * KLV (Key Value Length) parser
 * http://en.wikipedia.org/wiki/KLV
 */
var stream = require('stream'),
    util = require('util');

// Add the Buffer shim
require('./buffer');

var KLV_STATES = {KEY: 0, LENGTH: 1, VALUE: 2};

/**
 * Create and return a new KLVStream
 */
exports.createStream = function(options) {
    return new KLVStream(options);
};

/**
 * Creates a KLV streaming parser
 */
var KLVStream = function(options) {
    this.writable = true;
    this.readable = true;

    // Default key length is 16
    this.keyLength = (options && options.keyLength) || 16;

    this.buffer = new Buffer(0);
    this.state = KLV_STATES.KEY;
    this.valueLength = 0;
};

util.inherits(KLVStream, stream.Stream);

/**
 * Sets the encoding type for the KLV value
 */
KLVStream.prototype.setEncoding = function(encoding) {
    this.encoding = encoding;
    return this;
};

KLVStream.prototype.write = function(data) {
    this.buffer = Buffer.concat([this.buffer, data]);
    // Iterate through the buffer, pulling out the KLV components
    // There may be multiple KLVs in the buffer
    var done = false;
    while(!done) {
        // Emit the key
        if (this.state === KLV_STATES.KEY && this.buffer.length >= this.keyLength) {
            var key = this.buffer.slice(0, this.keyLength);
            this.buffer = this.buffer.slice(this.keyLength); // Remove the key portion from the buffer
            this.state = KLV_STATES.LENGTH;
            this.emit('key', key);
        }
        // Emit the length
        else if (this.state === KLV_STATES.LENGTH) {
            var decodedBER = decodeBER(this.buffer);
            this.buffer = this.buffer.slice(decodedBER.bytesRead);
            this.state = KLV_STATES.VALUE;
            this.valueLength = decodedBER.value; // Record to track the value
            this.emit('length', this.valueLength);
        }

        // Emit the value, using the correct encoding if specified
        else if (this.state === KLV_STATES.VALUE && this.buffer.length >= this.valueLength) {
            var value = this.buffer.slice(0, this.valueLength);
            this.buffer = this.buffer.slice(this.valueLength);
            this.state = KLV_STATES.KEY;
            // Use the encoding if specified
            this.emit('value', (this.encoding) ? value.toString(this.encoding) : value);
            this.emit('data', (this.encoding) ? value.toString(this.encoding) : value);
        }
        else
            done = true;
    }
    return true;
};

KLVStream.prototype.end = function() {
    this.emit('end');
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