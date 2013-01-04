[![Build Status](https://travis-ci.org/mjohnsullivan/node-klv.png)](http://travis-ci.org/mjohnsullivan/node-klv)

KLV Parser for Node
===================

A Node.js streaming parser for KLV (Key Length Value) encoded data.

KLV encoding is commonly used in the motion picture industry.

Usage
-----

```javascript
var fs = require('fs'),
    klv = require('klv');

var klvStream = klv.createStream();


klvStream.on('key', function(key) {
	console.log('Key:' + key);
});

klvStream.on('length', function(length) {
	console.log('Value length: ' + length);
});

klvStream.on('value', function(value) {
	console.log('Value: ' + value);
});

klvStream.on('end', function() {
	console.log('All done');
});

var fileStream = fs.createReadStream('some_klv_file');
fileStream.pipe(klvStream);
```

Incoming streams can have multiple KLVs; the parser will emit events as it encounters each one.

License (MIT)
-------------

Copyright 2013 Arts Alliance Media

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.