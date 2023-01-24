import math

import dronekit
from dronekit import VehicleMode, LocationGlobal, LocationGlobalRelative, Vehicle
import time


class DroneController(object):
    def __init__(self, connection_string=None, vehicle=Vehicle):
        self.gps_lock = False
        self.altitude = 0.0
        self.current_status = {}
        if connection_string:
            self.connection_string = connection_string;
        else:
            self.connection_string = self._start_SITL()

        self.vehicle = vehicle
        self.mission_start_location = []

    def _log(self, message):
        print("[DEBUG]: {0}".format(message))

    def connect(self):
        # Connect to the Vehicle
        self.vehicle = dronekit.connect(self.connection_string, heartbeat_timeout=15, wait_ready=True)
        self._log('Connected to vehicle.')

        # Clear mission waypoints
        self.commands = self.vehicle.commands
        self.commands.clear()
        self.commands.upload()

        self.current_coords = []
        # Get Vehicle Home location - will be `None` until first set by autopilot
        # while not self.vehicle.home_location:
        #     if not self.vehicle.home_location:
        #         self._log(" Waiting for home location...")
        #     time.sleep(2)

        self._log("Drone app started")

    def takeoff(self, aTargetAltitude=30, delay=1):
        self.arm()
        self._log("Taking off")

        # Register observers
        self.vehicle.add_attribute_listener('location', self.location_callback)
        self.vehicle.add_attribute_listener('mode', self.mode_callback)

        self.vehicle.simple_takeoff(aTargetAltitude)
        time.sleep(delay)

        # Wait until the vehicle reaches a safe height before processing the goto (otherwise the command

    def mode_callback(self, vehicle, attribute_name, value):
        # print(attribute_name, value)
        if value == VehicleMode("RTL"):
            print ("Was in mode_callback")
            self._log("Unexpeced mode change (%s), aborting the operation" % value)
            self._stop()

    def change_mode(self, mode):
        self._log("Changing to mode: {0}".format(mode))
        self.vehicle.mode = VehicleMode(mode)
        while self.vehicle.mode.name != mode:
            self._log('  ... changing mode in progress: {0} != {1}'.format(mode, self.vehicle.mode.name))
            time.sleep(2)
        self._log("Mode changed successfully ")

    def goto(self, location, relative=None):
        self._log("Goto: {0}, {1}".format(location, self.altitude))
        if relative:
            self.vehicle.simple_goto(
                LocationGlobalRelative(float(location[0]), float(location[1]), float(self.altitude))
            )
        else:
            self.vehicle.simple_(
                LocationGlobal(float(location[0]), float(location[1]), float(self.altitude))
            )
        self.vehicle.flush()
        time.sleep(1)

    def get_location_global(self, lat, long):
        return LocationGlobalRelative(lat, long, float(self.altitude))

    def get_location(self):
        return [self.current_location.lat, self.current_location.lon]

    def location_callback(self, vehicle, name, location):
        if location.global_relative_frame.alt is not None:
            self.altitude = location.global_relative_frame.alt
        # self.current_status= self._print_stats(True)
        self.current_location = location.global_relative_frame

    def arm(self, value=True):
        """ Description    
        :type Boolean:
        :param value: On/Off Motors arming 
    
        """
        if value:
            self._log('Waiting for arming...')
            self.vehicle.armed = True
            while not self.vehicle.armed:
                time.sleep(.1)
        else:
            self._log("Disarming!")
            self.vehicle.armed = False

    def land(self):
        self._log("Changing mode to LAND")
        self.change_mode("LAND")
        # self._log("Landing...")

    def check_if_armable(self):
        self._log("Waiting for ability to arm...")
        while not self.vehicle.is_armable:
            time.sleep(.1)

    def launch(self):
        self._log("Waiting for location...")
        while self.vehicle.location.global_frame.lat == 0:
            time.sleep(0.1)
        self.home_coords = [self.vehicle.location.global_frame.lat,
                            self.vehicle.location.global_frame.lon]

        self._log("Waiting for ability to arm...")
        while not self.vehicle.is_armable:
            time.sleep(.1)

        self._log('Running initial boot sequence')
        self.change_mode('GUIDED')

    def initDroneForManualFlight(self, timeout):
        self._log("Waiting for location...")
        # while self.vehicle.location.global_frame.lat == 0:
        #    time.sleep(0.5)
        self.home_coords = [self.vehicle.location.global_frame.lat,
                            self.vehicle.location.global_frame.lon]

        timeout_counter = 0

        while not self.vehicle.is_armable and (timeout_counter < timeout):
            time.sleep(1)
            self._log("Waiting for ability to arm... "+str(timeout_counter)+" "+str(timeout))
            timeout_counter += 1;

        self._log('Running initial boot sequence')
        self.change_mode('ALT_HOLD')


    def _print_stats(self, dump=False):
        # Get some vehicle attributes (state)
        if not dump:
            print("Get some vehicle attribute values:")
            print(" GPS: %s" % self.vehicle.gps_0)
            print(" Battery: %s" % self.vehicle.battery)
            print(" Last Heartbeat: %s" % self.vehicle.last_heartbeat)
            print(" Is Armable?: %s" % self.vehicle.is_armable)
            print(" System status: %s" % self.vehicle.system_status.state)
            print(" Mode: %s" % self.vehicle.mode.name)  # settable
        else:
            return {"GPS": str(self.vehicle.gps_0),
                    "Batt": str(self.vehicle.battery),
                    "Altitude": str(self.altitude),
                    "Coords": self.get_location()
                    }

    def _start_SITL(self):
        from dronekit_sitl import SITL
        sitl = SITL()
        sitl.download(system="copter", version="3.3",
                      verbose=True)  # ...or download system (e.g. "copter") and version (e.g. "3.3")
        sitl.launch(["--home=52.512593, 13.321893,0,90"], verbose=False, await_ready=False, restart=False)
        sitl.block_until_ready(verbose=True)  # explicitly wait until receiving commands

        connection_string = sitl.connection_string()
        return connection_string

    def _stop(self):
        # Closes the connection
        self.vehicle.close()

    # Experimental functions to for indoor flight
    def arm_and_takeoff_nogps(self,aTargetAltitude):
        """
        Arms vehicle and fly to aTargetAltitude without GPS data.
        """

        ##### CONSTANTS #####
        DEFAULT_TAKEOFF_THRUST = 0.7
        SMOOTH_TAKEOFF_THRUST = 0.6

        print("Basic pre-arm checks")
        # Don't let the user try to arm until autopilot is ready
        # If you need to disable the arming check, just comment it with your own responsibility.
        while not self.vehicle.is_armable:
            print(" Waiting for vehicle to initialise...")
            time.sleep(1)

        print("Arming motors")
        # Copter should arm in GUIDED_NOGPS mode
        #self.vehicle.mode = VehicleMode("GUIDED_NOGPS")
        self.change_mode("GUIDED_NOGPS")
        self.vehicle.armed = True

        while not self.vehicle.armed:
            print(" Waiting for arming...")
            time.sleep(1)

        print("Taking off!")

        thrust = DEFAULT_TAKEOFF_THRUST
        while True:
            current_altitude = self.vehicle.location.global_relative_frame.alt
            print(" Altitude: %s" % current_altitude)
            if current_altitude >= aTargetAltitude * 0.95:  # Trigger just below target alt.
                print("Reached target altitude")
                break
            elif current_altitude >= aTargetAltitude * 0.6:
                thrust = SMOOTH_TAKEOFF_THRUST
            self.set_attitude(thrust=thrust)
            time.sleep(0.2)

    #Experimental functions to for indoor flight
    def set_attitude(self,roll_angle=0.0, pitch_angle=0.0, yaw_rate=0.0, thrust=0.5, duration=0):
        """
        Note that from AC3.3 the message should be re-sent every second (after about 3 seconds
        with no message the velocity will drop back to zero). In AC3.2.1 and earlier the specified
        velocity persists until it is canceled. The code below should work on either version
        (sending the message multiple times does not cause problems).
        """

        """
        The roll and pitch rate cannot be controllbed with rate in radian in AC3.4.4 or earlier,
        so you must use quaternion to control the pitch and roll for those vehicles.
        """

        # Thrust >  0.5: Ascend
        # Thrust == 0.5: Hold the altitude
        # Thrust <  0.5: Descend
        msg = self.vehicle.message_factory.set_attitude_target_encode(
            0,
            0,
            # Target system
            0,
            # Target component
            0b00000000,
            # Type mask: bit 1 is LSB
            self.to_quaternion(roll_angle, pitch_angle),
            # Quaternion
            0,
            # Body roll rate in radian
            0,
            # Body pitch rate in radian
            math.radians(yaw_rate),
            # Body yaw rate in radian
            thrust)
        # Thrust
        self.vehicle.send_mavlink(msg)

        if duration != 0:
            # Divide the duration into the frational and integer parts
            modf = math.modf(duration)

            # Sleep for the fractional part
            time.sleep(modf[0])

            # Send command to vehicle on 1 Hz cycle
            for x in range(0, int(modf[1])):
                time.sleep(1)
                self.vehicle.send_mavlink(msg)


    def to_quaternion(self,roll=0.0, pitch=0.0, yaw=0.0):
        """
        Convert degrees to quaternions
        """
        t0 = math.cos(math.radians(yaw * 0.5))
        t1 = math.sin(math.radians(yaw * 0.5))
        t2 = math.cos(math.radians(roll * 0.5))
        t3 = math.sin(math.radians(roll * 0.5))
        t4 = math.cos(math.radians(pitch * 0.5))
        t5 = math.sin(math.radians(pitch * 0.5))

        w = t0 * t2 * t4 + t1 * t3 * t5
        x = t0 * t3 * t4 - t1 * t2 * t5
        y = t0 * t2 * t5 + t1 * t3 * t4
        z = t1 * t2 * t4 - t0 * t3 * t5

        return [w, x, y, z]


""" class Command(Thread):
    def __init__(self, type):
        ''' Constructor. '''
 
        Thread.__init__(self)
        self.command = type
        payload = {}


    def run(self):

 """
