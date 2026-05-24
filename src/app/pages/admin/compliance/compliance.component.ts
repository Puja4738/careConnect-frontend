import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AdminService } from '../../../services/admin.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-compliance',
  templateUrl: './compliance.component.html',
  styleUrls: ['./compliance.component.css']
})
export class ComplianceComponent implements OnInit {

  activeTab = 'All';
  tabs       = ['All', 'COMPLIANT', 'SUBMITTED', 'PENDING', 'NON_COMPLIANT'];
  tabLabels: Record<string, string> = {
    All: 'All', COMPLIANT: 'Compliant', SUBMITTED: 'Submitted',
    PENDING: 'Pending', NON_COMPLIANT: 'Non-Compliant'
  };

  formOpen  = false;
  isSaving  = false;
  formSaved = false;
  errorMsg  = '';

  records:       any[] = [];
  hiredNurses:   any[] = [];
  isLoading      = true;
  nursesLoading  = false;

  complianceForm: FormGroup;

  private orgUserId!: number;

  readonly REQUIREMENT_TYPES = [
    'Annual Health Check', 'BLS Certification', 'CPR Certification',
    'Hepatitis B Vaccination', 'Background Check', 'HIPAA Training',
    'Drug Screening', 'QA Review', 'Continuing Education', 'Competency Assessment'
  ];

  constructor(
    private fb: FormBuilder,
    private adminService: AdminService,
    private auth: AuthService
  ) {
    this.complianceForm = this.fb.group({
      nurseUserId:  [null, Validators.required],
      requirement:  ['', Validators.required],
      dueDate:      ['', Validators.required],
      notes:        ['', Validators.maxLength(200)]
    });
  }

  ngOnInit(): void {
    this.orgUserId = this.auth.getUserId()!;
    this.nursesLoading = true;
    this.adminService.getApprovedNurses(this.orgUserId).subscribe({
      next: (data) => { this.hiredNurses = data || []; this.nursesLoading = false; },
      error: ()     => { this.nursesLoading = false; }
    });
    this.loadRecords();
  }

  loadRecords(): void {
    this.isLoading = true;
    this.adminService.getCompliance(this.orgUserId).subscribe({
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

  onSave(): void {
    if (this.complianceForm.invalid) { this.complianceForm.markAllAsTouched(); return; }

    this.isSaving = true;
    this.errorMsg = '';
    const v = this.complianceForm.value;
    const payload = {
      nurseUserId: Number(v.nurseUserId),
      requirement: v.requirement,
      dueDate:     v.dueDate,
      notes:       v.notes
    };

    this.adminService.createCompliance(this.orgUserId, payload).subscribe({
      next: (created) => {
        this.records.push(created);
        this.formSaved = true;
        this.formOpen  = false;
        this.isSaving  = false;
        this.complianceForm.reset();
        setTimeout(() => this.formSaved = false, 3000);
      },
      error: (err: Error) => {
        this.isSaving = false;
        this.errorMsg = err.message;
      }
    });
  }

  markCompliant(id: number): void {
    this.adminService.markCompliant(id).subscribe({
      next: (updated) => {
        const rec = this.records.find(r => r.id === id);
        if (rec) rec.status = updated?.status ?? 'COMPLIANT';
      }
    });
  }

  deleteRecord(id: number): void {
    this.adminService.deleteCompliance(id).subscribe({
      next: () => { this.records = this.records.filter(r => r.id !== id); }
    });
  }

  getStatusClass(status: string): string {
    const s = (status ?? '').toUpperCase();
    return s === 'COMPLIANT'     ? 'badge-compliant'
         : s === 'NON_COMPLIANT' ? 'badge-noncompliant'
         : s === 'SUBMITTED'     ? 'badge-submitted'
         : 'badge-pending';
  }

  isNonCompliant(status: string): boolean {
    return (status ?? '').toUpperCase() === 'NON_COMPLIANT';
  }

  isSubmitted(status: string): boolean {
    return (status ?? '').toUpperCase() === 'SUBMITTED';
  }

  formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  generateReport(): void {
    const orgName = 'CareConnect Organisation';
    const date    = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const rows    = this.filteredRecords.map(r => `
      <tr>
        <td>${r.nurseName || '—'}</td>
        <td>${r.requirement || '—'}</td>
        <td>${r.dueDate || '—'}</td>
        <td><span style="font-weight:700;color:${r.status === 'COMPLIANT' ? '#276221' : r.status === 'NON_COMPLIANT' ? '#9C0006' : '#9C5700'}">${r.status}</span></td>
        <td>${r.notes || '—'}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Compliance Report — ${date}</title>
<style>
  body{font-family:Arial,sans-serif;margin:30px;color:#1a1a2e;}
  h1{color:#1F3864;font-size:18pt;border-bottom:3px solid #1F3864;padding-bottom:8px;}
  .meta{color:#666;font-size:10pt;margin-bottom:20px;}
  table{width:100%;border-collapse:collapse;font-size:10pt;}
  th{background:#1F3864;color:white;padding:8px 10px;text-align:left;}
  td{border:1px solid #ccc;padding:6px 10px;vertical-align:top;}
  tr:nth-child(even){background:#f5f8ff;}
  .footer{text-align:center;margin-top:20px;font-size:9pt;color:#888;border-top:1px solid #ddd;padding-top:10px;}
</style></head><body>
<h1>Compliance Report</h1>
<div class="meta">${orgName} &nbsp;|&nbsp; Generated: ${date} &nbsp;|&nbsp; Total Records: ${this.filteredRecords.length}</div>
<table>
  <tr><th>Nurse Name</th><th>Requirement</th><th>Due Date</th><th>Status</th><th>Notes / CAP</th></tr>
  ${rows}
</table>
<div class="footer">CareConnect — Compliance & Quality Assurance Report</div>
</body></html>`;

    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  }

  logout(): void { this.auth.logout(); }
}
