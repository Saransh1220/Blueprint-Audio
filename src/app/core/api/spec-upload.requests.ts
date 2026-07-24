import type { SpecDto } from './spec.requests';
import { ApiRequest, HttpMethod } from './api-request';

export type SpecUploadFileKind = 'image' | 'preview' | 'wav' | 'stems';

export interface SpecUploadFileDescriptorDto {
  kind: SpecUploadFileKind;
  file_name: string;
  content_type: string;
  size_bytes: number;
}

export interface SpecUploadInstructionDto {
  asset_id: string;
  kind: SpecUploadFileKind;
  object_key: string;
  upload_url: string;
  method: 'PUT';
  headers: Record<string, string>;
}

export interface SpecUploadSessionDto {
  upload_id: string;
  spec_id: string;
  expires_at: string;
}

export interface ConfirmedSpecUploadFileDto {
  asset_id: string;
  kind: SpecUploadFileKind;
  file_name: string;
  content_type: string;
  size_bytes: number;
}

export type SpecUploadStatus =
  | 'uploading'
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'expired';

export type SpecUploadProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface SpecUploadStatusDto {
  upload_id: string;
  spec_id: string;
  status: SpecUploadStatus;
  processing_status: SpecUploadProcessingStatus;
  error?: string;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

export class CreateSpecUploadSessionRequest implements ApiRequest<SpecUploadSessionDto> {
  readonly path = '/spec-uploads';
  readonly method: HttpMethod = 'POST';
  readonly body = {};
  readonly _responseType?: SpecUploadSessionDto;
}

export class SaveSpecUploadMetadataRequest implements ApiRequest<void> {
  readonly path: string;
  readonly method: HttpMethod = 'PUT';
  readonly _responseType?: void;

  constructor(
    uploadId: string,
    readonly body: Record<string, unknown>,
  ) {
    this.path = `/spec-uploads/${encodeURIComponent(uploadId)}/metadata`;
  }
}

export class PrepareSpecUploadFileRequest implements ApiRequest<SpecUploadInstructionDto> {
  readonly path: string;
  readonly method: HttpMethod = 'POST';
  readonly _responseType?: SpecUploadInstructionDto;

  constructor(
    uploadId: string,
    readonly body: SpecUploadFileDescriptorDto,
  ) {
    this.path = `/spec-uploads/${encodeURIComponent(uploadId)}/files`;
  }
}

export class ConfirmSpecUploadFileRequest implements ApiRequest<ConfirmedSpecUploadFileDto> {
  readonly path: string;
  readonly method: HttpMethod = 'POST';
  readonly body = {};
  readonly _responseType?: ConfirmedSpecUploadFileDto;

  constructor(uploadId: string, assetId: string) {
    this.path =
      `/spec-uploads/${encodeURIComponent(uploadId)}` +
      `/files/${encodeURIComponent(assetId)}/complete`;
  }
}

export class CompleteSpecUploadSessionRequest implements ApiRequest<SpecDto> {
  readonly path: string;
  readonly method: HttpMethod = 'POST';
  readonly body = {};
  readonly _responseType?: SpecDto;

  constructor(uploadId: string) {
    this.path = `/spec-uploads/${encodeURIComponent(uploadId)}/complete`;
  }
}

export class GetSpecUploadStatusRequest implements ApiRequest<SpecUploadStatusDto> {
  readonly path: string;
  readonly method: HttpMethod = 'GET';
  readonly _responseType?: SpecUploadStatusDto;

  constructor(uploadId: string) {
    this.path = `/spec-uploads/${encodeURIComponent(uploadId)}`;
  }
}
