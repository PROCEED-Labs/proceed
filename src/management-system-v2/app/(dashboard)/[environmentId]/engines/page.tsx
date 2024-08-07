import Content from '@/components/content';
import { Space } from 'antd';
import { notFound } from 'next/navigation';
import EnginesView from './engines-view';
import { DiscoveredEngine, SavedEngine } from './engines-list';
import { v4 } from 'uuid';

const EnginesPage = async ({ params }: { params: { environmentId: string } }) => {
  if (!process.env.NEXT_PUBLIC_ENABLE_EXECUTION) {
    return notFound();
  }

  const generateMockEngines = () => {
    const discoveredEngines: DiscoveredEngine[] = [];
    const savedEngines: SavedEngine[] = [];

    for (let i = 0; i < 8; i++) {
      if (i % 3 === 0) {
        savedEngines.push({
          id: v4(),
          name: `Engine ${i}`,
          hostname: `Host Engine ${i}`,
          address: `123.123.123.12${i}`,
          ownName: `My Engine ${i}`,
          description: `This is a mocked engine`,
        });
      } else {
        discoveredEngines.push({
          id: v4(),
          name: `Engine ${i}`,
          hostname: `Host Engine ${i}`,
          address: `123.123.123.12${i}`,
          ownName: `My Engine ${i}`,
          description: `This is a mocked engine`,
          discoveryTechnology: 'Discovery Technology A',
        });
      }
    }

    return { discoveredEngines, savedEngines };
  };

  const engines = generateMockEngines();

  return (
    <Content title="Engines">
      <EnginesView
        discoveredEngines={engines.discoveredEngines}
        savedEngines={engines.savedEngines}
      ></EnginesView>
    </Content>
  );
};

export default EnginesPage;
