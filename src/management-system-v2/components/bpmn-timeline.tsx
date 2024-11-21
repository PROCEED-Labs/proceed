'use client';

type BPMNTimelineProps = React.HTMLAttributes<HTMLDivElement> & {
  process: { name: string; id: string; bpmn: string };
};

const BPMNTimeline = ({ process, ...props }: BPMNTimelineProps) => {
  return (
    <div {...props}>
      <pre>{process.name}</pre>
    </div>
  );
};

export default BPMNTimeline;
