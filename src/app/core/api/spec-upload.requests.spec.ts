import {
  CompleteSpecUploadSessionRequest,
  ConfirmSpecUploadFileRequest,
  CreateSpecUploadSessionRequest,
  GetSpecUploadStatusRequest,
  PrepareSpecUploadFileRequest,
  SaveSpecUploadMetadataRequest,
} from './spec-upload.requests';

describe('spec upload request objects', () => {
  it('creates an empty draft upload session', () => {
    const request = new CreateSpecUploadSessionRequest();

    expect(request.method).toBe('POST');
    expect(request.path).toBe('/spec-uploads');
    expect(request.body).toEqual({});
  });

  it('builds metadata and per-file staging requests', () => {
    const metadata = new SaveSpecUploadMetadataRequest('upload/id', { title: 'Moonlight' });
    const file = new PrepareSpecUploadFileRequest('upload/id', {
      kind: 'preview',
      file_name: 'preview.mp3',
      content_type: 'audio/mpeg',
      size_bytes: 42,
    });
    const confirm = new ConfirmSpecUploadFileRequest('upload/id', 'asset/id');

    expect(metadata.method).toBe('PUT');
    expect(metadata.path).toBe('/spec-uploads/upload%2Fid/metadata');
    expect(file.path).toBe('/spec-uploads/upload%2Fid/files');
    expect(file.body.kind).toBe('preview');
    expect(confirm.path).toBe('/spec-uploads/upload%2Fid/files/asset%2Fid/complete');
  });

  it('builds completion and processing-status requests', () => {
    const complete = new CompleteSpecUploadSessionRequest('upload/id');
    const status = new GetSpecUploadStatusRequest('upload/id');

    expect(complete.method).toBe('POST');
    expect(complete.path).toBe('/spec-uploads/upload%2Fid/complete');
    expect(complete.body).toEqual({});
    expect(status.method).toBe('GET');
    expect(status.path).toBe('/spec-uploads/upload%2Fid');
  });
});
