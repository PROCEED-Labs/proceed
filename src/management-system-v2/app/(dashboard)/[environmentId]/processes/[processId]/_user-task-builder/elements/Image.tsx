import { useEditor, useNode, UserComponent } from '@craftjs/core';

import { InputNumber } from 'antd';

import { useEffect, useRef, useState } from 'react';

import { fallbackImage } from '../../image-selection-section';
import { useParams } from 'next/navigation';
import { ContextMenu, Setting } from './utils';
import ImageUpload from '@/components/image-upload';
import { EntityType } from '@/lib/helpers/fileManagerHelpers';
import { useFileManager } from '@/lib/useFileManager';
import { useCanEdit } from '../../modeler';

type ImageProps = {
  src?: string;
  reloadParam?: number;
  width?: number;
};

// How the image should be rendered for use outside of the MS (mainly for use on the engine)
export const ExportImage: UserComponent<ImageProps> = ({ src, width }) => {
  if (src) {
    // transform the url used inside the MS into the one expected on the engine
    // cannot use useParams and useEnvironment since this will not be used inside the context in
    // which they are defined
    const msUrl = src.split('/');
    const filename = msUrl.pop();
    msUrl.pop();
    const definitionId = msUrl.pop();

    src = `/resources/process/${definitionId}/images/${filename}`;
  }

  return (
    <div className="user-task-form-image">
      <img style={{ width: width && `${width}%` }} src={src ? `${src}` : fallbackImage} />
    </div>
  );
};

// the Image component to use in the Editor
export const EditImage: UserComponent<ImageProps> = ({ src, width }) => {
  const { query } = useEditor();

  const [showResize, setShowResize] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const imageRef = useRef<HTMLImageElement>(null);

  const {
    connectors: { connect },
    actions: { setProp },
    isHovered,
  } = useNode((state) => {
    const parent = state.data.parent && query.node(state.data.parent).get();

    return { isHovered: !!parent && parent.events.hovered };
  });

  const editingEnabled = useCanEdit();

  const { fileUrl: imageUrl, download: getImageUrl } = useFileManager({
    entityType: EntityType.PROCESS,
  });

  const params = useParams<{ processId: string }>();

  useEffect(() => {
    if (src) {
      getImageUrl({ entityId: params.processId as string, fileName: src });
    }
  }, [src]);

  return (
    <ContextMenu menu={[]}>
      <div
        className="user-task-form-image"
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
      >
        <img
          ref={imageRef}
          style={{ width: width && `${width}%` }}
          src={src ? imageUrl! : fallbackImage}
        />
        {editingEnabled && isHovered && (
          <ImageUpload
            imageExists={!!src}
            onReload={() => {
              setProp((props: ImageProps) => (props.reloadParam = Date.now()));
            }}
            onImageUpdate={(imageFileName) => {
              setProp((props: ImageProps) => {
                props.src = imageFileName && imageFileName;
                props.width = undefined;
              });
            }}
            config={{
              entityType: EntityType.PROCESS,
              entityId: params.processId,
              useDefaultRemoveFunction: false,
              fileName: src,
            }}
          />
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
    src: node.data.props.src,
    width: node.data.props.width,
    dom: node.dom,
  }));

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

  return (
    <>
      <Setting
        label="Width"
        control={
          <InputNumber
            disabled={!src}
            value={currentWidth}
            min={1}
            max={100}
            addonAfter="%"
            onChange={(newWidth) => {
              if (newWidth) {
                setProp((props: ImageProps) => (props.width = newWidth));
              }
              setCurrentWidth(newWidth);
            }}
          />
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
