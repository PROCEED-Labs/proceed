import { useEditor, useNode, UserComponent, Node } from '@craftjs/core';

import { InputNumber } from 'antd';

import { useEffect, useRef, useState } from 'react';

import { fallbackImage } from '../../image-selection-section';
import { useParams } from 'next/navigation';
import { useEnvironment } from '@/components/auth-can';
import { ContextMenu, Setting } from './utils';
import ImageUpload from '@/components/image-upload';

type ImageProps = {
  src?: string;
  reloadParam?: number;
  width?: number;
};

const Image: UserComponent<ImageProps> = ({ src, reloadParam, width }) => {
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
  const { editingEnabled } = useEditor((state) => ({ editingEnabled: state.options.enabled }));

  const params = useParams<{ processId: string }>();
  const environment = useEnvironment();

  const baseUrl =
    editingEnabled && `/api/private/${environment.spaceId}/processes/${params.processId}/images`;

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
          src={src ? `${src}?${reloadParam}` : fallbackImage}
        />
        {editingEnabled && baseUrl && isHovered && (
          <ImageUpload
            imageExists={!!src}
            onReload={() => setProp((props: ImageProps) => (props.reloadParam = Date.now()))}
            onImageUpdate={(imageFileName) => {
              setProp((props: ImageProps) => {
                props.src = imageFileName && `${baseUrl}/${imageFileName}`;
                props.width = undefined;
              });
            }}
            endpoints={{
              postEndpoint: baseUrl,
              putEndpoint: src,
              deleteEndpoint: src,
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
  const { editingEnabled } = useEditor((state) => ({ editingEnabled: state.options.enabled }));

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
            disabled={!editingEnabled || !src}
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

Image.craft = {
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
  custom: {
    // clean up the uploaded image if it is not referenced anymore due to the form component being deleted
    onDelete: async (node: Node) => {
      const src = node.data.props.src as undefined | string;
      if (src) {
        await fetch(src, {
          method: 'DELETE',
        });
      }
    },
  },
};

export default Image;
