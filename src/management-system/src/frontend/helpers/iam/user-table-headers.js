export default [
  {
    text: 'Account',
    align: 'start',
    sortable: false,
    filterable: true,
    value: 'name',
    width: '30%',
  },
  { text: 'Email Adress', value: 'email', filterable: true, sortable: true, width: '30%' },
  { text: 'Username', value: 'username', filterable: true, sortable: true, width: '30%' },
  { text: '', value: 'actions', filterable: false, sortable: false, align: 'end' },
];
