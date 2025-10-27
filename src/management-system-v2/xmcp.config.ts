import { type XmcpConfig } from 'xmcp';

const config: XmcpConfig = {
  http: true,
  experimental: {
    adapter: 'nextjs',
  },
  paths: {
    tools: 'tools',
    prompts: 'prompts',
    resources: 'resources',
  },
};

export default config;
