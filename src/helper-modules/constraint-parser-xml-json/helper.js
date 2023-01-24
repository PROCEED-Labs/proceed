module.exports = {
  getTaskConstraints(element, taskId) {
    let constraints;

    const children = Object.entries(element).reduce((currChildren, [key, value]) => {
      const newChildren = [...currChildren];

      if (key !== '_attributes' && key !== 'extensionElements') {
        if (!Array.isArray(value)) {
          newChildren.push(value);
        } else {
          value.forEach((groupedChild) => {
            newChildren.push(groupedChild);
          });
        }
      }

      return newChildren;
    }, []);

    const task = children.find((child) => child._attributes && child._attributes.id === taskId);

    if (task && task.extensionElements && task.extensionElements.processConstraints) {
      constraints = task.extensionElements.processConstraints;
    }

    return constraints;
  },
};
