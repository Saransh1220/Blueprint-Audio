export interface LegalTableData {
  headers: string[];
  rows: string[][];
}

export interface LegalSection {
  id: string;
  order: number;
  title: string;
  content: string;
  summary?: string;
  table?: LegalTableData;
}

export interface LegalDocument {
  key: string;
  audience: string;
  locale: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface LegalVersion {
  id: string;
  documentKey: string;
  displayVersion: string;
  schemaVersion: number;
  title: string;
  summary: string;
  sections: LegalSection[];
  contentHash: string;
  updateClassification: 'material' | 'minor' | 'urgent';
  status: 'draft' | 'scheduled' | 'published' | 'archived';
  publishedAt: string;
  effectiveAt: string;
  supersededAt?: string;
}

export interface LegalDocumentView {
  document: LegalDocument;
  currentVersion: LegalVersion;
  upcomingVersion?: LegalVersion;
}

export interface LegalRequirement {
  documentKey: string;
  title: string;
  currentVersion: LegalVersion;
  accepted: boolean;
  lastAcceptedAt?: string;
}

export interface LegalAcceptancePayload {
  documentKey: string;
  versionId: string;
  contentHash: string;
  action: 'register' | 'checkout' | 'acknowledgement' | 'update';
  context: string;
}
