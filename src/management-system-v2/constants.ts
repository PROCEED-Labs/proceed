/**
 * Constants for the Management System to be used in the frontend and backend.
 *
 * Unlike environment variables and database settings, these constants are not
 * meant to be changed between deployments or during runtime by the user. They
 * can be used to seed the database with initial values, or to provide universal
 * default values for the application.
 */

/** Cookie expiration */
export const DEFAULT_COOKIE_EXPIRATION = 60 * 60 * 24 * 365; // 365 days
