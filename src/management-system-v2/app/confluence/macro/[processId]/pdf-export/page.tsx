import {
  getAttachmentProcessBase64Image,
  getAttachmentProcessBpmn,
} from '@/app/confluence/helpers';
import { getDefinitionsName, getProcessDocumentation } from '@proceed/bpmn-helper';

const Page = async ({ params: { processId } }: { params: { processId: string } }) => {
  const base64 = await getAttachmentProcessBase64Image('14712843', processId);
  const bpmn = await getAttachmentProcessBpmn('14712843', processId);
  const documentation = await getProcessDocumentation(bpmn);
  const definitionsName = await getDefinitionsName(bpmn);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '400px',
        border: '1px solid #f0f0f0',
        borderRadius: '0.5rem',
      }}
    >
      <div
        style={{
          padding: '0.75rem',
          borderBottom: '1px solid #f0f0f0',
          backgroundColor: '#f0f0f0',
          alignItems: 'center',
        }}
      >
        <img style={{ width: '3rem', marginRight: '0.75rem' }} src="/proceed-icon.png"></img>
        <span style={{ fontWeight: 'bold' }}>{definitionsName}</span>
      </div>
      <div style={{ flexGrow: 1 }}>
        <img src={`data:image/png;base64, ${base64}`}></img>
      </div>
      <div
        style={{ padding: '0.75rem', borderTop: '1px solid #f0f0f0', backgroundColor: '#f0f0f0' }}
      >
        <span style={{ fontWeight: 'bold' }}>Description:</span> <span> {documentation}</span>
      </div>
    </div>
  );
};

export default Page;
