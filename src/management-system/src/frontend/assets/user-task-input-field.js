export const traits = [
  // Strings are automatically converted to text types
  'name',
  'placeholder',
  'value',
  {
    type: 'select', // Type of the trait
    label: 'Type', // The label you will see in Settings
    name: 'type', // The name of the attribute/property to use on component
    options: [
      { id: 'text', name: 'Text' },
      { id: 'email', name: 'Email' },
      { id: 'password', name: 'Password' },
      { id: 'number', name: 'Number' },
    ],
  },
  {
    type: 'checkbox',
    name: 'required',
  },
  {
    type: 'number',
    name: 'minlength',
    label: 'Minlength',
  },
  {
    type: 'number',
    name: 'maxlength',
    label: 'Maxlength',
  },
  {
    type: 'number',
    name: 'min',
    label: 'Min',
  },
  {
    type: 'number',
    name: 'max',
    label: 'Max',
  },
  {
    type: 'checkbox',
    name: 'disabled',
  },
  {
    type: 'checkbox',
    name: 'readonly',
  },
  {
    type: 'checkbox',
    name: 'autofocus',
  },
  {
    type: 'checkbox',
    name: 'autocomplete',
  },
];
