import { useUserPreferences } from '@/lib/user-preferences';
import style from './competences-viewer.module.scss';
import {
  Button,
  Card,
  Descriptions,
  DescriptionsProps,
  Input,
  List,
  message,
  Space,
  Switch,
  Typography,
} from 'antd';
import { CheckOutlined, CloseOutlined, EditOutlined, SaveOutlined } from '@ant-design/icons';
import { FC, ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ResizableBox } from 'react-resizable';
import { SpaceCompetence } from '@/lib/data/competence-schema';
import { useRouter } from 'next/navigation';
import { updateSpaceCompetence } from '@/lib/data/competences';
import { wrapServerCall } from '@/lib/wrap-server-call';

type CompetencesViewerProps = React.PropsWithChildren<{
  selectedCompetence: SpaceCompetence | null;
  environmentId: string;
}>;

const CompetencesViewer: FC<CompetencesViewerProps> = ({
  children,
  selectedCompetence,
  environmentId,
}) => {
  console.log('CompetencesViewer', selectedCompetence);
  const router = useRouter();
  const [containerHeight, setContainerHeight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const [descriptionIsEdited, setDescriptionIsEdited] = useState(false);
  const [attributesAreEdited, setAttributesAreEdited] = useState(false);

  const [name, setName] = useState<string>(selectedCompetence?.name || '');
  const [description, setDescription] = useState<string>(selectedCompetence?.description || '');
  const [externalQualificationNeeded, setExternalQualificationNeeded] = useState<boolean>(
    selectedCompetence?.externalQualificationNeeded || false,
  );
  const [renewalTimeInterval, setRenewalTimeInterval] = useState<number | undefined>(
    selectedCompetence?.renewalTimeInterval || undefined,
  );

  /* Card width - Updates card (content) width - if necessary */
  const [cardWidth, setCardWidth] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!cardRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const w = entry.contentRect.width;
        setCardWidth((prev) => (prev === w ? prev : w - 80));
      }
    });

    observer.observe(cardRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  useLayoutEffect(() => {
    if (!window) return;

    const handleResize = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [containerRef]);

  const addPreferences = useUserPreferences.use.addPreferences();
  const { upperCardHeight: height } = useUserPreferences.use['competences-viewer']();
  const preferencesHydrated = useUserPreferences.use._hydrated();

  const maxHeight = Math.round(containerHeight * 0.7),
    minHeight = Math.round(containerHeight * 0.3),
    intitalHeight = Math.round(containerHeight * 0.5);

  const setHeight = (newHeight: number) => {
    if (!preferencesHydrated) return;
    addPreferences({
      'competences-viewer': {
        upperCardHeight: Math.max(Math.min(newHeight, maxHeight), minHeight),
      },
    });
  };
  const oldContainerHeight = useRef(containerHeight);

  /* Handle updates of container height */
  useEffect(() => {
    /* Set new height */
    if (oldContainerHeight.current === 0) {
      oldContainerHeight.current = containerHeight;
      /* Check whther Preferences yield any value */
      if (preferencesHydrated && Number.isNaN(height)) setHeight(intitalHeight);
      return;
    }
    /* Other resize: */
    /* Get old height in % */
    const ratio = height / oldContainerHeight.current;
    /* Set old height to new height */
    oldContainerHeight.current = containerHeight;
    setHeight(Math.round(containerHeight * ratio));
  }, [containerHeight]);

  /* Reset when selection changes */
  useEffect(() => {
    if (!selectedCompetence) return;
    /* Values */
    setName(selectedCompetence.name);
    setDescription(selectedCompetence.description);
    setExternalQualificationNeeded(selectedCompetence.externalQualificationNeeded || false);
    setRenewalTimeInterval(selectedCompetence.renewalTimeInterval || undefined);

    /* Edits */
    setDescriptionIsEdited(false);
    setAttributesAreEdited(false);
  }, [selectedCompetence]);

  const resetState = () => {
    // setDescriptionIsEdited(false);
    // setAttributesAreEdited(false);
    setName(selectedCompetence?.name || '');
    setDescription(selectedCompetence?.description || '');
    setExternalQualificationNeeded(selectedCompetence?.externalQualificationNeeded || false);
    setRenewalTimeInterval(selectedCompetence?.renewalTimeInterval || undefined);
  };

  const updateCmpetence = async () => {
    if (!selectedCompetence) return;

    await wrapServerCall({
      fn: async () => {
        await updateSpaceCompetence(environmentId, selectedCompetence.id, {
          name,
          description,
          externalQualificationNeeded,
          renewalTimeInterval,
        });
      },
      onSuccess: () => {
        setDescriptionIsEdited(false);
        router.refresh();
        message.success('Competence updated successfully');
      },
      onError: (err) => {
        message.error('Error updating competence');
        resetState();
        console.error('Error updating competence', err);
      },
    });
  };

  const attributeListData = [
    {
      title: 'Name',
      value: name,
      isEdited: attributesAreEdited,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value),
      render: (value: string) => <span>{name}</span>,
      editRender: (value: string) => (
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ width: '100%', textAlign: 'left' }}
        />
      ),
    },
    {
      title: 'Additional Qualification Needed',
      value: externalQualificationNeeded ? 'Yes' : 'No',
      isEdited: attributesAreEdited,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setExternalQualificationNeeded(e.target.checked),
      render: (value: boolean) => <span>{value}</span>,
      editRender: (value: boolean) => (
        <>
          <span style={{ flex: 'auto' }}>{externalQualificationNeeded ? 'Yes' : 'No'}</span>
          <Switch
            checkedChildren={<CheckOutlined />}
            unCheckedChildren={<CloseOutlined />}
            checked={externalQualificationNeeded}
            onChange={(checked) => setExternalQualificationNeeded(checked)}
          />
        </>
      ),
    },
    {
      title: 'Renewal Time Interval',
      value: renewalTimeInterval ? `${renewalTimeInterval} days` : 'Not set',
      isEdited: attributesAreEdited,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setRenewalTimeInterval(Number(e.target.value)),
      render: (value: ReactNode) => <span>{value}</span>,
      editRender: (value: ReactNode) => (
        <>
          <span style={{ flex: 'auto' }}></span>

          <div>TEST</div>
        </>
      ),
    },
  ];

  return (
    <>
      <div className={style.container} ref={containerRef}>
        <ResizableBox
          style={{ display: 'flex', gap: '1rem', flexDirection: 'column', width: '100%' }}
          // className={styles.resizable}
          height={height}
          axis="y"
          resizeHandles={['s']}
          minConstraints={[0, minHeight]}
          maxConstraints={[0, maxHeight]}
          onResizeStop={(_, { size }) => setHeight(size.height)}
          handle={
            <div className={style.outerHandle}>
              <div className={style.innerHandle} />
            </div>
          }
        >
          <Card
            className={style.card}
            title={'Description'}
            extra={
              selectedCompetence &&
              (!descriptionIsEdited ? (
                <Button
                  style={{ border: 'none' }}
                  icon={<EditOutlined />}
                  onClick={() => {
                    setDescriptionIsEdited(true);
                  }}
                ></Button>
              ) : (
                <Button
                  style={{ border: 'none' }}
                  type="primary"
                  onClick={() => {
                    setDescriptionIsEdited(false);
                    updateCmpetence();
                    router.refresh();
                  }}
                  icon={<SaveOutlined />}
                ></Button>
              ))
            }
          >
            {selectedCompetence ? (
              <div style={{ width: '100%', overflowY: 'scroll', maxHeight: height - 130 }}>
                {descriptionIsEdited ? (
                  <Input.TextArea
                    style={{ width: '100%' }}
                    rows={6}
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                    }}
                  />
                ) : (
                  <Typography.Paragraph
                    style={{ width: cardWidth }}
                    ellipsis={{ rows: 8, expandable: true, symbol: 'more' }}
                  >
                    {description.split('\n').map((text, index) => {
                      if (index === 0) return text;
                      return (
                        <span key={index}>
                          <br />
                          {text}
                        </span>
                      );
                    }) || ''}
                  </Typography.Paragraph>
                )}
              </div>
            ) : (
              <Typography.Paragraph style={{ width: cardWidth }}>
                No competence selected.
              </Typography.Paragraph>
            )}
          </Card>
        </ResizableBox>
        <Card
          ref={cardRef}
          className={style.card}
          title={'Atrributes'}
          extra={
            selectedCompetence &&
            (!attributesAreEdited ? (
              <Button
                style={{ border: 'none' }}
                icon={<EditOutlined />}
                onClick={() => {
                  setAttributesAreEdited(true);
                }}
              ></Button>
            ) : (
              <Button
                style={{ border: 'none' }}
                type="primary"
                onClick={() => {
                  setAttributesAreEdited(false);
                  updateCmpetence();
                }}
                icon={<SaveOutlined />}
              ></Button>
            ))
          }
        >
          <List
            itemLayout="horizontal"
            dataSource={attributeListData}
            renderItem={(item, index) => {
              return (
                <>
                  {selectedCompetence ? (
                    // <List.Item>
                    //   <List.Item.Meta
                    //     title={
                    //       <Space>
                    //         <span>{item.title}:</span>
                    //         {
                    //           // @ts-ignore
                    //           item.isEdited
                    //             ? item?.editRender(item.value)
                    //             : item?.render(item.value)
                    //           // (
                    //           //   <Input
                    //           //     value={item.value}
                    //           //     onChange={item.onChange}
                    //           //     style={{ width: '100%' }}
                    //           //   />
                    //           // ) : (
                    //           //   <span>{item.value}</span>
                    //           // )
                    //         }
                    //       </Space>
                    //     }
                    //   />
                    // </List.Item>
                    <List.Item>
                      <List.Item.Meta
                        // avatar={<Avatar src={`https://api.dicebear.com/7.x/miniavs/svg?seed=${index}`} />}
                        title={`${item.title}:`}
                        description={
                          item.isEdited ? (
                            <div style={{ display: 'flex', width: '100%' }}>
                              {item.editRender(item.value)}
                            </div>
                          ) : (
                            item.render(item.value)
                          )
                        }
                      />
                    </List.Item>
                  ) : (
                    index === 0 && (
                      <List.Item>
                        <List.Item.Meta
                          title={
                            <Typography.Paragraph style={{ width: cardWidth }}>
                              No competence selected.
                            </Typography.Paragraph>
                          }
                        />
                      </List.Item>
                    )
                  )}
                </>
              );
            }}
          />
        </Card>
      </div>
    </>
  );
};

export default CompetencesViewer;
