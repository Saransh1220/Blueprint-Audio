import { HttpParams } from '@angular/common/http';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiRequest<TResponse> {
  readonly path: string;
  readonly method: HttpMethod;
  readonly body?: any;
  readonly params?: HttpParams;
  readonly reportProgress?: boolean;
  readonly observe?: 'body' | 'events' | 'response';
  readonly _responseType?: TResponse; // Phantom property for type inference
}
