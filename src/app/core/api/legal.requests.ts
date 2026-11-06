import { HttpParams } from '@angular/common/http';
import { ApiRequest, HttpMethod } from './api-request';

export interface LegalTableDataDto {
  headers: string[];
  rows: string[][];
}

export interface LegalSectionDto {
  id: string;
  order: number;
  title: string;
  content: string;
  summary?: string;
  table?: LegalTableDataDto;
}

export interface LegalDocumentDto {
  key: string;
  audience: string;
  locale: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface LegalDocumentVersionDto {
  id: string;
  document_key: string;
  display_version: string;
  schema_version: number;
  title: string;
  summary: string;
  sections: LegalSectionDto[];
  content_hash: string;
  update_classification: string;
  status: string;
  published_at: string;
  effective_at: string;
  superseded_at?: string;
}

export interface LegalDocumentViewDto {
  document: LegalDocumentDto;
  current_version: LegalDocumentVersionDto;
  upcoming_version?: LegalDocumentVersionDto;
}

export interface LegalVersionsListDto {
  data: LegalDocumentVersionDto[];
}

export interface LegalRequirementDto {
  document_key: string;
  title: string;
  current_version: LegalDocumentVersionDto;
  accepted: boolean;
  last_accepted_at?: string;
}

export interface LegalRequirementsListDto {
  data: LegalRequirementDto[];
}

export interface RecordAcceptanceDto {
  document_key: string;
  version_id: string;
  content_hash: string;
  action: string;
  context: string;
}

export class GetLegalDocumentRequest implements ApiRequest<LegalDocumentViewDto> {
  readonly path: string;
  readonly method: HttpMethod = 'GET';
  readonly params: HttpParams;
  readonly _responseType?: LegalDocumentViewDto;

  constructor(key: string, locale: string = 'en') {
    this.path = `/api/v1/legal/documents/${encodeURIComponent(key)}`;
    this.params = new HttpParams().set('locale', locale);
  }
}

export class GetLegalDocumentVersionsRequest implements ApiRequest<LegalVersionsListDto> {
  readonly path: string;
  readonly method: HttpMethod = 'GET';
  readonly params = new HttpParams();
  readonly _responseType?: LegalVersionsListDto;

  constructor(key: string) {
    this.path = `/api/v1/legal/documents/${encodeURIComponent(key)}/versions`;
  }
}

export class GetLegalDocumentVersionRequest implements ApiRequest<LegalDocumentVersionDto> {
  readonly path: string;
  readonly method: HttpMethod = 'GET';
  readonly params = new HttpParams();
  readonly _responseType?: LegalDocumentVersionDto;

  constructor(key: string, version: string) {
    this.path = `/api/v1/legal/documents/${encodeURIComponent(key)}/versions/${encodeURIComponent(version)}`;
  }
}

export class GetLegalRequirementsRequest implements ApiRequest<LegalRequirementsListDto> {
  readonly path = '/api/v1/legal/requirements';
  readonly method: HttpMethod = 'GET';
  readonly params = new HttpParams();
  readonly _responseType?: LegalRequirementsListDto;
}

export class RecordLegalAcceptanceRequest implements ApiRequest<{ success: boolean }> {
  readonly path = '/api/v1/legal/acceptances';
  readonly method: HttpMethod = 'POST';
  readonly params = new HttpParams();
  readonly body: RecordAcceptanceDto;
  readonly _responseType?: { success: boolean };

  constructor(body: RecordAcceptanceDto) {
    this.body = body;
  }
}
