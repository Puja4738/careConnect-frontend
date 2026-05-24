import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AdminService } from '../../../services/admin.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {

  org: any = null;
  isLoadingOrg = true;

  // Edit form
  editOpen  = false;
  isSaving  = false;
  saveError = '';
  editForm!: FormGroup;

  readonly ACCREDITATION_OPTIONS = [
    'NABH Accredited', 'NABL Accredited', 'JCI Accredited',
    'ISO 9001:2015', 'ISO 13485:2016', 'AHPI Certified',
    'QAI Accredited', 'CRISIL Rated', 'Other'
  ];

  readonly DESIGNATION_OPTIONS = [
    'Hospital Administrator', 'Medical Director', 'Chief Executive Officer (CEO)',
    'Chief Operating Officer (COO)', 'Head of Nursing', 'Facility Manager',
    'HR Manager', 'Operations Manager', 'Deputy Administrator', 'Other'
  ];

  readonly currentYear = new Date().getFullYear();

  readonly MONTHS = [
    { value: '1',  label: 'January' },  { value: '2',  label: 'February' },
    { value: '3',  label: 'March' },    { value: '4',  label: 'April' },
    { value: '5',  label: 'May' },      { value: '6',  label: 'June' },
    { value: '7',  label: 'July' },     { value: '8',  label: 'August' },
    { value: '9',  label: 'September' },{ value: '10', label: 'October' },
    { value: '11', label: 'November' }, { value: '12', label: 'December' },
  ];

  readonly COUNTRY_CODES = [
    { label: '+91  India',      code: '+91'  },
    { label: '+1   USA/Canada', code: '+1'   },
    { label: '+44  UK',         code: '+44'  },
    { label: '+61  Australia',  code: '+61'  },
    { label: '+971 UAE',        code: '+971' },
    { label: '+65  Singapore',  code: '+65'  },
    { label: '+49  Germany',    code: '+49'  },
    { label: '+1   Canada',     code: '+1'   },
  ];

  readonly SPECIALIZATION_OPTIONS = [
    'Cardiology', 'Neurology', 'Oncology', 'Orthopaedics', 'Paediatrics',
    'Gynaecology', 'Dermatology', 'Psychiatry', 'Ophthalmology', 'ENT',
    'Nephrology', 'Gastroenterology', 'Urology', 'Pulmonology', 'Endocrinology',
    'General Medicine', 'General Surgery', 'Emergency Medicine', 'Radiology', 'Pathology'
  ];
  selectedSpecs: Set<string> = new Set();

  stats = [
    { icon: 'bi-people-fill',      color: 'si-blue',   value: '—', label: 'Total Nurses'         },
    { icon: 'bi-briefcase-fill',   color: 'si-green',  value: '—', label: 'Active Job Posts'     },
    { icon: 'bi-file-person-fill', color: 'si-amber',  value: '—', label: 'Pending Applications' },
    { icon: 'bi-person-check-fill',color: 'si-purple', value: '—', label: 'Hires This Month'     }
  ];

  recentApplications: any[] = [];
  recentActivity:     any[] = [];
  isLoadingApps = true;

  constructor(
    private fb: FormBuilder,
    private adminService: AdminService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    const userId = this.auth.getUserId();
    if (!userId) return;

    this.adminService.getOrgProfile(userId).subscribe({
      next: (data) => {
        // Map backend field names (orgName, orgType) to what the template expects
        this.org = {
          name:          data.orgName        || '—',
          type:          data.orgType        || '—',
          regNumber:     data.regNumber      || '—',
          licenseNumber: data.licenseNumber  || '—',
          contactPerson: data.contactPerson  || '—',
          designation:   data.designation   || '—',
          email:         this.auth.getUser()?.email || '—',
          phone:         data.phone         || '—',
          addressLine1:  data.addressLine1   || data.address || '—',
          addressLine2:  data.addressLine2   || '',
          landmark:      data.landmark       || '',
          country:       data.country        || 'India',
          city:          data.city           || '—',
          state:         data.state          || '—',
          pincode:       data.pincode        || '—',
          website:       data.website        || '—',
          contact2FirstName:   data.contact2FirstName   || '',
          contact2MiddleName:  data.contact2MiddleName  || '',
          contact2LastName:    data.contact2LastName    || '',
          contact2Email:       data.contact2Email       || '',
          contact2Phone:       data.contact2Phone       || '',
          contact2Designation: data.contact2Designation || '',
          verifiedByAdmin:  !!data.verifiedByAdmin,
          status:           'Active',
          accreditation:    data.accreditation || '—',
          established:      data.establishedYear ? String(data.establishedYear) : '—',
          establishedYear:  data.establishedYear  || null,
          establishedMonth: data.establishedMonth || null,
          bedCapacity:      data.bedCapacity  || '—',
          specializations: data.specializations
                             ? data.specializations.split(',').map((s: string) => s.trim()).filter((s: string) => s)
                             : []
        };
        this.isLoadingOrg = false;
      },
      error: () => { this.isLoadingOrg = false; }
    });

    this.adminService.getDashboardStats(userId).subscribe({
      next: (data) => {
        if (data) {
          this.stats[0].value = String(data.hiredNurses          ?? '0');
          this.stats[1].value = String(data.activeJobs           ?? '0');
          this.stats[2].value = String(data.pendingApplications  ?? '0');
          this.stats[3].value = String(data.approvedApplications ?? '0');
        }
      },
      error: () => {}
    });

    this.adminService.getOrgApplications(userId).subscribe({
      next: (apps) => {
        const list = apps || [];

        this.recentApplications = list.slice(0, 5).map(a => ({
          name:       a.nurseName,
          role:       a.jobTitle,
          experience: a.nurseExperience != null ? a.nurseExperience + ' yrs' : '—',
          date:       a.appliedAt,
          status:     a.status
        }));

        // Build activity feed from applications sorted newest-first
        this.recentActivity = [...list]
          .sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime())
          .slice(0, 6)
          .map(a => {
            const s = (a.status ?? '').toUpperCase();
            return {
              icon:  s === 'APPROVED' ? 'bi-person-check-fill'
                   : s === 'REJECTED' ? 'bi-x-circle-fill'
                   : 'bi-file-person-fill',
              color: s === 'APPROVED' ? 'act-green'
                   : s === 'REJECTED' ? 'act-red'
                   : 'act-blue',
              text:  s === 'APPROVED'
                   ? `${a.nurseName} approved for ${a.jobTitle}`
                   : s === 'REJECTED'
                   ? `${a.nurseName} application rejected`
                   : `New application from ${a.nurseName} for ${a.jobTitle}`,
              time: this.timeAgo(a.appliedAt)
            };
          });

        this.isLoadingApps = false;
      },
      error: () => { this.isLoadingApps = false; }
    });
  }

  // ── Edit profile ────────────────────────────────────────────────

  openEditForm(): void {
    const v = (field: string) => this.org[field] === '—' ? '' : (this.org[field] || '');
    this.editForm = this.fb.group({
      // ── Non-editable (locked) ──
      orgName:       [{ value: this.org.name,    disabled: true }],
      orgType:       [{ value: this.org.type,    disabled: true }],
      licenseNumber: [{ value: v('licenseNumber'), disabled: true }],
      addressLine1:  [{ value: v('addressLine1'),  disabled: true }],
      addressLine2:  [{ value: this.org.addressLine2, disabled: true }],
      landmark:      [{ value: this.org.landmark,     disabled: true }],
      city:          [{ value: this.org.city,    disabled: true }],
      state:         [{ value: this.org.state,   disabled: true }],
      pincode:       [{ value: this.org.pincode, disabled: true }],

      // ── Editable ──
      contactPerson: [{ value: this.org.contactPerson, disabled: true }],
      designation:   [{ value: this.org.designation,   disabled: true }],
      phone:         [{ value: this.org.phone,          disabled: true }],
      website:          [v('website'), [Validators.pattern('^(https?://)?(www\\.)?[a-zA-Z0-9][a-zA-Z0-9\\-]+(\\.(com|in|org|gov\\.in))(/[^\\s]*)?$')]],
      bedCapacity:      [v('bedCapacity'),  [Validators.min(1), Validators.max(10000)]],
      accreditation:    [v('accreditation')],
      establishedMonth: [this.org.establishedMonth ? String(this.org.establishedMonth) : ''],
      establishedYear:  [this.org.establishedYear  ? String(this.org.establishedYear)  : '',
                         [Validators.min(1900), Validators.max(this.currentYear)]],

      // ── Second Contact (all optional) ──
      c2FirstName:   [this.org.contact2FirstName,
                      [Validators.minLength(3), Validators.maxLength(30), Validators.pattern('^[A-Za-z]+$')]],
      c2MiddleName:  [this.org.contact2MiddleName,
                      [Validators.maxLength(30), Validators.pattern('^[A-Za-z]*$')]],
      c2LastName:    [this.org.contact2LastName,
                      [Validators.minLength(3), Validators.maxLength(30), Validators.pattern('^[A-Za-z.]+$')]],
      c2Designation: [this.org.contact2Designation],
      c2Email:       [this.org.contact2Email,
                      [Validators.pattern('^[a-zA-Z0-9._%+\\-]+@(gmail|yahoo|outlook|infosys)\\.(com|in|org)$')]],
      c2PhoneCode:   [this.org.contact2Phone?.startsWith('+') ? this.org.contact2Phone.substring(0, this.org.contact2Phone.indexOf(' ') > 0 ? this.org.contact2Phone.indexOf(' ') : 3) : '+91'],
      c2Phone:       [this.org.contact2Phone?.replace(/^\+\d{1,4}\s?/, '') || '',
                      [Validators.pattern('^[6-9][0-9]{9}$')]],
    });

    // Pre-select existing specializations
    this.selectedSpecs = new Set(
      (this.org.specializations as string[]).filter((s: string) => s.trim())
    );

    this.saveError = '';
    this.editOpen  = true;
  }

  // ── Key helpers ────────────────────────────────────────────────
  blockNonLetter(e: KeyboardEvent): void {
    const nav = ['Backspace','Delete','Tab','ArrowLeft','ArrowRight','Home','End'];
    if (nav.includes(e.key)) return;
    if (!/^[A-Za-z]$/.test(e.key)) e.preventDefault();
  }

  blockNonLetterOrDot(e: KeyboardEvent): void {
    const nav = ['Backspace','Delete','Tab','ArrowLeft','ArrowRight','Home','End'];
    if (nav.includes(e.key)) return;
    if (!/^[A-Za-z.]$/.test(e.key)) e.preventDefault();
  }

  blockNonDigit(e: KeyboardEvent): void {
    const nav = ['Backspace','Delete','Tab','ArrowLeft','ArrowRight','Home','End'];
    if (nav.includes(e.key)) return;
    if (!/^[0-9]$/.test(e.key)) e.preventDefault();
  }

  capitalizeFirstField(fieldName: string): void {
    const ctrl = this.editForm?.get(fieldName);
    if (!ctrl) return;
    const v: string = ctrl.value || '';
    if (v.length > 0 && v[0] !== v[0].toUpperCase()) {
      ctrl.setValue(v[0].toUpperCase() + v.slice(1), { emitEvent: false });
    }
  }

  onC2PhoneCodeChange(code: string): void {
    const ctrl = this.editForm?.get('c2Phone');
    if (!ctrl) return;
    ctrl.setValidators(code === '+91'
      ? [Validators.pattern('^[6-9][0-9]{9}$')]
      : [Validators.pattern('^[0-9]{6,15}$')]);
    ctrl.updateValueAndValidity({ emitEvent: false });
  }

  toggleSpec(spec: string): void {
    this.selectedSpecs.has(spec) ? this.selectedSpecs.delete(spec) : this.selectedSpecs.add(spec);
  }

  onSave(): void {
    if (this.editForm.invalid) { this.editForm.markAllAsTouched(); return; }

    const userId = this.auth.getUserId();
    if (!userId) return;

    this.isSaving  = true;
    this.saveError = '';

    const raw = this.editForm.getRawValue();
    const payload = {
      orgName:             raw.orgName,
      orgType:             raw.orgType,
      licenseNumber:       raw.licenseNumber,
      contactPerson:       raw.contactPerson,
      designation:         raw.designation,
      phone:               raw.phone,
      addressLine1:        raw.addressLine1,
      addressLine2:        raw.addressLine2,
      landmark:            raw.landmark,
      country:             'India',
      city:                raw.city,
      state:               raw.state,
      pincode:             raw.pincode,
      website:             raw.website       || '',
      bedCapacity:         raw.bedCapacity   ? Number(raw.bedCapacity) : null,
      accreditation:       raw.accreditation || '',
      establishedYear:     raw.establishedYear  ? Number(raw.establishedYear)  : null,
      establishedMonth:    raw.establishedMonth ? Number(raw.establishedMonth) : null,
      specializations:     Array.from(this.selectedSpecs).join(','),
      contact2FirstName:   raw.c2FirstName   || '',
      contact2MiddleName:  raw.c2MiddleName  || '',
      contact2LastName:    raw.c2LastName    || '',
      contact2Designation: raw.c2Designation || '',
      contact2Email:       raw.c2Email       || '',
      contact2Phone:       raw.c2Phone ? (raw.c2PhoneCode || '+91') + raw.c2Phone : '',
    };

    this.adminService.updateOrgProfile(userId, payload).subscribe({
      next: () => {
        this.org = {
          ...this.org,
          contactPerson:       raw.contactPerson,
          designation:         raw.designation,
          phone:               raw.phone,
          website:             raw.website      || '—',
          bedCapacity:         raw.bedCapacity  || '—',
          accreditation:       raw.accreditation || '—',
          established:         raw.establishedYear ? String(raw.establishedYear) : '—',
          establishedYear:     raw.establishedYear  ? Number(raw.establishedYear)  : null,
          establishedMonth:    raw.establishedMonth ? Number(raw.establishedMonth) : null,
          specializations:     Array.from(this.selectedSpecs),
          contact2FirstName:   raw.c2FirstName   || '',
          contact2MiddleName:  raw.c2MiddleName  || '',
          contact2LastName:    raw.c2LastName    || '',
          contact2Designation: raw.c2Designation || '',
          contact2Email:       raw.c2Email || '',
          contact2Phone:       raw.c2Phone ? (raw.c2PhoneCode || '+91') + raw.c2Phone : '',
        };
        this.isSaving = false;
        this.editOpen = false;
      },
      error: (err: Error) => {
        this.isSaving  = false;
        this.saveError = err.message;
      }
    });
  }

  getStatusClass(status: string): string {
    const s = (status ?? '').toUpperCase();
    return s === 'APPROVED' ? 'badge-approved'
         : s === 'REJECTED' ? 'badge-rejected'
         : 'badge-pending';
  }

  timeAgo(dateStr: string): string {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins < 1)   return 'just now';
    if (mins < 60)  return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }
  logout(): void { this.auth.logout(); }
}
