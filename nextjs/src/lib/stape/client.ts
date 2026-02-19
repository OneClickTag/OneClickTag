import type {
  StapeContainerCreateInput,
  StapeContainerResponse,
  StapeDomainInput,
  StapeDomainResponse,
  StapeDomainValidationResponse,
} from './types';

async function stapeRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey = process.env.STAPE_API_KEY;
  const baseUrl = process.env.STAPE_API_BASE_URL || 'https://api.app.stape.io/api/v2';

  if (!apiKey) {
    throw new Error('STAPE_API_KEY environment variable is not configured');
  }

  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-AUTH-TOKEN': apiKey,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'Unknown error');
    throw new Error(`Stape API error (${response.status}): ${errorBody}`);
  }

  // Handle empty responses (e.g., 204 No Content from DELETE)
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as T;
  }

  const json = await response.json();
  // Stape API wraps all responses in a { body: ..., error: ... } envelope
  return (json.body ?? json) as T;
}

export async function createStapeContainer(
  input: StapeContainerCreateInput
): Promise<StapeContainerResponse> {
  return stapeRequest<StapeContainerResponse>('/containers', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getStapeContainer(
  containerId: string
): Promise<StapeContainerResponse> {
  return stapeRequest<StapeContainerResponse>(`/containers/${containerId}`);
}

export async function deleteStapeContainer(
  containerId: string
): Promise<void> {
  await stapeRequest(`/containers/${containerId}`, {
    method: 'DELETE',
  });
}

export async function addStapeDomain(
  containerId: string,
  input: StapeDomainInput
): Promise<StapeDomainResponse> {
  return stapeRequest<StapeDomainResponse>(
    `/containers/${containerId}/domains`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  );
}

export async function validateStapeDomain(
  containerId: string,
  domainId: string
): Promise<StapeDomainValidationResponse> {
  return stapeRequest<StapeDomainValidationResponse>(
    `/containers/${containerId}/domains/${domainId}/revalidate`,
    { method: 'POST' }
  );
}

export async function enableCookieKeeper(
  containerId: string
): Promise<void> {
  await stapeRequest(`/containers/${containerId}/power-ups/cookie-keeper`, {
    method: 'PATCH',
    body: JSON.stringify({ enabled: true }),
  });
}

export async function enableCustomLoader(
  containerId: string
): Promise<void> {
  await stapeRequest(`/containers/${containerId}/power-ups/custom-loader`, {
    method: 'PATCH',
    body: JSON.stringify({ enabled: true }),
  });
}
