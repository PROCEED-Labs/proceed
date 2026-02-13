'use client';

import { Suspense, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Card, Button, Space } from 'antd';
import { StarOutlined, DoubleRightOutlined, DoubleLeftOutlined } from '@ant-design/icons';
import { LazyBPMNViewer } from '@/components/bpmn-viewer';
import { useRouter } from 'next/navigation';
import { spaceURL } from '@/lib/utils';
import { useEnvironment } from '@/components/auth-can';
import { OverflowTooltipTitle } from '@/components/overflow-tooltip';
import ProceedLoadingIndicator from '@/components/loading-proceed';

import cn from 'classnames';

import styles from './favorite-processes-section.module.scss';

const CARD_WIDTH = 225;
const CARD_GAP = 16;
const PADDING_LEFT = 70;
const RIGHT_BUTTON_SPACE = 40;

type FavoriteProcess = {
  id: string;
  name: string;
  lastEditedOn: Date;
};

const sortTypes = [
  {
    name: 'lastEdited',
    label: 'Last Edited',
  },
  {
    name: 'alphabetical',
    label: 'Alphabetical',
  },
] as const;

type SortType = (typeof sortTypes)[number]['name'];

type FavoriteProcessesSectionProps = {
  processes: FavoriteProcess[];
};

const ProcessCard = ({
  process,
  space,
  router,
}: {
  process: FavoriteProcess;
  space: any;
  router: any;
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const loader = (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        width: '100%',
      }}
    >
      <div style={{ transform: 'scale(0.8)' }}>
        <ProceedLoadingIndicator />
      </div>
    </div>
  );

  return (
    <div ref={cardRef}>
      <Card
        hoverable
        style={{
          height: '191px',
          width: '225px',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
        styles={{
          body: { padding: '12px', flex: 1, overflow: 'hidden' },
          header: { padding: '0 10px', minHeight: '38px', fontSize: '14px' },
        }}
        title={
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              width: '100%',
              fontSize: '0.9em',
            }}
          >
            <OverflowTooltipTitle>{process.name}</OverflowTooltipTitle>
          </div>
        }
        onClick={() => {
          const url = `/processes/editor/${process.id}`;
          router.push(spaceURL(space, url));
        }}
      >
        <div className={cn(styles.FavoriteProcessPreview)}>
          {isVisible ? (
            <Suspense fallback={loader}>
              <LazyBPMNViewer
                definitionId={process.id}
                reduceLogo={true}
                fitOnResize={true}
                fallback={loader}
              />
            </Suspense>
          ) : (
            loader
          )}
        </div>
      </Card>
    </div>
  );
};

const FavoriteProcessesSection = ({ processes }: FavoriteProcessesSectionProps) => {
  const router = useRouter();
  const space = useEnvironment();
  const [sortType, setSortType] = useState<SortType>('lastEdited');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [visibleCardCount, setVisibleCardCount] = useState(6);

  const displayedProcesses = useMemo(() => {
    const sorted = [...processes];
    if (sortType === 'lastEdited') {
      sorted.sort(
        (a, b) => new Date(b.lastEditedOn).getTime() - new Date(a.lastEditedOn).getTime(),
      );
    } else if (sortType === 'alphabetical') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
    return sorted;
  }, [processes, sortType]);

  useEffect(() => {
    const calculateVisibleCards = () => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.clientWidth;
      const availableWidth = containerWidth - PADDING_LEFT - RIGHT_BUTTON_SPACE;
      const cardWithGap = CARD_WIDTH + CARD_GAP;
      const count = Math.max(2, Math.floor((availableWidth + CARD_GAP) / cardWithGap));
      setVisibleCardCount(count);
    };

    calculateVisibleCards();
    const resizeObserver = new ResizeObserver(() => {
      calculateVisibleCards();
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const updateArrowsVisibility = () => {
      if (scrollContainerRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
        setShowLeftArrow(scrollLeft > 0);
        setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
      }
    };

    const container = scrollContainerRef.current;
    if (container) {
      updateArrowsVisibility();
      container.addEventListener('scroll', updateArrowsVisibility);
    }
    return () => {
      if (container) {
        container.removeEventListener('scroll', updateArrowsVisibility);
      }
    };
  }, [displayedProcesses]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = CARD_WIDTH + CARD_GAP;
      scrollContainerRef.current.scrollBy({
        left: direction === 'right' ? scrollAmount : -scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (displayedProcesses.length === 0) {
    return null;
  }

  const actualCardCount = Math.min(visibleCardCount, displayedProcesses.length);
  const listWidth = actualCardCount * CARD_WIDTH + (actualCardCount - 1) * CARD_GAP;

  return (
    <div
      ref={containerRef}
      className={styles.FavoritesSection}
      style={{
        paddingLeft: `${PADDING_LEFT}px`,
        paddingRight: `${RIGHT_BUTTON_SPACE}px`,
      }}
    >
      <div style={{ position: 'relative' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            width: `${listWidth}px`,
            minWidth: 'fit-content',
          }}
        >
          <h2 style={{ margin: 0, whiteSpace: 'nowrap' }}>
            <StarOutlined style={{ marginRight: '8px' }} />
            My Favorite Processes
          </h2>
          {displayedProcesses.length >= 2 && (
            <Space size="small" style={{ flexShrink: 0 }}>
              {sortTypes.map((type) => (
                <Button
                  key={type.name}
                  type={sortType === type.name ? 'primary' : 'default'}
                  onClick={() => setSortType(type.name)}
                  size="small"
                >
                  {type.label}
                </Button>
              ))}
            </Space>
          )}
        </div>
        <div className={styles.Carousel}>
          {showLeftArrow && (
            <Button
              shape="circle"
              icon={<DoubleLeftOutlined />}
              onClick={() => scroll('left')}
              className={styles.CarouselButton}
              style={{ left: `-${PADDING_LEFT / 2 + 16}px` }}
            />
          )}
          <div
            ref={scrollContainerRef}
            className="Hide-Scroll-Bar"
            style={{
              display: 'flex',
              gap: `${CARD_GAP}px`,
              overflowX: 'auto',
              paddingBottom: '8px',
              width: `${listWidth}px`,
            }}
          >
            {displayedProcesses.map((process) => (
              <ProcessCard key={process.id} process={process} space={space} router={router} />
            ))}
          </div>
          {showRightArrow && (
            <Button
              shape="circle"
              icon={<DoubleRightOutlined />}
              onClick={() => scroll('right')}
              className={styles.CarouselButton}
              style={{ left: `${listWidth + 20}px` }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default FavoriteProcessesSection;
