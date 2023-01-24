export default [
  {
    value: 'favorite',
    text: '',
    align: 'center',
    filterable: false,
    sortable: false,
  },
  {
    value: 'name',
    text: 'Name',
    align: 'left',
    filterable: true,
    sortable: true,
  },
  {
    value: 'scheduleStatus',
    text: 'Schedule Status',
    align: 'left',
    filterable: true,
    sortable: true,
    isProject: true,
  },
  {
    value: 'planningStatus',
    text: 'Planning Status',
    align: 'left',
    filterable: true,
    sortable: true,
    isProject: true,
  },
  {
    value: 'plannedEndDate',
    text: 'Planned End Date',
    align: 'left',
    filterable: true,
    sortable: true,
    isProject: true,
  },
  {
    value: 'creator',
    text: 'Creator',
    align: 'left',
    filterable: true,
    sortable: true,
  },
  {
    value: 'lastEdited',
    text: 'Last Edited',
    align: 'left',
    filterable: false,
    sortable: true,
  },
  {
    value: 'createdOn',
    text: 'Created on',
    align: 'left',
    filterable: false,
    sortable: true,
  },
  {
    value: 'activeUsers',
    text: 'Active User',
    align: 'right',
    filterable: false,
    sortable: false,
  },
  {
    value: 'lastModifiedBy',
    text: 'Last Modified By',
    align: 'left',
    filterable: false,
    sortable: false,
  },
  {
    value: 'departments',
    text: 'Departments',
    align: 'left',
    // filter is not working with the current vuetify version
    filterable: false,
    filter: (value, search, item) => {
      // no search term provided
      if (!search) return true;
      // departments isn't an array => undefined/null
      if (!Array.isArray(value)) return false;

      const lowerCaseSearch = search.toLowerCase();
      return value.some((department) => {
        return department.name && department.name.toLowerCase().includes(lowerCaseSearch);
      });
    },
    sortable: false,
  },
  { text: '', value: 'actions', sortable: false, align: 'right' },
  {
    value: 'data-table-expand',
    text: '',
    align: 'center',
    filterable: false,
    sortable: false,
  },
];
