import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { NurseService } from '../../../services/nurse.service';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-nurse-compliance',
  templateUrl: './nurse-compliance.component.html',
  styleUrls: ['./nurse-compliance.component.css']
})
export class NurseComplianceComponent implements OnInit, OnDestroy {

  unreadCount = 0;
  private notifSub!: Subscription;
  private nurseUserId!: number;

  isLoading = true;
  records:   any[] = [];

  activeTab = 'All';
  tabs      = ['All', 'PENDING', 'NON_COMPLIANT', 'SUBMITTED', 'COMPLIANT'];
  tabLabels: Record<string, string> = {
    All: 'All', PENDING: 'Pending', NON_COMPLIANT: 'Overdue',
    SUBMITTED: 'Submitted', COMPLIANT: 'Compliant'
  };

  // Submit modal state
  submitting:    any = null;
  submitNote     = '';
  submitFile:    File | null = null;
  submitFileName = '';
  isSubmitting   = false;
  submitError    = '';
  submitSuccess  = '';

  constructor(
    private auth:         AuthService,
    private nurseService: NurseService,
    private notifService: NotificationService
  ) {}

  ngOnInit(): void {
    this.nurseUserId = this.auth.getUserId()!;
    this.notifSub = this.notifService.unreadCount$.subscribe(n => this.unreadCount = n);
    this.loadRecords();
  }

  ngOnDestroy(): void {
    this.notifSub?.unsubscribe();
  }

  loadRecords(): void {
    this.isLoading = true;
    this.nurseService.getMyCompliance(this.nurseUserId).subscribe({
      next: (data) => { this.records = data || []; this.isLoading = false; },
      error: ()     => { this.isLoading = false; }
    });
  }

  get filteredRecords(): any[] {
    return this.activeTab === 'All'
      ? this.records
      : this.records.filter(r => r.status === this.activeTab);
  }

  countByStatus(status: string): number {
    return this.records.filter(r => r.status === status).length;
  }

  openSubmit(rec: any): void {
    this.submitting    = rec;
    this.submitNote    = '';
    this.submitFile    = null;
    this.submitFileName = '';
    this.submitError   = '';
    this.submitSuccess  = '';
  }

  closeSubmit(): void {
    this.submitting = null;
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.submitFile     = input.files[0];
      this.submitFileName = input.files[0].name;
    }
  }

  removeFile(): void {
    this.submitFile     = null;
    this.submitFileName = '';
  }

  onSubmit(): void {
    if (!this.submitting) return;
    this.isSubmitting = true;
    this.submitError  = '';

    this.nurseService.submitCompliance(
      this.submitting.id, this.nurseUserId, this.submitNote,
      this.submitFile ?? undefined
    ).subscribe({
      next: (updated) => {
        const rec = this.records.find(r => r.id === this.submitting.id);
        if (rec) {
          rec.status        = updated.status;
          rec.submittedNote = updated.submittedNote;
          rec.submittedAt   = updated.submittedAt;
        }
        this.isSubmitting  = false;
        this.submitSuccess = 'Documents submitted successfully!';
        setTimeout(() => { this.submitting = null; this.submitSuccess = ''; }, 2000);
      },
      error: (err: Error) => {
        this.isSubmitting = false;
        this.submitError  = err.message;
      }
    });
  }

  getStatusClass(status: string): string {
    const s = (status ?? '').toUpperCase();
    return s === 'COMPLIANT'     ? 'badge-compliant'
         : s === 'NON_COMPLIANT' ? 'badge-noncompliant'
         : s === 'SUBMITTED'     ? 'badge-submitted'
         : 'badge-pending';
  }

  canSubmit(rec: any): boolean {
    const s = (rec.status ?? '').toUpperCase();
    return s === 'PENDING' || s === 'NON_COMPLIANT';
  }

  formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  isOverdue(dueDate: string): boolean {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  }

  logout(): void { this.auth.logout(); }
}
