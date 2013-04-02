/**
 * Unit tests for KLV parsing
 */
 
var assert = require('assert'),
    stream = require('stream'),
    klv = require('../lib/klv');

describe('klv:', function() {

    describe('decodeBER', function() {
        it('should decode a BER-encoded length to an int', function() {
            // 1 byte long
            assert.equal(klv.decodeBER(new Buffer([0x00])).value, 0);
            assert.equal(klv.decodeBER(new Buffer([0x01])).value, 1);
            assert.equal(klv.decodeBER(new Buffer([0x7f])).value, 127);
            // 2 bytes long
            assert.equal(klv.decodeBER(new Buffer([0x81, 0x00])).value, 0);
            assert.equal(klv.decodeBER(new Buffer([0x81, 0x01])).value, 1);
            assert.equal(klv.decodeBER(new Buffer([0x81, 0x7f])).value, 127);
            assert.equal(klv.decodeBER(new Buffer([0x81, 0xff])).value, 255);
            // 3 bytes long
            assert.equal(klv.decodeBER(new Buffer([0x82, 0x00, 0x00])).value, 0);
            assert.equal(klv.decodeBER(new Buffer([0x82, 0x00, 0x01])).value, 1);
            assert.equal(klv.decodeBER(new Buffer([0x82, 0x00, 0x7f])).value, 127);
            assert.equal(klv.decodeBER(new Buffer([0x82, 0x01, 0x00])).value, 256);
            // 4 bytes long
            assert.equal(klv.decodeBER(new Buffer([0x83, 0x00, 0x00, 0x00])).value, 0);
            assert.equal(klv.decodeBER(new Buffer([0x83, 0x00, 0x00, 0x01])).value, 1);
            assert.equal(klv.decodeBER(new Buffer([0x83, 0x00, 0x00, 0x7f])).value, 127);
            assert.equal(klv.decodeBER(new Buffer([0x83, 0x00, 0x01, 0x00])).value, 256);
            assert.equal(klv.decodeBER(new Buffer([0x83, 0x01, 0x00, 0x00])).value, 65536);
            assert.equal(klv.decodeBER(new Buffer([0x83, 0x01, 0x00, 0x0A])).value, 65546);
            assert.equal(klv.decodeBER(new Buffer([0x83, 0x01, 0x01, 0x00])).value, 65536 + 256);
            assert.equal(klv.decodeBER(new Buffer([0x83, 0x01, 0x01, 0x01])).value, 65536 + 257);

        });
    });

    describe('encodeBER', function() {
        it('should encode an integer to a BER value', function() {
            // Single byte ints
            assert.deepEqual(klv.encodeBER(0, 4), new Buffer([0x83, 0x00, 0x00, 0x00]));
            assert.deepEqual(klv.encodeBER(10, 4), new Buffer([0x83, 0x00, 0x00, 0x0A]));
            assert.deepEqual(klv.encodeBER(127, 4), new Buffer([0x83, 0x00, 0x00, 0x7F]));
            assert.deepEqual(klv.encodeBER(255, 4), new Buffer([0x83, 0x00, 0x00, 0xFF]));
            // Multi-byte ints
            assert.deepEqual(klv.encodeBER(256, 4), new Buffer([0x83, 0x00, 0x01, 0x00]));
            assert.deepEqual(klv.encodeBER(513, 4), new Buffer([0x83, 0x00, 0x02, 0x01]));
            assert.deepEqual(klv.encodeBER(65535, 4), new Buffer([0x83, 0x00, 0xFF, 0xFF]));
            assert.deepEqual(klv.encodeBER(65536, 4), new Buffer([0x83, 0x01, 0x00, 0x00]));
            assert.deepEqual(klv.encodeBER(65546, 4), new Buffer([0x83, 0x01, 0x00, 0x0A]));
            assert.deepEqual(klv.encodeBER(65536 + 256, 4), new Buffer([0x83, 0x01, 0x01, 0x00]));
            assert.deepEqual(klv.encodeBER(65536 + 257, 4), new Buffer([0x83, 0x01, 0x01, 0x01]));
        });
    });

    describe('encode/decodeBER', function() {
        it('should encode and decode a BER, producing the same value', function() {
            [0, 10, 127, 256, 513, 65535, 65536, 65546, 104532, 256*256*256*24].forEach(function(value) {
                assert.equal(value, klv.decodeBER(klv.encodeBER(value)).value);
            });
        });
    });

    describe('createStream#single KLV', function() {
        it('should create a new KLV stream and transform the incoming stream into a KLV', function(done) {
            var testKLV = new Buffer([
                  0x03, 0x2E, 0x5F, 0xAB, 0x08, 0x12, 0x2F, 0x0C, 0xEE, 0x33, 0x00, 0x01, 0x02, 0x45, 0x6D, 0xDD,
                  0x83, 0x00, 0x00, 0x05,
                  0x05, 0x04, 0x03, 0x02, 0x01])

            var valueEventReceived = false;

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

            klvStream.on('value', function(value) {
                assert(value);
                assert.equal(typeof value, 'object');
                assert.equal(value.length, 5);
                assert.deepEqual(value, testKLV.slice(20));
                valueEventReceived = true;
            });

            klvStream.on('end', function() {
                assert(valueEventReceived);
                done();
            });

            // Emit the KLV 
            byteStream.emit('data', testKLV);
            byteStream.emit('end');
        });
    });

    describe('createStream#single KLV with custom key length', function() {
        it('should create a new KLV stream with custom key kength and transform the incoming stream into a KLV', function(done) {
            
            var testKLV = new Buffer([
                // Key length of 18
                0x03, 0x2E, 0x5F, 0xAB, 0x08, 0x12, 0x2F, 0x0C, 0xEE, 0x33, 0x00, 0x01, 0x02, 0x45, 0x6D, 0xDD, 0x55, 0x67,
                0x83, 0x00, 0x00, 0x05,
                0x05, 0x04, 0x03, 0x02, 0x01])

            var valueEventReceived = false;

            // Create a simple read stream for the testKLV bytes
            var byteStream = new stream.Stream();
            byteStream.readable = true;

            var klvStream = klv.createStream({keyLength: 18});
            byteStream.pipe(klvStream);

            klvStream.on('key', function(key) {
                assert(key);
                assert.equal(key.length, 18);
                assert.deepEqual(key, testKLV.slice(0, 18));
            });

            klvStream.on('value', function(value) {
                assert(value);
                assert.equal(typeof value, 'object');
                assert.equal(value.length, 5);
                assert.deepEqual(value, testKLV.slice(22));
                valueEventReceived = true;
            });

            klvStream.on('end', function() {
                assert(valueEventReceived);
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

            // Emit the KLVs in multiple chopped up data events
            byteStream.emit('data', testKLV1.slice(0,10));
            byteStream.emit('data', Buffer.concat([testKLV1.slice(10), testKLV2.slice(0, 4)]));
            byteStream.emit('data', testKLV2.slice(4));
            byteStream.emit('end');
        });
    });

    describe('encodeKLV', function() {
        it('should encode a key and a value into a KLV', function() {
            var testKey = new Buffer([0x03, 0x2E, 0x5F, 0xAB, 0x08, 0x12, 0x2F, 0x0C, 0xEE, 0x33, 0x00, 0x01, 0x02, 0x45, 0x6D, 0xDD]);
            var testValue = new Buffer([0x05, 0x04, 0x03, 0x02, 0x01]);
            var encodedKLV = klv.encodeKLV(testKey, testValue);
            assert.deepEqual(encodedKLV, Buffer.concat([testKey, new Buffer([0x05]), testValue]));
            var encodedKLV = klv.encodeKLV(testKey, testValue, 4);
            assert.deepEqual(encodedKLV, Buffer.concat([testKey, new Buffer([0x83, 0x00, 0x00, 0x05]), testValue]));
        });
    });

    describe('encodeKLV with different key length to 16', function() {
        it('should encode a key (of length 18) and a value into a KLV', function() {
            var testKey = new Buffer([0x03, 0x2E, 0x5F, 0xAB, 0x08, 0x12, 0x2F, 0x0C, 0xEE,
                                      0x33, 0x00, 0x01, 0x02, 0x45, 0x6D, 0xDD, 0x55, 0x96]);
            var testValue = new Buffer([0x05, 0x04, 0x03, 0x02, 0x01]);
            var encodedKLV = klv.encodeKLV(testKey, testValue);
            assert.deepEqual(encodedKLV, Buffer.concat([testKey, new Buffer([0x05]), testValue]));
            var encodedKLV = klv.encodeKLV(testKey, testValue, 4);
            assert.deepEqual(encodedKLV, Buffer.concat([testKey, new Buffer([0x83, 0x00, 0x00, 0x05]), testValue]));
        });
    });

    describe('setEncoding', function() {
        it('should output KLV values in the proper encoded string format', function() {
            var testKey = new Buffer([0x03, 0x2E, 0x5F, 0xAB, 0x08, 0x12, 0x2F, 0x0C, 0xEE, 0x33, 0x00, 0x01, 0x02, 0x45, 0x6D, 0xDD]);
            var testValue = new Buffer('these are little endian encoded Unicode characters', 'utf16le');
            var encodedKLV = klv.encodeKLV(testKey, testValue);
            assert.deepEqual(encodedKLV, Buffer.concat([testKey, new Buffer([0x64]), testValue]));
            var encodedKLV = klv.encodeKLV(testKey, testValue, 4);
            assert.deepEqual(encodedKLV, Buffer.concat([testKey, new Buffer([0x83, 0x00, 0x00, 0x64]), testValue]));

            // test outputting
            var klvStream = klv.createStream();
            klvStream.setEncoding('utf16le');
            klvStream.on('value', function(value) {
                assert.equal(value.length, 50);
                assert.equal(value, 'these are little endian encoded Unicode characters');
            });
            klvStream.write(encodedKLV);
            klvStream.end();
        });
    });

});