// Inspired by https://github.com/facebook/react/blob/main/packages/shared/ReactFeatureFlags.js

module.exports = {
  // -----------------------------------------------------------------------------
  // Land or remove (zero effort)
  //
  // Flags that can likely be deleted or landed without consequences
  // -----------------------------------------------------------------------------

  enableComponentStackLocations: true,

  // -----------------------------------------------------------------------------
  // Land or remove (moderate effort)
  //
  // Flags that can be probably deleted or landed, but might require extra effort
  // like migrating internal callers or performance testing.
  // -----------------------------------------------------------------------------

  // -----------------------------------------------------------------------------
  // Slated for removal in the future (significant effort)
  //
  // These are experiments that didn't work out, and never shipped, but we can't
  // delete from the codebase until we migrate internal callers.
  // -----------------------------------------------------------------------------

  // -----------------------------------------------------------------------------
  // Ongoing experiments
  //
  // These are features that we're either actively exploring or are reasonably
  // likely to include in an upcoming release.
  // -----------------------------------------------------------------------------

  // Features needed for the recovery of instances that were interrupted unexpectedly (e.g. when the engine crashes and is restarted)
  enableInterruptedInstanceRecovery: false,

  // Features needed to send data to messaging servers (currently only using mqtt)
  enableMessaging: true,

  // Features that provide functionality supporting 5thIndustry use cases
  enable5thIndustryIntegration: false,

  // Execution view in the new MS web app
  enableNewMSExecution: false,

  // Whether the Chatbot UserInterface and its functionality should be enabled
  enableChatbot: false,

  //feature to switch to prisma from fs
  enableUseDB: false,
  enableUseFileManager: false,

  // -----------------------------------------------------------------------------
  // Chopping Block
  //
  // Planned feature deprecations and breaking changes. Sorted roughly in order of
  // when we plan to enable them.
  // -----------------------------------------------------------------------------
};
