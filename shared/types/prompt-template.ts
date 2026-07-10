// Prompt template domain types

export interface PromptVariable {
  name: string;
  description: string;
  source: string;
  required: boolean;
}

export interface PromptTemplate {
  id: string;
  bookId: string | null;  // null = system-level template
  functionKey: string;
  displayName: string;
  description: string;
  template: string;
  variables: PromptVariable[];
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePromptTemplateDTO {
  bookId?: string | null;  // optional, null for system-level templates
  functionKey: string;
  displayName: string;
  description?: string;
  template: string;
  variables?: PromptVariable[];
}

export interface UpdatePromptTemplateDTO {
  displayName?: string;
  description?: string;
  template?: string;
  variables?: PromptVariable[];
  isActive?: boolean;
}
