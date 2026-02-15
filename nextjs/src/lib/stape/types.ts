export interface StapeContainerCreateInput {
  name: string;
  plan?: string;
}

export interface StapeContainerResponse {
  id: string;
  name: string;
  status: string;
  domain: string;
  gtmContainerId?: string;
}

export interface StapeDomainInput {
  domain: string;
}

export interface StapeDomainResponse {
  id: string;
  domain: string;
  status: string;
  cnameTarget: string;
}

export interface StapeDomainValidationResponse {
  isValid: boolean;
  domain: string;
  status: string;
}
