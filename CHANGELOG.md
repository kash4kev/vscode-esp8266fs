# Change Log

All notable changes to the "vscode-esp8266fs" extension will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [1.0.1] 2018-4-7

* Fixed errata and ran **markdownlint** on all .md files.
* Fixed all missing overrides.  Expanded OTA overrides.
* Added `esp8266.packSpiffs` command.
* Made showErrorMessage modal.
* Added "#region" tags to source code.
* Refactored "upload" to minimize external tool requirements.
* Removed `esp8266fs.python`, defering to `python.pythonPath`.

## [1.0.0] 2018-2-13

* Fixed errata and expanded documentation.
* Located espota.py correctly.
* Changed `esp8266fs.uploadData` -> `esp8266fs.uploadSpiffs`.
* Added `esp8266fs.unpackSpiffs`, `esp8266fs.listSpiffs`, and *esp8266fs.visualizeSpiffs`.
* Added a variety of settings.json values to allow full control of the mkspiffs *rocess.
* Fixed various bugs and cleaned up code heirarchy.
* Updated Github infrastructure.
* Tested on Windows, OSX, and Linux (Ubuntu).

## [0.9.0] - 2018-02-11

* Initial release - out for review.