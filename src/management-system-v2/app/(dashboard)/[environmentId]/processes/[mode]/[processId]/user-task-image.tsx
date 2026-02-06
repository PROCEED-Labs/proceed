import { useEditor, useNode, UserComponent } from '@craftjs/core';

import { Button, Input, InputNumber, Select, Space, Typography, Upload } from 'antd';

import { useEffect, useRef, useState } from 'react';

import { useParams } from 'next/navigation';
import {
  ContextMenu,
  Setting,
  VariableSelection,
} from '@/components/html-form-editor/elements/utils';
import { fallbackImage, useImageUpload } from '@/components/image-upload';
import { EntityType } from '@/lib/helpers/fileManagerHelpers';
import { useFileManager } from '@/lib/useFileManager';
import useEditorStateStore from '@/components/html-form-editor/use-editor-state-store';

import { tokenize } from '@proceed/user-task-helper/src/tokenize';

type ImageProps = {
  src?: string;
  reloadParam?: number;
  width?: number;
  definitionId?: string;
};

// How the image should be rendered for use outside of the MS (mainly for use on the engine)
export const ExportImage: UserComponent<ImageProps> = ({ src, width, definitionId }) => {
  if (src && src.startsWith('processes-artifacts/images')) {
    // transform the url used inside the MS into the one expected on the engine
    // cannot use useParams and useEnvironment since this will not be used inside the context in
    // which they are defined
    const msUrl = src.split('/');
    const filename = msUrl.pop();

    src = `/resources/process/${definitionId}/images/${filename}`;
  }

  return (
    <div className="user-task-form-image">
      <img style={{ width: width && `${width}%` }} src={src || fallbackImage} />
    </div>
  );
};

// the Image component to use in the Editor
export const EditImage: UserComponent<ImageProps> = ({ src, width, definitionId }) => {
  const { query } = useEditor();

  const [showResize, setShowResize] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const imageRef = useRef<HTMLImageElement>(null);

  const [showOverlay, setShowOverlay] = useState(false);

  const {
    connectors: { connect },
    actions: { setProp },
  } = useNode((state) => {
    const parent = state.data.parent && query.node(state.data.parent).get();

    return { isHovered: !!parent && parent.events.hovered };
  });

  const { processId } = useParams<{ processId: string }>();

  useEffect(() => {
    // initialize the definitionId prop that is needed to map the image url on export
    if (!definitionId) setProp((props: ImageProps) => (props.definitionId = processId));
  }, []);

  const editingEnabled = useEditorStateStore((state) => state.editingEnabled);

  const { download: getImageUrl } = useFileManager({
    entityType: EntityType.PROCESS,
  });

  const [imageUrl, setImageUrl] = useState('');

  const { customUploadRequest, remove } = useImageUpload({
    onImageUpdate: (imageFileName) => {
      setProp((props: ImageProps) => (props.src = imageFileName));
    },
    fileName: src?.startsWith('processes-artifacts') ? src : undefined,
    config: {
      entityType: EntityType.PROCESS,
      entityId: processId,
      dontUpdateProcessArtifactsReferences: true,
    },
  });

  useEffect(() => {
    if (src) {
      if ((src as string).startsWith('processes-artifacts')) {
        getImageUrl({ entityId: processId as string, filePath: src }).then((url) =>
          setImageUrl(url.fileUrl || ''),
        );
      } else if (src.startsWith('{')) {
        setImageUrl('');
      } else {
        setImageUrl(src);
      }
    }

    return () => setImageUrl('');
  }, [src]);

  return (
    <ContextMenu menu={[]}>
      <div
        className="user-task-form-image"
        style={{ position: 'relative' }}
        ref={(r) => {
          r && connect(r);
        }}
        onMouseMove={(e) => {
          if (!editingEnabled) return;
          const resizeBorder = e.currentTarget.getBoundingClientRect().bottom - 4;
          if (src && e.clientY > resizeBorder && !showResize) {
            setShowResize(true);
          }
        }}
        onMouseOver={() => editingEnabled && setShowOverlay(true)}
        onMouseOut={() => editingEnabled && setShowOverlay(false)}
      >
        <img
          ref={imageRef}
          style={{ width: width && `${width}%` }}
          src={imageUrl || fallbackImage}
        />
        {showOverlay && editingEnabled && (
          <div
            style={{
              backdropFilter: 'blur(4px)',
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              width: width && `${width}%`,
            }}
          >
            <Upload
              accept={'.jpeg,.jpg,.png,.webp,.svg'}
              showUploadList={false}
              customRequest={customUploadRequest}
            >
              <Button>
                {src?.startsWith('processes-artifacts') ? 'Change Image' : 'Upload Image'}
              </Button>
            </Upload>
            {src?.startsWith('processes-artifacts') && (
              <Button
                style={{ marginLeft: '10px' }}
                onClick={async () => {
                  await remove({ entityId: processId, filePath: src });
                  setProp((props: ImageProps) => (props.src = ''));
                }}
              >
                Remove Image
              </Button>
            )}
          </div>
        )}
        {/* Allows resizing  */}
        {/* TODO: maybe use some react library for this */}
        {showResize && (
          <div
            style={{
              width: '100%',
              height: '8px',
              bottom: -4,
              cursor: 'ns-resize',
              opacity: 0,
            }}
            onMouseLeave={() => {
              if (!isResizing) {
                setShowResize(false);
              }
            }}
            onMouseDownCapture={(e) => {
              e.stopPropagation();
              e.preventDefault();

              setIsResizing(true);

              const handleMove = (e: MouseEvent) => {
                if (imageRef.current && imageRef.current.parentElement) {
                  const posY = e.clientY;
                  const { width: imageContainerWidth } =
                    imageRef.current.parentElement.getBoundingClientRect();
                  const {
                    top: imageTop,
                    bottom: imageBottom,
                    height: imageHeight,
                    width: imageWidth,
                  } = imageRef.current.getBoundingClientRect();

                  if (
                    posY <= imageTop ||
                    (posY > imageBottom && imageContainerWidth === imageWidth)
                  )
                    return;

                  const newHeigth = imageHeight + (posY - imageBottom);
                  const aspect = imageWidth / imageHeight;
                  const newWidth = Math.min(aspect * newHeigth, imageContainerWidth);
                  const newPercent = (100 * newWidth) / imageContainerWidth;
                  if (newPercent !== width)
                    setProp((props: ImageProps) => (props.width = newPercent));
                }
              };

              const { body } = e.currentTarget.ownerDocument;

              const handleEnd = () => {
                body.removeEventListener('mousemove', handleMove);
                body.removeEventListener('mouseup', handleEnd);
                body.removeEventListener('mouseleave', handleEnd);
                setShowResize(false);
                setIsResizing(false);
                // setCanDrag(true);
              };

              body.addEventListener('mousemove', handleMove);
              body.addEventListener('mouseup', handleEnd);
              body.addEventListener('mouseleave', handleEnd);
            }}
          ></div>
        )}
      </div>
    </ContextMenu>
  );
};

export const ImageSettings = () => {
  const {
    actions: { setProp },
    src,
    width,
    dom,
  } = useNode((node) => ({
    src: node.data.props.src as string,
    width: node.data.props.width,
    dom: node.dom,
  }));

  const editingEnabled = useEditorStateStore((state) => state.editingEnabled);

  const [currentWidth, setCurrentWidth] = useState<number | null>(null);

  useEffect(() => {
    if (src && dom?.children[0]) {
      function updateWidth(containerDom: Element, imageDom: Element) {
        const imageContainerWidth = containerDom.getBoundingClientRect().width;
        const imageWidth = imageDom.getBoundingClientRect().width;
        const percent = Math.floor(100 * (imageWidth / imageContainerWidth));
        if (!width || percent > width) setCurrentWidth(percent);
        else if (width !== currentWidth) setCurrentWidth(Math.floor(width));
      }

      const imageDom = dom.children[0] as HTMLImageElement;
      if (imageDom.complete) updateWidth(dom, imageDom);

      const onLoad = () => updateWidth(dom, imageDom);
      imageDom.addEventListener('load', onLoad);
      return () => imageDom.removeEventListener('load', onLoad);
    }
  }, [dom, width]);

  const { processId } = useParams<{ processId: string }>();

  const [sourceType, setSourceType] = useState<'file' | 'url' | 'variable'>('file');
  const [onlineImageUrl, setOnlineImageUrl] = useState('');

  useEffect(() => {
    if (src) {
      if (src.startsWith('processes-artifacts')) {
        setSourceType('file');
      } else if (src.startsWith('{')) {
        setSourceType('variable');
      } else {
        setOnlineImageUrl(src);
        setSourceType('url');
        return () => setOnlineImageUrl('');
      }
    }
  }, [src]);

  let variableName: string | undefined;
  if (src) {
    const tokens = tokenize(src);
    if (tokens.length === 1 && tokens[0].type === 'variable') {
      variableName = tokens[0].variableName;
    }
  }

  const { customUploadRequest } = useImageUpload({
    onImageUpdate: (imageFileName) => {
      setProp((props: ImageProps) => (props.src = imageFileName));
    },
    fileName: sourceType === 'file' ? src : undefined,
    config: {
      entityType: EntityType.PROCESS,
      entityId: processId,
      dontUpdateProcessArtifactsReferences: true,
    },
  });

  const sourceInput = {
    file: (
      <Upload
        accept={'.jpeg,.jpg,.png,.webp,.svg'}
        showUploadList={false}
        disabled={!editingEnabled}
        customRequest={customUploadRequest}
      >
        <Button disabled={!editingEnabled}>
          {src?.startsWith('processes-artifacts') ? 'Change Image' : 'Upload Image'}
        </Button>
      </Upload>
    ),
    url: (
      <Input
        value={onlineImageUrl}
        disabled={!editingEnabled}
        onChange={(e) => setOnlineImageUrl(e.target.value)}
        onBlur={() => setProp((props: ImageProps) => (props.src = onlineImageUrl))}
      />
    ),
    variable: (
      <VariableSelection
        style={{ flex: '1 0 0' }}
        variable={variableName || ''}
        allowedTypes={['string', 'file']}
        onChange={(newVarName) => setProp((props: ImageProps) => (props.src = `{%${newVarName}%}`))}
      />
    ),
  };

  const widthEditingDisabled = !src || !editingEnabled;

  return (
    <>
      <Setting
        label="Width"
        control={
          <Space.Compact style={{ display: 'flex' }}>
            <InputNumber
              disabled={widthEditingDisabled}
              value={currentWidth}
              style={{ flex: 1 }}
              min={1}
              max={100}
              onChange={(newWidth) => {
                if (newWidth) {
                  setProp((props: ImageProps) => (props.width = newWidth));
                }
                setCurrentWidth(newWidth);
              }}
            />
            <Space.Addon>
              <Typography.Text disabled={widthEditingDisabled}>%</Typography.Text>
            </Space.Addon>
          </Space.Compact>
        }
      />
      <Setting
        label="Source"
        control={
          <Space.Compact style={{ display: 'flex' }}>
            <Select
              popupMatchSelectWidth={false}
              options={[
                { value: 'file', label: 'File' },
                { value: 'url', label: 'URL' },
                { value: 'variable', label: 'Variable' },
              ]}
              value={sourceType}
              disabled={!editingEnabled}
              onChange={(newValue) => setSourceType(newValue)}
            />
            {sourceInput[sourceType]}
          </Space.Compact>
        }
      />
    </>
  );
};

// clean up the uploaded image if it is not referenced anymore due to the form component being deleted
// is handled by onNodesChange in index.tsx file
EditImage.craft = {
  rules: {
    canDrag: () => false,
  },
  related: {
    settings: ImageSettings,
  },
  props: {
    src: undefined,
    reloadParam: 0,
    width: undefined,
  },
};
