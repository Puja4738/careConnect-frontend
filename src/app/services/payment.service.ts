import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { API } from './api.config';

@Injectable({ providedIn: 'root' })
export class PaymentService {

  private readonly API = API;

  constructor(private http: HttpClient) {}

  // ── Nurse bank details ─────────────────────────────────────────────────────

  saveBankDetails(nurseUserId: number, details: {
    upiId?: string;
    bankAccountNumber?: string;
    bankIfscCode?: string;
    bankName?: string;
    preferredPaymentMode: string;
  }): Observable<any> {
    return this.http.put(`${this.API}/nurses/${nurseUserId}/bank-details`, details)
      .pipe(catchError(this.handleError));
  }

  // ── Nurse shift payment ────────────────────────────────────────────────────

  markShiftComplete(nurseUserId: number, appointmentId: number, ratePerShift: number, notes: string): Observable<any> {
    return this.http.post(`${this.API}/payments/shift/${nurseUserId}`,
      { appointmentId, ratePerShift, notes })
      .pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  // ── Nurse payment history ──────────────────────────────────────────────────

  getByNurse(nurseUserId: number): Observable<any[]> {
    return this.http.get<any>(`${this.API}/payments/nurse/${nurseUserId}`)
      .pipe(map(r => r.data || []), catchError(() => []));
  }

  getTotalEarnings(nurseUserId: number): Observable<number> {
    return this.http.get<any>(`${this.API}/payments/nurse/${nurseUserId}/total`)
      .pipe(map(r => r.data ?? 0), catchError(() => [0]));
  }

  // ── Patient payments ───────────────────────────────────────────────────────

  getPendingByPatient(patientUserId: number): Observable<any[]> {
    return this.http.get<any>(`${this.API}/payments/patient/${patientUserId}/pending`)
      .pipe(map(r => r.data || []), catchError(() => []));
  }

  processPatientPayment(patientUserId: number, appointmentId: number, paymentMethod: string): Observable<any> {
    return this.http.post(`${this.API}/payments/patient/${patientUserId}/pay`,
      { appointmentId, paymentMethod })
      .pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  // ── Org salary ─────────────────────────────────────────────────────────────

  processMonthlySalary(orgUserId: number, payload: {
    nurseUserId: number;
    salaryMonth: string;
    baseSalary: number;
    hra?: number;
    travelAllowance?: number;
    otherAllowances?: number;
    professionalTax?: number;
    paymentMethod?: string;
  }): Observable<any> {
    return this.http.post(`${this.API}/payments/org/${orgUserId}/salary`, payload)
      .pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  getOrgSalaryHistory(orgUserId: number): Observable<any[]> {
    return this.http.get<any>(`${this.API}/payments/org/${orgUserId}/history`)
      .pipe(map(r => r.data || []), catchError(() => []));
  }

  getByReference(referenceNumber: string): Observable<any> {
    return this.http.get<any>(`${this.API}/payments/ref/${referenceNumber.toUpperCase()}`)
      .pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  getHistoryByPatient(patientUserId: number): Observable<any[]> {
    return this.http.get<any>(`${this.API}/payments/patient/${patientUserId}/history`)
      .pipe(map(r => r.data || []), catchError(() => []));
  }

  // ── Error handler ─────────────────────────────────────────────────────────

  private handleError(err: HttpErrorResponse): Observable<never> {
    let msg = 'Something went wrong. Please try again.';
    if (err.error?.data && typeof err.error.data === 'object') {
      msg = Object.values(err.error.data).join(' | ');
    } else if (err.error?.message) {
      msg = err.error.message;
    }
    return throwError(() => new Error(msg));
  }
}
