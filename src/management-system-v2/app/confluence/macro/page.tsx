'use client';
import Macro from './macro';

const MacroPage = ({ params }: { params: { processId: string } }) => {
  const processId = params.processId;
  console.log('params', params);

  return (
    <>
      <Macro processId={processId}></Macro>
    </>
  );
};

export default MacroPage;
