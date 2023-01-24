from __future__ import print_function
import os
import json
import re
import math
import time
import thread
import socket
import argparse
import dronekit
import exceptions
from util import Util
from Drone import DroneController

util = Util()

parser = argparse.ArgumentParser(
    description='This module acts as a message broker and mission controller between UDP Client and ArduCopter.')
parser.add_argument('--drone_address', help="Set connection string to drone (or SITL)")


class MissionController(object):
    def __init__(self, UDP_IP="127.0.0.1", HOST_PORT=5005, CLIENT_PORT=5006, drone_address=""):

        """ This module acts as a message broker and mission controller between UDP Client and ArduCopter.
            It takes as a parameters 
            :param UDP_IP: Ip adress of the socket
            :param HOST_PORT: Port for the python script (per default 5005)
            :param CLIENT_PORT: Port of the node client (per default 5006)
            :param drone_address: Connection string to the Ardupilot instance in form "protocol:host:port"
        """
        self.host = UDP_IP
        self.port = HOST_PORT
        self.HOST_SERVER_ADDRESS = (UDP_IP, HOST_PORT)
        self.NODE_SERVER_ADDRESS = (UDP_IP, CLIENT_PORT)

        if drone_address == "":
            self.controller = DroneController()
        else:
            self.controller = DroneController(connection_string=drone_address)

        self.controller.connect()
        self.delivery = Delivery(self, self.controller.vehicle, home_location=self.controller.vehicle.home_location)

    def run_udp_socket_server(self, host=None, port=None):
        """
        This function starts a UPD socket server for communication with node.
        :param host:
        :param port:
        """
        self.run_udp_client()
        if host and port:
            self.host = host;
            self.port = port;
        print("Starting socket server.")
        self.server = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.server.bind((self.host, self.port))
        print("Listening on path: %s:%s" % (self.host, self.port))

        # thread.start_new_thread(self.broadcast_status, ())
        while True:
            datagram = self.server.recv(1024)
            if not datagram:
                break
            else:
                print("-" * 20)
                print(datagram)
                self.router_callback(datagram)
            if "DONE" == datagram:
                break

    def router_callback(self, data):
        """
        Callback function which is called every time a new message arrives.
        It parses the request and starts every operation.
        :param data: UDP Message as a string
        """
        # Remove the EOF characters
        data = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\xff]', '', data)

        dt = util.json_loads_byteified(data)
        payload = {}

        if dt.get('type') == "DeliverPackage":
            data = dt.get("data")

            if data.get("goal") == "GoToTarget":
                target = data.get("latlong")
                alt = data.get("alt")
                timeout = data.get("timeout")
                self.delivery.target = target
                self.delivery.go_to_target(alt)
                payload = {"Operation": "DeliveryPackage", 'goal': "goToTarget", "Status": "Completed"}

            # elif data.get("goal") == "ReturnToHome":
            #     self.delivery.return_to_home()
            #     payload = {"Operation": "DeliveryPackage", 'goal': "ReturnToHome", "Status": "Completed"}

            elif data.get("goal") == "initDrone":
                #self.controller.launch()
                timeout = data.get("timeout")
                self.controller.initDroneForManualFlight(timeout)
                payload = {"Operation": "DeliveryPackage", 'goal': "initDrone", "Status": "Completed"}

            elif data.get('goal') == "getCoordinates":
                if self.controller:
                    self.broadcast_status()
                    payload = {"Operation": "getCoordinates", "Status": "Success"}

                else:
                    payload = {"Operation": "getCoordinates", "Status": "Failed. Device not ready"}

            elif data.get("goal") == "testDrone":
                self.controller.arm_and_takeoff_nogps(2.5)

                # Hold the position for 3 seconds.
                print("Hold position for 3 seconds")
                self.controller.set_attitude(duration=1)
                vehicle.mode = VehicleMode("LAND")
                payload={"Operation": "testDrone", "Status": "Success"}

        self.sendMessage(type="command", data=payload)

        #
        #
        # if dt.get('type') == "Launch":
        #     self.controller.launch()
        #     payload = {"Operation": "Launch", "Status": "Completed"}
        #
        # elif dt.get("type") == "Land":
        #     self.controller.land()
        #     thread.start_new_thread(self.check_if_landed, ())
        #
        # elif dt.get('type') == "GoTo":
        #     try:
        #         tmp = dt.get("data")
        #         tmp = tmp.get("latlong")
        #         self.controller.goto(tmp, 30)
        #         tmp = self.controller.get_location_global(tmp[0], tmp[1])
        #         thread.start_new_thread(self.check_if_target_reached, (tmp,))
        #     except Exception as Err:
        #         print(Err.message)
        #
        # elif dt.get('type') == "Status":
        #     if self.controller:
        #         payload = self.prepareStatusMsg()
        #     else:
        #         payload = {"GPS": "Test", "Bat": 200}


    def check_if_landed(self):
        """
        This function observes the altitude while landing procedure was launched. As soon as it detects that device has landed it sends the UDP message
        """
        while True:
            if not self.controller.vehicle.armed:
                self.sendMessage(type="command", data={"Operation": "Land", "Status": "Complete"})
                self.controller.change_mode("GUIDED")
                break
            else:
                print("Landing... " + str(self.controller.altitude) + " m")
                time.sleep(1.5)

    def check_if_took_off(self, target_altitude):
        """
        Similar to "check_if_landed" but it is meant to assure that drone reached a safe altitude.()
        :param target_altitude: Safe altitude
        """
        while True:
            print(" Altitude: ", self.controller.vehicle.location.global_relative_frame.alt)
            # Break and return from function just below target altitude.
            if self.controller.vehicle.location.global_relative_frame.alt >= target_altitude * 0.95:
                print("Reached target altitude")
                self.sendMessage(type="command", data={"Operation": "TakeOff", "Status": "Complete"})
                break
            time.sleep(1.5)

    def check_if_target_reached(self, targetLocation, radius=1.5):
        """
        Monitors the position of the drone and checks if the target destination has already been reached
        :param targetLocation:
        :return:
        """

        def get_distance_metres(aLocation1, aLocation2):
            """
            Returns the ground distance in metres between two LocationGlobal objects.
            It comes from the ArduPilot test code.
            """
            dlat = aLocation2.lat - aLocation1.lat
            dlong = aLocation2.lon - aLocation1.lon
            return math.sqrt((dlat * dlat) + (dlong * dlong)) * 1.113195e5

        while self.controller.vehicle.mode.name == "GUIDED":
            # Stop action if we are no longer in guided mode.
            # targetDistance = get_distance_metres(self.controller.get_location_global(targetLocation[0],targetLocation[1]),self.controller.get_location_global(targetLocation))

            try:
                remainingDistance = get_distance_metres(self.controller.vehicle.location.global_relative_frame,
                                                        self.controller.get_location_global(targetLocation[0],
                                                                                            targetLocation[1]))
            except TypeError as err:
                remainingDistance = get_distance_metres(self.controller.vehicle.location.global_relative_frame,
                                                        targetLocation)

            print("Distance to target: ", remainingDistance)
            if remainingDistance <= radius:
                print("Reached target")
                self.sendMessage(type="command", data={"Operation": "GoTo", "Status": "Success"})
                break
            else:
                time.sleep(2)

    def sendMessage(self, type='message', data={}):
        """
        This function dispatches the message;
        :param type: Message type.
        :param data: Dict which is goint to be sent
        """
        try:
            dump = json.dumps({"type": type, 'data': data})
            self.server.sendto(dump + "\f", self.NODE_SERVER_ADDRESS)
        except AttributeError as err:
            print("Send failed. Waiting for server. " + err.message)

    def broadcast_status(self,runOnce = True):
        """
        This function is responsible for sending the status messages to Node application

        """

        def _prepare_status_msg(self):
            try:
                return {"bat": self.controller.vehicle.battery.__str__(),
                        "gps": self.controller.vehicle.gps_0.__str__(),
                        "alt": self.controller.altitude.__str__(),
                        "loc": self.controller.vehicle.location.global_frame.__str__(),
                        "mode": self.controller.vehicle.mode.__str__(),
                        "airspeed": self.controller.vehicle.airspeed.__str__(),
                        "groundspeed": self.controller.vehicle.airspeed.__str__()}
            except AttributeError as err:
                return {"message": "Device not ready "}

        if runOnce:
            msg = _prepare_status_msg(self)
            self.sendMessage(type="statusMessage", data=msg)
        else:
            while True:
                msg = _prepare_status_msg(self)
                self.sendMessage(type="statusMessage", data=msg)
                time.sleep(3)

    def closeServer(self):
        print("-" * 20)
        print("Server is shutting down now...")
        self.server.close()
        os.remove(self.server_path)
        print("Server shutdown and path removed.")

    def run_udp_client(self):
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)


class Delivery(object):
    def __init__(self, mission_controller, vehicle, target_location="", home_location=""):
        """
        Delivery class is meant to realize the Proceed project use-case.
        It takes off and flies to desired location in order to land and wait for a button press. After pressing the button it will wait 5 second
        and come back to the place where the Delivery mission stated off.

        :param mission_controller:
        :param vehicle:
        :param target_location: Location where the package should be delivered
        :param home_location: Mission start location
        """
        self.target = target_location
        self.home = home_location
        self.vehicle = vehicle
        self.mc = mission_controller

    def go_to_target(self, alt=10, timeout=180):
        self.mc.controller.launch()
        self.mc.controller.takeoff(alt)
        self.mc.check_if_took_off(alt)
        try:
            # tmp_location = self.mc.controller.get_location_global(self.target[0], self.target[1])
            # print(tmp_location)
            self.mc.controller.goto(self.target, alt)
            self.mc.check_if_target_reached(self.target)
        except Exception as e:
            print(str(e))

        self.mc.controller.land()
        self.mc.check_if_landed()
        self.mc.sendMessage(type="command",
                            data={"Operation": "DeliverPackage", "goal": "GoToTarget", "Status": "Completed"})

    def return_to_home(self):
        """
        This function should be triggered after clicking the button on the drone. It commands the return of the drone to the place it has started the mission.
        """
        time.sleep(5)  # Wait few seconds before starting a return procedure
        print("Return to home start!")
        self.mc.controller.takeoff(20)
        self.mc.check_if_took_off(20)
        self.mc.controller.goto([self.home.lat, self.home.lon], 20)
        self.mc.check_if_target_reached([self.home.lat, self.home.lon])
        self.mc.controller.land()
        self.mc.check_if_landed()
        self.mc.sendMessage(data={"Operation": "DeliverPackage", "goal": "ReturnToHome", "Status": "Success"})


if __name__ == '__main__':
    args = parser.parse_args()
    try:
        if args.drone_address:
            ms = MissionController(drone_address=args.drone_address)
        else:
            ms = MissionController()
        ms.run_udp_socket_server()
    # Bad TCP connection
    except socket.error:
        print('No server exists!')
    # Bad TTY connection
    except exceptions.OSError as e:
        print('No serial exists! ' + str(e.message))
    # API Error
    except dronekit.APIException as e:
        print('Dronekit Timeout! ' + str(e.message))
    # Other error
    except Exception as e:
        print('Some other error! ' + str(e.message))
