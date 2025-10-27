import Content from '@/components/content';
import { getMSConfig } from '@/lib/ms-config/ms-config';
import MyTasksSection from './my-tasks-section';
import ProcessesSection from './processes-section';
import AutomationsSection from './automations-section';
import PersonalSection from './personal-section';
import HomeSection from './home-section';

const StartPage = async () => {
  const msConfig = await getMSConfig();

  return (
    <Content>
      <h1>Welcome to Proceed</h1>
      {msConfig.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE && <MyTasksSection />}
      {msConfig.PROCEED_PUBLIC_PROCESS_DOCUMENTATION_ACTIVE && <ProcessesSection />}
      {msConfig.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE && <AutomationsSection />}
      <PersonalSection />
      <HomeSection />
    </Content>
  );
};

export default StartPage;
