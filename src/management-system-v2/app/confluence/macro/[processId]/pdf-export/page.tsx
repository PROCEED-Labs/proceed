import {
  getAttachmentProcessBase64Image,
  getAttachmentProcessBpmn,
} from '@/app/confluence/helpers';
import { getDefinitionsName, getProcessDocumentation } from '@proceed/bpmn-helper';

const Page = async ({
  params: { processId },
  searchParams,
}: {
  params: { processId: string };
  searchParams: { contentId: string };
}) => {
  const contentId = searchParams.contentId;
  const base64 = await getAttachmentProcessBase64Image(contentId, processId);
  const bpmn = await getAttachmentProcessBpmn(contentId, processId);
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
      <div style={{ padding: '20px' }}>
        <img
          src={`data:image/png;base64, ${base64}`}
          style={{ display: 'block', margin: 'auto', width: 'auto' }}
        ></img>
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
