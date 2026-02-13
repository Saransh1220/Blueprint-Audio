import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiRequest } from '../api/api-request';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  execute<T>(request: ApiRequest<T>): Observable<T> {
    const url = `${this.baseUrl}${request.path}`;
    const options = {
      params: request.params,
    };

    switch (request.method) {
      case 'GET':
        return this.http.get<T>(url, options);
      case 'POST':
        return this.http.post<T>(url, request.body, options);
      case 'PUT':
        return this.http.put<T>(url, request.body, options);
      case 'PATCH':
        return this.http.patch<T>(url, request.body, options);
      case 'DELETE':
        return this.http.delete<T>(url, options);
      default:
        throw new Error(`Unsupported HTTP method: ${request.method}`);
    }
  }

  upload<T>(request: ApiRequest<T>): Observable<any> {
    const url = `${this.baseUrl}${request.path}`;
    const options = {
      params: request.params,
      reportProgress: true,
      observe: 'events' as const,
    };

    if (request.method !== 'POST' && request.method !== 'PUT' && request.method !== 'PATCH') {
      throw new Error(`Upload only supported for POST, PUT, PATCH. Got: ${request.method}`);
    }

    switch (request.method) {
      case 'POST':
        return this.http.post(url, request.body, options);
      case 'PUT':
        return this.http.put(url, request.body, options);
      case 'PATCH':
        return this.http.patch(url, request.body, options);
      default:
        throw new Error(`Unsupported HTTP method for upload: ${request.method}`);
    }
  }

  get<T>(path: string, params: HttpParams = new HttpParams()): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}${path}`, { params });
  }

  post<T>(path: string, body: any = {}): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${path}`, body);
  }

  put<T>(path: string, body: any = {}): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}${path}`, body);
  }

  patch<T>(path: string, body: any = {}): Observable<T> {
    return this.http.patch<T>(`${this.baseUrl}${path}`, body);
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}${path}`);
  }
}
