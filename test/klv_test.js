/**
 * Unit tests for KLV parsing
 */
 
var assert = require('assert'),
 	stream = require('stream'),
	klv = require('../lib/klv');

describe('klv:', function() {

	describe('decodeBER', function() {
		it('should decode BER length to an int', function() {
			// 1 byte long
			assert.equal(klv.decodeBER(new Buffer([0x00])).length, 0);
			assert.equal(klv.decodeBER(new Buffer([0x01])).length, 1);
			assert.equal(klv.decodeBER(new Buffer([0x7f])).length, 127);
			// 2 bytes long
			assert.equal(klv.decodeBER(new Buffer([0x81, 0x00])).length, 0);
			assert.equal(klv.decodeBER(new Buffer([0x81, 0x01])).length, 1);
			assert.equal(klv.decodeBER(new Buffer([0x81, 0x7f])).length, 127);
			assert.equal(klv.decodeBER(new Buffer([0x81, 0xff])).length, 255);
			// 3 bytes long
			assert.equal(klv.decodeBER(new Buffer([0x82, 0x00, 0x00])).length, 0);
			assert.equal(klv.decodeBER(new Buffer([0x82, 0x00, 0x01])).length, 1);
			assert.equal(klv.decodeBER(new Buffer([0x82, 0x00, 0x7f])).length, 127);
			assert.equal(klv.decodeBER(new Buffer([0x82, 0x01, 0x00])).length, 256);
			// 4 bytes long
			assert.equal(klv.decodeBER(new Buffer([0x83, 0x00, 0x00, 0x00])).length, 0);
			assert.equal(klv.decodeBER(new Buffer([0x83, 0x00, 0x00, 0x01])).length, 1);
			assert.equal(klv.decodeBER(new Buffer([0x83, 0x00, 0x00, 0x7f])).length, 127);
			assert.equal(klv.decodeBER(new Buffer([0x83, 0x00, 0x01, 0x00])).length, 256);
			assert.equal(klv.decodeBER(new Buffer([0x83, 0x01, 0x00, 0x00])).length, 65536);

		});
	});

	describe('createStream#single KLV', function() {
		it('should create a new KLV stream and transform the incoming stream into a KLV', function(done) {
			var testKLV = new Buffer([
                  0x03, 0x2E, 0x5F, 0xAB, 0x08, 0x12, 0x2F, 0x0C, 0xEE, 0x33, 0x00, 0x01, 0x02, 0x45, 0x6D, 0xDD,
                  0x83, 0x00, 0x00, 0x05,
                  0x05, 0x04, 0x03, 0x02, 0x01])

			// Create a simple read stream for the testKLV bytes
			var byteStream = new stream.Stream();
			byteStream.readable = true;

			var klvStream = klv.createStream();
			byteStream.pipe(klvStream);

		   	klvStream.on('key', function(key) {
		   		assert(key);
		   		assert.equal(key.length, 16);
		   		assert.deepEqual(key, testKLV.slice(0, 16));
		   	});

		   	klvStream.on('length', function(length) {
		   		assert(length);
		   		assert.equal(typeof length, 'number');
		   		assert.equal(length, 5);
		   	});

		   	klvStream.on('value', function(value) {
		   		assert(value);
		   		assert.equal(typeof value, 'object');
		   		assert.equal(value.length, 5);
		   		assert.deepEqual(value, testKLV.slice(20));
		   	});

		   	klvStream.on('end', function() {
		   		done();
		   	});

		   	// Emit the KLV 
		   	byteStream.emit('data', testKLV);
		   	byteStream.emit('end');
		});
	});

	describe('createStream#multiple KLVs', function() {
		it('should create a new KLV stream and transform the incoming stream into a KLV', function(done) {
			
			var testKLV1 = new Buffer([
                  0x03, 0x2E, 0x5F, 0xAB, 0x08, 0x12, 0x2F, 0x0C, 0xEE, 0x33, 0x00, 0x01, 0x02, 0x45, 0x6D, 0xDD,
                  0x83, 0x00, 0x00, 0x05,
                  0x05, 0x04, 0x03, 0x02, 0x01]);
			var testKLV2 = new Buffer([
                  0xFF, 0x3D, 0x99, 0x23, 0x4D, 0x01, 0x02, 0x03, 0x04, 0xAD, 0xAC, 0xAB, 0xAA, 0x00, 0x00, 0x00,
                  0x82, 0x00, 0x07,
                  0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]);
			var testKLVs = Buffer.concat([testKLV1, testKLV2]);

			// Create a simple read stream for the testKLV bytes
			var byteStream = new stream.Stream();
			byteStream.readable = true;

			var klvStream = klv.createStream();
			byteStream.pipe(klvStream);

			var iterationCounter = 1;

		   	klvStream.on('key', function(key) {
		   		assert(key);
		   		assert.equal(key.length, 16);
		   		if (iterationCounter === 1)
		   			assert.deepEqual(key, testKLV1.slice(0, 16));
		   		else
		   			assert.deepEqual(key, testKLV2.slice(0, 16));
		   	});

		   	klvStream.on('length', function(length) {
		   		assert(length);
		   		assert.equal(typeof length, 'number');
		   		if (iterationCounter === 1)
		   			assert.equal(length, 5);
		   		else
		   			assert.equal(length, 7);
		   	});

		   	klvStream.on('value', function(value) {
		   		assert(value);
		   		assert.equal(typeof value, 'object');
		   		if (iterationCounter === 1) {
		   			assert.equal(value.length, 5);
		   			assert.deepEqual(value, testKLV1.slice(20, 25));
		   		}
		   		else {
		   			assert.equal(value.length, 7);
		   			assert.deepEqual(value, testKLV2.slice(19, 26));
		   		}
		   		iterationCounter++;
		   	});

		   	klvStream.on('end', function() {
		   		assert.equal(iterationCounter, 3);
		   		done();
		   	});

		   	// Emit the KLV 
		   	byteStream.emit('data', testKLVs);
		   	byteStream.emit('end');
		});
	});

});