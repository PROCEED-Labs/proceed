import { ProcessComponent } from '../../[processId]/page';

const ListPage = async (props: any) => {
  return <ProcessComponent {...props} isListView={true} />;
};

export default ListPage;
