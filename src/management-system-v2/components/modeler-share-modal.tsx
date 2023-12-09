import { FC, useState } from 'react';

import { Modal, Button, Tooltip, Space, Typography, Card } from 'antd';

import {
  ShareAltOutlined,
  LinkOutlined,
  ExportOutlined,
  LeftOutlined,
  RightOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import useModelerStateStore from '@/lib/use-modeler-state-store';
import { copyProcessImage } from '@/lib/process-export/copy-process-image';

type ShareModalProps = {
  onExport: () => void;
};

const ModelerShareModalButton: FC<ShareModalProps> = ({ onExport }) => {
  const [isOpen, setIsOpen] = useState(false);

  const modeler = useModelerStateStore((state) => state.modeler);

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleCopyXMLToClipboard = async () => {
    if (modeler) {
      const { xml } = await modeler.saveXML({ format: true });
      if (xml) navigator.clipboard.writeText(xml);
    }
  };

  return (
    <>
      <Modal
        title={<div style={{ textAlign: 'center' }}>Share</div>}
        open={isOpen}
        closeIcon={false}
        onCancel={handleClose}
        footer={<Button onClick={handleClose}>Close</Button>}
      >
        <Space>
          <Tooltip title="Share Public Link">
            <Button size="large" style={{ width: '124px', height: 'unset' }}>
              {/* <div> */}
              {/* <LinkOutlined style={{ fontSize: 'x-large' }} />
                <br /> */}
              <Typography.Text>Share Public Link</Typography.Text>
              {/* </div> */}
            </Button>
          </Tooltip>
          <Tooltip title="Embed in Website">
            <Button
              icon={
                <>
                  <LeftOutlined />
                  <RightOutlined />
                </>
              }
              size="large"
            />
          </Tooltip>
          <Tooltip title="Copy Diagram to Clipboard (PNG)">
            <Button
              icon={<CopyOutlined />}
              size="large"
              onClick={() => copyProcessImage(modeler)}
            />
          </Tooltip>
          <Tooltip title="Copy Diagram to Clipboard (XML)">
            <Button icon={<CopyOutlined />} size="large" onClick={handleCopyXMLToClipboard} />
          </Tooltip>
          <Tooltip title="Export as File">
            <Button icon={<ExportOutlined />} size="large" onClick={onExport} />
          </Tooltip>
        </Space>
      </Modal>
      <Tooltip title="Share">
        <Button icon={<ShareAltOutlined />} onClick={() => setIsOpen(true)} />
      </Tooltip>
    </>
  );
};

export default ModelerShareModalButton;
