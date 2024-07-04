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

  const baseUrl = process.env.NEXTAUTH_URL ?? '';
  return (
    <div
      style={{
        border: '1px solid #f0f0f0',
        borderRadius: '8px',
      }}
    >
      <div
        style={{
          padding: '10px',
          borderBottom: '1px solid #f0f0f0',
          backgroundColor: '#f0f0f0',
          alignItems: 'center',
        }}
      >
        <img
          style={{ width: '42px', marginRight: '10px' }}
          src={`${baseUrl}/proceed-icon.png`}
        ></img>
        <span style={{ fontWeight: 'bold' }}>{definitionsName}</span>
      </div>
      <div style={{ padding: '20px', display: 'flex', justifyContent: 'center' }}>
        <img src={`data:image/png;base64, ${base64}`}></img>
      </div>
      <div
        style={{
          padding: '10px',
          borderTop: '1px solid #f0f0f0',
          backgroundColor: '#f0f0f0',
        }}
      >
        <span style={{ fontWeight: 'bold' }}>Description:</span> <span> {documentation}</span>
      </div>
    </div>
  );
};

export default Page;
