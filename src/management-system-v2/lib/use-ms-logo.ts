import { use, useEffect, useState } from 'react';
import { useFileManager } from './useFileManager';
import { useEnvironment } from '@/components/auth-can';
import { EntityType } from './helpers/fileManagerHelpers';
import { EnvVarsContext } from '@/components/env-vars-context';
import { Grid } from 'antd';

/**
 * Use this hook when you need to get the logo of a space.
 * This is the central place where we define the behavior of the ms logo.
 *
 * @param customLogo - Custom logo filePath. If the hook is used outside a space this will only be
 * used if it starts with 'public/'.
 */
export default function useMSLogo(
  customLogo?: string,
  options?: { disableResponsive?: boolean; spaceId?: string },
) {
  const space = useEnvironment();
  const spaceId = options?.spaceId ?? space.spaceId;
  const inSpace = spaceId !== '';

  const envVars = use(EnvVarsContext);

  const breakpoint = Grid.useBreakpoint();
  const { download: getLogo } = useFileManager({ entityType: EntityType.ORGANIZATION });
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    async function fetchLogo() {
      setLogoUrl(undefined);
      if (inSpace && customLogo && !customLogo.startsWith('public/')) {
        const result = await getLogo({ entityId: spaceId, filePath: customLogo });
        if (result.fileUrl) {
          setLogoUrl(result.fileUrl);
        }
      }
    }
    fetchLogo();
  }, [space, customLogo]);

  let imageSource;
  if (customLogo?.startsWith('public/')) {
    imageSource = customLogo.replace('public/', '/');
  } else if (logoUrl) {
    imageSource = logoUrl;
  } else if (
    envVars.PROCEED_PUBLIC_GENERAL_MS_LOGO &&
    envVars.PROCEED_PUBLIC_GENERAL_MS_LOGO.startsWith('public/')
  ) {
    imageSource = envVars.PROCEED_PUBLIC_GENERAL_MS_LOGO.replace('public/', '/');
  } else if (options?.disableResponsive) {
    imageSource = '/proceed.svg';
  } else {
    imageSource = breakpoint.xs ? '/proceed-icon.png' : '/proceed.svg';
  }

  // Return as an object to possibly extend in the future, with loading for example
  return { imageSource };
}
