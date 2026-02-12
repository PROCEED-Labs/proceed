'use client';

import { Modal } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

type PreviewFeatureModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  contactInfo?: {
    company: string;
    name: string;
    mobile: string;
    email: string;
    website: string;
  };
};

const PreviewFeatureModal: React.FC<PreviewFeatureModalProps> = ({
  open,
  onClose,
  title,
  description,
  contactInfo = {
    company: 'PROCEED Labs GmbH',
    name: 'Kai Grunert',
    mobile: '+49 151 57425665',
    email: 'kai.grunert@proceed-labs.org',
    website: 'https://www.proceed-labs.org',
  },
}) => {
  return (
    <Modal
      open={open}
      title={
        <span>
          <InfoCircleOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          {title}
        </span>
      }
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <div style={{ padding: '20px 0' }}>
        <p style={{ marginBottom: '20px', lineHeight: '1.6' }}>
          <strong>Preview:</strong> {description}
        </p>

        <p style={{ marginBottom: '10px', fontWeight: 500 }}>
          Since the software was implemented as a prototype as part of a research project, this
          functionality has not been implemented. If you would like to add it, please contact:
        </p>

        <div
          style={{
            background: '#f5f5f5',
            padding: '16px',
            borderRadius: '4px',
            marginTop: '16px',
          }}
        >
          <p style={{ margin: '4px 0', fontWeight: 500 }}>{contactInfo.company}</p>
          <p style={{ margin: '4px 0' }}>{contactInfo.name}</p>
          <p style={{ margin: '4px 0' }}>
            <strong>Mobile:</strong> {contactInfo.mobile}
          </p>
          <p style={{ margin: '4px 0' }}>
            <strong>Mail:</strong> <a href={`mailto:${contactInfo.email}`}>{contactInfo.email}</a>
          </p>
          <p style={{ margin: '4px 0' }}>
            <a href={contactInfo.website} target="_blank" rel="noopener noreferrer">
              {contactInfo.website}
            </a>
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default PreviewFeatureModal;
