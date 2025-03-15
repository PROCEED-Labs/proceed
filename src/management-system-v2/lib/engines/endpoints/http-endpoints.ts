export async function httpRequest(
  machineAddress: string,
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  body?: Record<string, any>,
) {
  const options: RequestInit = {
    method,
  };

  if (body) {
    options.headers = {
      ...options.headers,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    options.body = JSON.stringify(body);
  }

  const url = new URL(endpoint, machineAddress).toString();
  const response = await fetch(url, options);

  if (!response.ok) throw new Error(`HTTP request failed with status ${response.status}`);

  const contentType = response.headers.get('content-type') || '';

  if (response.headers.get('content-type')?.includes('application/json')) {
    return response.json();
  } else if (
    contentType.includes('text/plain') ||
    contentType.includes('text/javascript') ||
    contentType.includes('application/javascript') ||
    contentType.includes('application/xml') ||
    contentType.includes('text/xml')
  ) {
    return await response.text();
  } else if (
    contentType.includes('image/') ||
    contentType.includes('audio/') ||
    contentType.includes('video/')
  ) {
    return await response.blob();
  }

  return response;
}
