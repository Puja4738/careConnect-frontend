import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { API } from './api.config';

@Injectable({ providedIn: 'root' })
export class NurseService {

  private readonly NURSES_API = `${API}/nurses`;
  private readonly JOBS_API   = `${API}/jobs`;
  private readonly APPS_API   = `${API}/applications`;

  constructor(private http: HttpClient) {}

  // ── Profile ──────────────────────────────────────────────────────
  getProfile(userId: number): Observable<any> {
    return this.http.get<any>(`${this.NURSES_API}/${userId}/profile`)
      .pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  updateProfile(userId: number, payload: any): Observable<any> {
    return this.http.put<any>(`${this.NURSES_API}/${userId}/profile`, payload)
      .pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  // ── Emergency availability ────────────────────────────────────────
  toggleEmergencyAvailability(userId: number, available: boolean): Observable<any> {
    return this.http.patch<any>(`${this.NURSES_API}/${userId}/emergency-availability?available=${available}`, {})
      .pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  // ── Jobs ─────────────────────────────────────────────────────────
  getJobs(specialization?: string, location?: string, jobType?: string): Observable<any[]> {
    let params = new HttpParams();
    if (specialization && specialization !== 'All') params = params.set('specialization', specialization);
    if (location      && location      !== 'All') params = params.set('location', location);
    if (jobType       && jobType       !== 'All') params = params.set('jobType', jobType);
    return this.http.get<any>(`${this.JOBS_API}`, { params })
      .pipe(map((r: any) => r.data || []), catchError(this.handleError));
  }

  getEmergencyJobs(): Observable<any[]> {
    return this.http.get<any>(`${this.JOBS_API}/emergency`)
      .pipe(map((r: any) => r.data || []), catchError(this.handleError));
  }

  // ── Applications ─────────────────────────────────────────────────
  getApplications(nurseUserId: number): Observable<any[]> {
    return this.http.get<any>(`${this.APPS_API}/nurse/${nurseUserId}`)
      .pipe(map((r: any) => r.data || []), catchError(this.handleError));
  }

  applyToJob(nurseUserId: number, jobId: number, coverNote: string = ''): Observable<any> {
    return this.http.post<any>(`${this.APPS_API}/nurse/${nurseUserId}`, { jobId, coverNote })
      .pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  // ── Compliance ───────────────────────────────────────────────────
  getMyCompliance(nurseUserId: number): Observable<any[]> {
    return this.http.get<any>(`${API}/compliance/nurse/${nurseUserId}`)
      .pipe(map((r: any) => r.data || []), catchError(() => []));
  }

  submitCompliance(recordId: number, nurseUserId: number, note: string, document?: File): Observable<any> {
    const fd = new FormData();
    fd.append('nurseUserId', String(nurseUserId));
    if (note) fd.append('note', note);
    if (document) fd.append('document', document);
    return this.http.post<any>(`${API}/compliance/${recordId}/submit`, fd)
      .pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  private handleError(err: HttpErrorResponse): Observable<never> {
    const msg = err.error?.message ?? 'Something went wrong. Please try again.';
    return throwError(() => new Error(msg));
  }
}
