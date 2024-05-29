interface AtlassianConnectAPI {
  resize(width: string | number, height: string | number): void;
  confluence: any;
  dialog: {
    getCustomData(callback: (data: any) => void): void;
    close(data?: any): void;
  };
  navigator: {
    go(view: string, options?: { customData?: any }): void;
  };
  context: {
    getToken(callback: (token: any) => void): unknown;
    getContext(callback: (context: any) => void): void;
  };
}

interface Window {
  AP: AtlassianConnectAPI;
}
