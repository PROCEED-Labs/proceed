interface AtlassianConnectAPI {
  dialog: {
    getCustomData(callback: (data: any) => void): void;
    close(data?: any): void;
  };
  navigator: {
    go(view: string, options?: { customData?: any }): void;
  };
  context: {
    getContext(callback: (context: any) => void): void;
  };
}

interface Window {
  AP: AtlassianConnectAPI;
}
