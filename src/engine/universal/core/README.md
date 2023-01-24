## Important

### Passing variables from scripttask to the html of a usertask

The defining user must always call the `next` method in a scripttask. This
method completes the task and will take the scripts output variables, i.e.
`next(null, {key: value}`. These variables will be passed along to the next
processes in the chain. So in case a variable should be rendered into the HTML
of a following user task, the user has to make sure, that the `key` used in
scripttask matches the placeholder inside the HTML-template, i.e. `<img id="img1" src="{key}" />`.

### Passing variables from a usertask to the next task

As soon as a usertask is completed (by submitting the corresponding HTML-form),
the form data will be passed to the process-engine and its parameters. For
following processes and tasks, this data will be available under its name from
the HTML form. For example if you declare `<input type="checkbox" name="approved" value="Approved" >Approved</input>` then this value can be
accessed by `this.variables.approved` in scripttasks or exclusive gateways. Or
again in another user task.

### Overwriting variables

The user is responsible to make sure each variable name he uses in his task,
form and variable definitions is unique for the whole process. If that is not
the case the value of the process variable might be overwritten and the correct
behaviour of the process execution can no longer be sustained.
