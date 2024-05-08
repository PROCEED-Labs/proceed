'use client';

import { Space, Button, Input } from 'antd';
import {
  MinusOutlined,
  PlusOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
} from '@ant-design/icons';
import styles from './modeler-zoombar.module.scss';
import { useEffect, useState } from 'react';
import useModelerStateStore from './use-modeler-state-store';

type ModelerZoombarProps = {};

const ModelerZoombar = ({}: ModelerZoombarProps) => {
  const modeler = useModelerStateStore((state) => state.modeler);
  const zoomLevel = useModelerStateStore((state) => state.zoomLevel);

  const [inputValue, setInputValue] = useState(zoomLevel * 100);
  const [isEditing, setIsEditing] = useState(false);

  const setFullScreen = useModelerStateStore((state) => state.setFullScreen);
  const isFullScreen = useModelerStateStore((state) => state.isFullScreen);

  useEffect(() => {
    setInputValue(zoomLevel * 100);
  }, [zoomLevel]);

  const changeZoomLevel = (zoomLevel: number) => {
    const canvas = modeler!.getCanvas();
    // Zoom level should be between 20 and 400
    if (zoomLevel < 20) {
      setInputValue(20);
      canvas.zoom(0.2);
    } else if (zoomLevel > 400) {
      setInputValue(400);
      canvas.zoom(4);
    } else {
      canvas.zoom(zoomLevel / 100);
    }
  };

  return (
    <div
      className={styles.Zoombar}
      style={{
        position: 'absolute',
        zIndex: 10,
        padding: '12px',
        bottom: '0px',
      }}
    >
      <Space>
        <Button
          size="large"
          icon={
            isFullScreen ? (
              <FullscreenExitOutlined style={{ fontSize: '0.875rem' }}></FullscreenExitOutlined>
            ) : (
              <FullscreenOutlined style={{ fontSize: '0.875rem' }}></FullscreenOutlined>
            )
          }
          style={{ border: 'none', backgroundColor: '#eeeeee' }}
          onClick={() => {
            setFullScreen(!isFullScreen);
          }}
        ></Button>
        <Space.Compact block>
          <Button
            size="large"
            icon={<MinusOutlined style={{ fontSize: '0.875rem' }} />}
            onClick={() => {
              const newValue =
                inputValue % 25 === 0
                  ? (inputValue / 25 - 1) * 25
                  : Math.floor(inputValue / 25) * 25;
              changeZoomLevel(newValue);
            }}
          ></Button>
          <Input
            size="large"
            onBlur={() => {
              setIsEditing(false);
              changeZoomLevel(inputValue);
            }}
            onFocus={() => {
              setIsEditing(true);
            }}
            onChange={(val) => {
              const newValue = parseInt(val.target.value) || 0;
              setInputValue(newValue);
            }}
            value={isEditing ? inputValue : `${inputValue}%`}
          ></Input>
          <Button
            size="large"
            onClick={() => {
              const newValue = (Math.floor(inputValue / 25) + 1) * 25;
              changeZoomLevel(newValue);
            }}
            icon={<PlusOutlined style={{ fontSize: '0.875rem' }} />}
          ></Button>
        </Space.Compact>
      </Space>
    </div>
  );
};

export default ModelerZoombar;
