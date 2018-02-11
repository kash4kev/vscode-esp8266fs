# Visual Studio Code extension for ESP8266 File System (SPIFFS)

Welcome to the Visual Studio extension for the **ESP8266 File System Uploader**.  This extension provides the same functionality for VSCode as the [Arduino ESP8266 filesystem uploader](https://github.com/esp8266/arduino-esp8266fs-plugin) does for the Arduino IDE: it packages and uploads a BLOB to an ESP8266 allowing it to use a portion of it's Flash Memory as a Storage Device with SPIFFS (**SPI** **F**lash **F**ile **S**ystem).

Whereas the Arduino IDE version adds a menu item to the IDE (*Tools/ESP8266 Sketch Data Updoad*), VSCode provides no such mechanism.  Instead, this extension implements a single VSCode command (`ESP8266: File System Upload Data [esp8266fs.uploadData]`) to perform the same task.

While this extension really doesn't need the [Arduino IDE](https://www.arduino.cc/en/Main/Software) installed - it only needs the ESP8266 package and tools - it's best to have it installed anyway.  This extension is meant to be a companion extension for the [Arduino for Visual Studio Code](https://github.com/Microsoft/vscode-arduino) plugin, and it relies on the Arduino IDE to compile and upload code through their toolchain.

## Features

* Works with or without the [Arduino for Visual Studio Code](https://github.com/Microsoft/vscode-arduino) plugin installed.
* Uses settings from **.vscode/arduino.json**, **.vscode/.../settings.json** or **...arduino.../preferences.txt**.

> Tip:                        Add the "esp866fs.upload" command to your **gulp/webpack** toolchain to turn your ESP8266 into a "one-button" dev cycle.

## Requirements

The [ESP8266 core for Arduino](https://github.com/esp8266/Arduino) needs to be installed on your computer.  This needs to be done through the [Arduino IDE](https://www.arduino.cc/en/Main/Software)'s Board Manager (*Tools/Board/Board Manager...*) or via the [Arduino for Visual Studio Code](https://github.com/Microsoft/vscode-arduino)'s "**arduino.showBoardManager**"command.

## Getting Started

After installing this extension, you need to:

* Create a new VSCode Project via the [Arduino for Visual Studio Code](https://github.com/Microsoft/vscode-arduino) extension (Command: `arduino.initialize`) or a new sketch with the **Arduino IDE**.

* Install the **ESP8266** board from the Board Manager.

* Select an **ESP8266** board as the target development board.

* Select the desired **SPIFFS** program/storage split (Arduino: *Tools/Flash Size...*, VSCode: *arduino.changeBoardType*).

* Create and populate a directory with the files to be uploaded to the target **ESP8266 SPIFFS** partition - **`i.e. to replace the current contents!`**

> Note: Maximum length  of a file name in **SPIFFS** is 32 characters.  Subdirectories are "simulated" in that a file name really contains the "/" of the file's folder.  I.e. a file stored at "abc/def/ghi.txt" has a name with 16 characters.  Files are packed relative to the `path` setting and not of the base OS.

* Set the `path` setting to point the base directory of the files to be uploaded.

* Set the `temp` setting to a filename that **mkspiffs** will create.

## Installation

Open VS Code and press `F1` or `Ctrl + Shift + P` to open command palette, select **Install Extension** and type `vscode-esp8266fs`.

Or launch VS Code Quick Open (`Ctrl + P`), paste the following command, and press enter.
```bash
ext install vscode-esp8266fs
```
You can also install directly from Marketplace within Visual Studio Code, searching for `ESP8266FS`.

## Extension Settings

The following Visual Studio Code settings are available for the `ESP8266FS` extension. These can be set in global user preferences `Ctrl + ,` or workspace settings (.vscode/settings.json). The later overrides the former.

```json
{
    "arduino.path": "C:/Program Files (x86)/Arduino",
    "esp8266fs.dataFiles": "data",
    "esp8266fs.spiffsImage": "spiffs.image.bin",
    "esp8266fs.logLevel": "normal",
}
```
* `arduino.path` - (*defined by the [Arduino ESP8266 filesystem uploader](https://github.com/esp8266/arduino-esp8266fs-plugin)*).   Path to Arduino, you can use a custom version of Arduino by modifying this setting to include the full path. Example: `C:\\Program Files\\Arduino` for Windows, `/Applications` for Mac, `/home/$user/Downloads/arduino-1.8.1` for Linux.

* `esp8266fs.dataFiles` - Location of the files to be uploaded to the ESP8266.  File names will be generated relative to this path.

* `esp8266fs.spiffsImage` - Location of the packed **SPIFFS** image to be uploaded to the ESP8266.

* `esp8266fs.logLevel` - Changes the amount of spew produced.  Set to either `normal`, `verbose`, `silent`, or `debug`.

The following settings are per sketch settings (*defined by the [Arduino ESP8266 filesystem uploader](https://github.com/esp8266/arduino-esp8266fs-plugin)*).  You can find them in `.vscode/arduino.json` under the workspace.

```json
{
        "port": "COM6",
        "board": "esp8266:esp8266:generic",
        "configuration": "...FlashSize=4M3M,...ResetMethod=ck,..."
}
```
* `port` - Name of the serial port connected to the device. Can be set by the `Arduino: Select Serial Port` command.
* `board` - Current selected Arduino board alias. Can be set by the `Arduino: Change Board Type` command. Also, you can find the board list there.
* `configuration` - (*Undocumented*) A comma-delimited string of the configuration settings selected for all board "menu" items.  **ESP8266FS** relies on two key/value pairs in the string: `FlashSize` and `ResetMethod`.

Alternatively, if the `.vscode/arduino.json` file doesn't exist, or a particular setting is not defined, then the settings in the Arduino IDE's `preferences.txt` file will be used instead.

```ini
board=generic
target_package=esp8266
target_platform=esp8266

serial.port=COM6

custom_FlashSize=generic_4M3M
custom_ResetMethod=generic_ck

```

---

## Development

Installing Prerequisites:

* [Git](https://git-scm.com/)
* [Node.js](https://nodejs.org/) (>= 6.5.0)
* [Npm](https://www.npmjs.com/) (>= 3.10.3)

To *run and develop*, do the following:
* `git clone https://github.com/kash4kev/vscode-esp8266fs`
* `cd vscode-esp8266fs`
* Open in Visual Studio Code (`code .`)
* Press `F5` to debug

---

## Change Log

See the [Change log](https://github.com/kash4kev/vscode-esp8266fs/blob/master/CHANGELOG.md) for the details of changes for each version.

## Known Issues

The code for the "python/espota" ("**O**ver **T**he **A**ir" *or* **IP**) exection has __not__ been tested due to lack of appropriate hardware and locating the "espota.py" script.

## Release Notes

### 0.9.0

Initial release - out for review.

## License

This extension is licensed under the [MIT License](https://github.com/Microsoft/vscode-esp8266fs/blob/master/LICENSE.txt).