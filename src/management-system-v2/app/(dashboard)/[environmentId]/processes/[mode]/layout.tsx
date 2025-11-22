import { ProcessViewProvider } from './[processId]/process-view-context';

export default async function ModeLayout(props: {
  children: React.ReactNode;
  params: Promise<{ mode: string }>;
}) {
  const params = await props.params;
  return <ProcessViewProvider mode={params.mode}>{props.children}</ProcessViewProvider>;
}
