declare module 'jest-axe' {
  export interface AxeResults {
    violations: Array<{
      id: string;
      impact: string;
      description: string;
      nodes: Array<{
        html: string;
        target: string[];
      }>;
    }>;
    passes: Array<any>;
    incomplete: Array<any>;
    inapplicable: Array<any>;
  }

  export interface AxeConfig {
    rules?: Record<string, { enabled: boolean }>;
    tags?: string[];
  }

  export function axe(element: Element | Document, config?: AxeConfig): Promise<AxeResults>;
  export function configureAxe(config: AxeConfig): void;
  export function toHaveNoViolations(): any;
}