import type {
  StapeContainerCreateInput,
  StapeContainerResponse,
  StapeDomainInput,
  StapeDomainResponse,
  StapeDomainValidationResponse,
} from './types';

const STAPE_API_BASE_URL = process.env.STAPE_API_BASE_URL || 'https://api.app.stape.io/api/v2';
const STAPE_API_KEY = process.env.STAPE_API_KEY || '';

async function stapeRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  if (!STAPE_API_KEY) {
    throw new Error('STAPE_API_KEY environment variable is not configured');
  }

  const url = `${STAPE_API_BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${STAPE_API_KEY}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'Unknown error');
    throw new Error(`Stape API error (${response.status}): ${errorBody}`);
  }

  return response.json() as Promise<T>;
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
    body: JSON.stringify({ reason: 'Customer disconnected' }),
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
