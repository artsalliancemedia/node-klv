Release Notes
=============

0.0.6
-----

* Added an option that allows the key length to be specified

* Added 'setEncoding' so that the encoding of the KLV value is automatically emitted; handy when UTF-8 isn't used

* The stream is now readable so it can be chained in pipes

0.0.5
-----

* Refactored the way KLV streams were implemented to make them more extendible; strengthened the unit tests.

0.0.4
-----

* Removed the 'length' event as it didn't serve any useful purpose.

* Removed passing through the data (re-emitting it) so the stream can be used duplex.

0.0.3
-----

* Added a BER encoder.

* Added a new function, encodeKLV, to encode a key and value buffer into a KLV.

0.0.2
-----

* Fixed compatibilty issues with Node versions < 0.8. 0.4 and 0.6 unit tests pass.

0.0.1
-----

* Initial release