# City Hub SDK
##### Date: November 2015, Authors: MR, TA
The City Hub SDK provides an emulation environment for the City Hub devices and their sensors (available parking spaces, available bikes (bike-sharing), temperature, humidity, ambient noise, traffic density, etc). Sensor values are be basically set through REST APIs. Sensor values can be queried through REST APIs (sample web application provided), or directly acquired through a pub/sub middleware (MQTT topics). Moreover, this SDK provides a sample transaction API for booking parking spaces and bikes.

This SDK provides:
  - A web application for emulating and getting/setting the status of City Hub devices (based on Node.js, AngularJS and Mosca MQTT Broker)
  - A command line tool for setting sensor values in a automated way (Node.js command line application)

# Installation
How to setup the NodeJS/JavaScript development environment required for this project (tested on Ubuntu 14.04 LTS / Windows 7 64-Bit).

## Windows-only Prerequisites

- Install Microsoft Windows SDK (required for compiling native dependencies and tools)
  - Download and install Microsoft Windows SDK for your Windows version (e.g. from [https://www.microsoft.com/en-us/download/details.aspx?id=8279]())
  - Make sure that you set the Microsoft Windows SDK environment variables before installing any node packages that require native compilation,
    by typing the following command in the console `<MS-SDK-PATH>\bin\Setenv.cmd /Release /x64`, e.g.:
    ```
    "C:\Program Files\Microsoft SDKs\Windows\v7.1\bin\Setenv.cmd" /Release /x64
    ```

## Install Dependencies

1. Install Node.js and npm
  - Download and install [Node.js v0.12.7](https://nodejs.org/en/blog/release/v0.12.7/) for your platform (note that there are some open issues with the newest node/npm versions 4.x/5.x concerning some npm dependencies)
  - Make sure node and npm are installed properly. Check this by typing:
    ```
    node --version
    npm --version
    ```
  - *(Optional)* Set npm proxy if required (e.g. by using the config scripts config_proxy.sh or config_proxy.bat)

2. Install Grunt and Bower using npm (executing shell commands with administrator rights might be required)
  - Type the following commands to install grunt and bower:
  ```
    npm install -g bower grunt grunt-cli
    bower --version
    grunt --version
  ```

3. *(Optional)* Install [Mosca](https://github.com/mcollina/mosca) MQTT broker
  - Type the following commands (executing with Administrator rights might be required):
  ```
     npm install -g mosca bunyan
     mosca --version
  ```

4. Automatically install project npm & bower dependencies excluding MQTT Mosca (executing with administrator rights might be required)
  - Windows:
    ```
       install.bat
    ```
  - Linux (sudo might be required):
    ```
       ./install.sh
    ```

5. Make sure that a modern web browser is installed (tested on Chrome v46)

Start the Application
---------------------
1. Start node application
  - Type the following command in the console for starting the application:
  ```
     npm start
  ```
  - Open the web browser with the URL [http://localhost:9000]()

2. *(Optional)* Start MQTT Broker Mosca (if installed), by typing:
  - Windows:
  ```
     start_mqtt_mosca.bat
  ```
  - Linux:
  ```
     ./start_mqtt_mosca.sh
  ```

3. Check/set sensor values
  - Using a web browser: [http://localhost:9000]()
  - Using the command line application, check script usage:
  ```
     node cli/sensor.js --help
  ```

# Project / Source Code Structure
Overview of the project structure
---------------------------------
| Path           | Contents |
|----------------|----------|
| . | README.md, LICENSE.txt, installation/helper scripts, etc. |
| ./server | Node.js web application server |
| ./client | HTML5 / JavaScript web client (based on AngularJS) |
| ./cli | Command line application for setting sensor values (through REST APIs), either single values or values scheduled via day-of-the-week-based timestamps |
| ./values | JSON files containing sample/forecast values for sensors (array of {dayOfWeek: 0-6, time: 0-24:0-59:0-59, value: 1234}) |

# Updates to City Hub SDK:-  
  - Added extra endpoints in device.controller.js and index.js (device) to make available requests for parking and bus delay data 
  - Added dependencies on mongo-oplog, mongodb, and ws, for making data available more dynamically
  - Needed mongo-oplog so that we can get notified when the data in the database has been updated 
  - Needed ws for WebSockets (ws since it's one of the fastest for node.js and because its speed allows us to handle a greater number of connections)
  - Added middleware/database/index.js for helper methods to access the content in the database 
  - Cleared users list for now since we didn't need any 
  - Cleared the old sensors list and added our own sensors (ParkingData and BusDelayData). These sensors delay with the data we are interested in for now. 
  - These new sensors contain the uri to the MongoDB and other information such as DB name, collection name, and WebSocket port that the user wants to bind to
  - Added more options in cli/sensor.js to accommodate new sensors. Also included some examples in that are logged to the console 
  - Added mongo_websockets_setup.js under server/config that contains methods which help configure the oplog listeners and the WebSockets for the ParkingData sensors after they user has edited all of them using node cli/sensor.js  
  
 # How to use new sensors:-
  - Go to server/config/sensors.js and add all the devices that you will be using to the list of devices (all these devices have the same sensors [ParkingData and BusDelayData])
  - Then start the application using :   
  ``` 
      npm start
  ```
  - After that modify all your sensors so that they hold the correct value corresponding to your MongoDB database. E.g. :   
  ``` 
      node cli/sensors.js --device TransitHub --sensor ParkingData --mongoAddress [address] --database [name of DB] --collection [collection name] --port [port you want to use for WebSockets]
  ``` 
  - Similarly you can modify the BusDelayData sensor as well (it doesn't require --port since we don't need to use WebSockets here)
  - After you're done modifying all your sensors configure them using (just once) :    
  ``` 
      node cli/sensors.js --configure 
  ```
  - All the sensors will then be set up as required
