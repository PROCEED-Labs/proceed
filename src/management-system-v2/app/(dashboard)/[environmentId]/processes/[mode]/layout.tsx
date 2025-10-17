import { ProcessViewProvider } from './[processId]/process-view-context';

export default function ModeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { mode: string };
}) {
  return <ProcessViewProvider mode={params.mode}>{children}</ProcessViewProvider>;
}
