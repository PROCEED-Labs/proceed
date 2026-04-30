/**
 * Class that handles continuous updates which should happen if at least one user registered
 * interest in the information but which should not happen per user but as a single loop for all
 * interested users
 **/
export default class BackgroundUpdateRegister {
  private updateLoop: ReturnType<typeof setInterval> | undefined;
  private userRegistrations: Record<string, ReturnType<typeof setTimeout>> = {};
  private registrationTimeout: number;
  private onCleanup?: () => void;

  /**
   * Create a handler for user registrations to some update loop
   *
   * @param updateFn the function that is periodically triggered to run some updates
   * @param onCleanup the function that should be called when the last user has unregistered
   * @param [updateInterval=1000] the frequency with which the update function should run
   * @param [registrationTimeout=30000] the time after which a user gets unregistered if they do not
   * refresh their registration
   */
  constructor(
    updateFn: () => void,
    onCleanup?: () => void,
    updateInterval = 1000,
    registrationTimeout = 30000,
  ) {
    this.onCleanup = onCleanup;
    this.registrationTimeout = registrationTimeout;
    // call the update function once so we instantly trigger a first update
    // (otherwise the first update would happen after the "registrationTimeout" ms)
    updateFn();
    this.updateLoop = setInterval(updateFn, updateInterval);
  }

  registerUser(userId: string) {
    if (this.userRegistrations[userId]) {
      console.log('Refreshing user registration ', userId);
      clearTimeout(this.userRegistrations[userId]);
    } else {
      console.log('Registering user ', userId);
    }

    this.userRegistrations[userId] = setTimeout(() => {
      console.log('User registration timed out ', userId);
      this.unregisterUser(userId);
    }, this.registrationTimeout);
  }

  unregisterUser(userId: string) {
    if (this.userRegistrations[userId]) {
      clearTimeout(this.userRegistrations[userId]);
      delete this.userRegistrations[userId];
      console.log('Unregistering user ', userId);

      if (!Object.keys(this.userRegistrations).length) {
        console.log('No users left');
        clearInterval(this.updateLoop);
        this.onCleanup?.();
      }
    }
  }
}
