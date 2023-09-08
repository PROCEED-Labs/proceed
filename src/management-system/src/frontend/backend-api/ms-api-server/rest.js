let xCsrfToken;

export function setXCsrfToken(newToken) {
  xCsrfToken = newToken;
}

export default async function request(endpoint, query, method, dataType, data) {
  const nonApi = ['/login', '/register', '/logout', '/callback', '/userinfo'];
  let uri = nonApi.includes(endpoint) ? endpoint : `/api/${endpoint}`;

  if (query) {
    uri = `${uri}?${query}`;
  }

  const options = {
    method: method || 'GET',
    credentials: 'include',
    headers: {
      'x-csrf': 1,
    },
  };

  if (xCsrfToken) options.headers['x-csrf-token'] = xCsrfToken;

  if (dataType === 'application/json' && typeof data !== 'string') {
    data = JSON.stringify(data);
  }

  if (data) {
    options.headers = {
      ...options.headers,
      'Content-Type': dataType,
    };
    options.body = data;
  }

  const response = await fetch(uri, options);

  if (!response.ok) {
    throw new Error(
      `Request failed with status code ${response.status}.\nReason: ${await response.text()}`,
    );
  }

  const contentType = response.headers.get('content-type');

  if (!contentType) {
    return response;
  }

  if (contentType.includes('application/json')) {
    const obj = await response.json();
    return obj;
  }

  if (contentType.includes('text/plain')) {
    const text = await response.text();
    return text;
  }

  if (contentType.includes('text/html')) {
    const html = await response.text();
    return html;
  }

  throw new Error('Received response with unknown content type!');
}
