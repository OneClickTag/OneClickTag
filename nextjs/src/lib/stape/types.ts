export interface StapeContainerCreateInput {
  name: string;
  code?: string;
  plan?: string;
  zone?: { type: string };
}

export interface StapeContainerResponse {
  id: string;
  identifier: string;
  name: string;
  code: string;
  status: { type: string; label: string };
  stapeDomain: string;
  sGtmContainerId?: string | null;
}

export interface StapeDomainInput {
  name: string;
  cdnType: string;
}

export interface StapeDomainResponse {
  identifier: string;
  name: string;
  cdnType: string;
  connectionType: string;
  isBadDomain: boolean;
  status: { type: string; label: string };
  error: { type: string; label: string };
  records: Array<{
    type: { type: string; label: string };
    host: string;
    value: string;
    domain?: string;
  }>;
}

export interface StapeDomainValidationResponse {
  identifier: string;
  name: string;
  status: { type: string; label: string };
  error: { type: string; label: string };
  records: Array<{
    type: { type: string; label: string };
    host: string;
    value: string;
    domain?: string;
  }>;
}
