## Overview

This repository includes:

- **Drone.py** Python drone controller app
- **MissionController.py** - Python UDP server/client wrapper
- **Connector.js** - NodeJS UDP server/client connector for testing purposes
- **MissionController.service** - Systemd service which launches the MissionContoller

![Alt text](NavioControllerDiagram.jpg?raw=true 'Diagram')

```
pip install -r requirements.txt
```

Starting DroneController:

`python MissionController.py`

Mission controller takes `--drone_address` parameter which should be a UDP/TCP MavLink connection string (in form protocol:host:port). Eighter directly from the ArduCopter or through mavproxy.py

Starting NodeUDP Connector

`node test-drone.js`

After booting up and successfully connecting to the drone, MissionController listens to UDP port for incoming messages from NodeServer.
In background it sends every second a complete list of drone parameters in JSON format.

## Quick Start on laptop

1. `python MissionController.py`

2. Wait until server starts to listen on port 5005

3. `python MissionController.py`

## Startup on a Navio drone

1. `mavproxy.py --master tcp:127.0.0.1:5670 --out udp:127.0.0.1:14550 (--out udp:APM_PLANNER_IP_ADDRESS:14550)`
2. `python MissionController.py --drone_address udp:127.0.0.1:14550`
3. `node test.js`

## Misc commands

Ernst-Reuter-Platz: 52.512904, 13.322384

For example to connect with a Linux based SITL over Mavproxy

`mavproxy.py --master tcp:192.168.43.143:5764 --out udp:127.0.0.1:14550 --map`

`python MissionController.py --drone_address udp:0.0.0.0:14550`

`$ dronekit-sitl copter --home 52.512904,13.322384,30,354`

`$ sim_vehicle --l 52.512904,13.322384,30,354 --mode quad`

`$ sim_vehicle --l TEL --no-mavproxy --mode quad`
