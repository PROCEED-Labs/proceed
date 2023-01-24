/* eslint-disable class-methods-use-this */

/**
 * The abstract class which custom display item implementations can extend to
 * have their own content and behaviour added to the UI module.
 * @memberof module:@proceed/ui
 */
class DisplayItem {
  /**
   * Instantiate a new display item. Overwrite this method in a custom class to
   * provide own content and badge.
   * @param {String} title The title for this display item (displayed, human readable)
   * @param {String} key The key for this displa item (unique, not displayed)
   */
  constructor(title, key) {
    /**
     * The title for this display item. It is displayed and should be
     * human-readable. It will be shown in the navigation bar as the title of
     * the navigation item for this display item. Please use a **short**
     * (preferrably one word) description of your display item.
     * @type {String}
     */
    this.title = title;

    /**
     * The unique key for identifying this display item. This key will be used
     * as part of the path for the endpoints of this display item and thus needs
     * to be chosen carefully as it will be accessible through the API under
     * this name in case of HTTP.
     * @type {String}
     */
    this.key = key;

    // Need to escape any content:
    // \ --> \\
    // ` --> \`
    // ${} --> \${}
    /**
     * The HTML content for this display item. This string will be inserted in
     * the SPA when the user clicks on the display item's navigation element. It
     * should contain all the necessary CSS and JS inline (see the README at
     * `/modules/ui/tasklist/README.md` for further instructions on how to
     * generate this part).
     * @type {String}
     */
    this.content = '';

    /**
     * The optional badge which will be displayed above the display item's title
     * at the navigation bar.
     * @type {?String}
     */
    this.badge = '';
  }

  /**
   * Return the endpoints of this display item. Overwrite this method to specify
   * the endpoints for get and post requests for your display item.
   * @returns {module:@proceed/ui.Endpoints} The endpoints for this display item
   */
  getEndpoints() {
    return {};
  }

  // TODO: EventSource / WebSockets instead of polling for notification from the
  // PROCEED engine
  /*
  registerNotifications(notify) {
    notify();
  }
  */
}

module.exports = DisplayItem;
