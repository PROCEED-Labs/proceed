const Page = ({ params: { processId } }: { params: { processId: string } }) => {
  return <span>PDF-EXPORT for {processId}</span>;
};

export default Page;
