import { HttpBackend, HttpClient, HttpEvent, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type { SpecUploadInstructionDto } from '../api/spec-upload.requests';

@Injectable({
  providedIn: 'root',
})
export class ObjectStorageUploadService {
  private readonly http = new HttpClient(inject(HttpBackend));

  upload(instruction: SpecUploadInstructionDto, file: File): Observable<HttpEvent<string>> {
    return this.http.put(instruction.upload_url, file, {
      headers: new HttpHeaders(instruction.headers),
      observe: 'events',
      reportProgress: true,
      responseType: 'text',
      withCredentials: false,
    });
  }
}
