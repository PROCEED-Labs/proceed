// Currently only used to disable the custom behaviour
// the plane/subprocess that a change is made in will always be focused
// ex.  : another user changes something inside a subprocess that is not locally open => the subprocess is opened
// ex. 2: a subprocess is opened and another user changes something in the root process => the subprocess is closed

// TODO: this behavior seems to be intended to handle situations were an undo or redo changes a plane that is currently not open
// (might be interesting to reintroduce this when we allow undo or redo but only if the change was triggered locally)
class CustomRootElementsBehavior {}

export default {
  rootElementsBehavior: ['type', CustomRootElementsBehavior],
};
