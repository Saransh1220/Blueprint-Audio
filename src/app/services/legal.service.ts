import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { ApiService } from '../core/services/api.service';
import { LegalAdapter } from '../adapters/legal.adapter';
import {
  GetLegalDocumentRequest,
  GetLegalDocumentVersionRequest,
  GetLegalDocumentVersionsRequest,
  GetLegalRequirementsRequest,
  RecordLegalAcceptanceRequest,
} from '../core/api/legal.requests';
import {
  LegalAcceptancePayload,
  LegalDocumentView,
  LegalRequirement,
  LegalVersion,
} from '../models/legal.model';

@Injectable({ providedIn: 'root' })
export class LegalService {
  private readonly api = inject(ApiService);
  private readonly adapter = inject(LegalAdapter);

  // In-memory cache to guarantee instant local rendering
  private readonly documentCache = new Map<string, LegalDocumentView>();

  getDocument(key: string, locale: string = 'en'): Observable<LegalDocumentView> {
    return this.api.execute(new GetLegalDocumentRequest(key, locale)).pipe(
      map((dto) => {
        const view = this.adapter.adaptView(dto);
        this.documentCache.set(`${key}:${locale}`, view);
        return view;
      }),
      catchError((err) => {
        const cached = this.documentCache.get(`${key}:${locale}`);
        if (cached) {
          return of(cached);
        }
        throw err;
      }),
    );
  }

  getDocumentVersions(key: string): Observable<LegalVersion[]> {
    return this.api
      .execute(new GetLegalDocumentVersionsRequest(key))
      .pipe(map((dto) => (dto.data || []).map((v) => this.adapter.adaptVersion(v))));
  }

  getDocumentVersion(key: string, version: string): Observable<LegalVersion> {
    return this.api
      .execute(new GetLegalDocumentVersionRequest(key, version))
      .pipe(map((dto) => this.adapter.adaptVersion(dto)));
  }

  getRequirements(): Observable<LegalRequirement[]> {
    return this.api
      .execute(new GetLegalRequirementsRequest())
      .pipe(map((dto) => this.adapter.adaptRequirements(dto.data || [])));
  }

  recordAcceptance(payload: LegalAcceptancePayload): Observable<boolean> {
    return this.api
      .execute(
        new RecordLegalAcceptanceRequest({
          document_key: payload.documentKey,
          version_id: payload.versionId,
          content_hash: payload.contentHash,
          action: payload.action,
          context: payload.context,
        }),
      )
      .pipe(map((res) => !!res?.success));
  }
}
