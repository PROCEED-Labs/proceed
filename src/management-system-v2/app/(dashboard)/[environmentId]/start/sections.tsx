'use client';

import Link from 'next/link';
import { Card } from 'antd';
import { useParams } from 'next/navigation';

import styles from './sections.module.scss';
import { ReactElement, ReactNode } from 'react';
import React from 'react';

type TileProps = {
  title: string;
  href: string;
  icon: ReactElement<{ className: string }>;
};

const Tile: React.FC<TileProps> = ({ title, href, icon }) => {
  const params = useParams();
  const environmentId = params.environmentId as string;

  const extendedIcon = React.cloneElement(icon, { className: styles.TileIcon });

  return (
    <Link key={title} href={`/${environmentId}/${href}`} className={styles.Tile}>
      <Card hoverable className={styles.TileCard}>
        {extendedIcon}
        <h3 className={styles.TileCardTitle}>{title}</h3>
      </Card>
    </Link>
  );
};

type SectionProps = {
  icon: ReactElement<{ className: string }>;
  title: string;
  description: ReactNode;
  tiles: { title: string; href: string; icon: ReactElement<{ className: string }> }[];
};

export const Section: React.FC<SectionProps> = ({ icon, title, description, tiles }) => {
  const extendedIcon = React.cloneElement(icon, { className: styles.SectionIcon });

  return (
    <div key={title} className={styles.Section}>
      <h2>
        {extendedIcon}
        {title}
      </h2>
      {description}
      <div className={styles.TileGroup}>
        {tiles.map((tile) => (
          <Tile key={tile.title} title={tile.title} href={tile.href} icon={tile.icon} />
        ))}
      </div>
    </div>
  );
};

export default Section;
