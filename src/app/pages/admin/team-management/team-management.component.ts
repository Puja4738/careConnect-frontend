import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { capName } from '../../../utils/name.util';
import { forkJoin } from 'rxjs';
import { AdminService } from '../../../services/admin.service';
import { AuthService } from '../../../services/auth.service';
import { TrainingService } from '../../../services/training.service';
import { PaymentService } from '../../../services/payment.service';

@Component({
  selector: 'app-team-management',
  templateUrl: './team-management.component.html',
  styleUrls: ['./team-management.component.css']
})
export class TeamManagementComponent implements OnInit {

  isLoading     = true;
  addOpen       = false;
  addMode: 'doctor' | 'staff' | null = null;
  isSaving      = false;
  successMsg    = '';
  errorMsg      = '';

  approvedNurses: any[] = [];
  teamMembers:    any[] = [];

  memberForm: FormGroup;
  private orgUserId!: number;

  readonly DOCTOR_ROLES = [
    'Doctor', 'Senior Consultant', 'Junior Doctor', 'Resident Doctor',
    'Specialist', 'Medical Officer', 'Head of Department'
  ];

  readonly ADMIN_ROLES = [
    'Hospital Administrator', 'HR Manager', 'Operations Manager',
    'Compliance Officer', 'Finance Manager', 'Nursing Supervisor', 'Support Staff'
  ];

  get activeRoles(): string[] {
    return this.addMode === 'doctor' ? this.DOCTOR_ROLES : this.ADMIN_ROLES;
  }

  get doctorMembers(): any[] {
    return this.teamMembers.filter(m => this.DOCTOR_ROLES.includes(m.role));
  }

  get staffMembers(): any[] {
    return this.teamMembers.filter(m => !this.DOCTOR_ROLES.includes(m.role));
  }

  // ── Doctor-specific dropdowns ──────────────────────────────────────────────
  readonly DOCTOR_DEPARTMENTS = [
    'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Emergency',
    'Radiology', 'Pathology', 'Oncology', 'Dermatology', 'Psychiatry',
    'General Medicine', 'Surgery', 'Gynecology', 'ENT', 'Ophthalmology',
    'Anesthesiology', 'Nephrology', 'Gastroenterology', 'Pulmonology', 'Endocrinology'
  ];

  readonly DOCTOR_DESIGNATIONS = [
    'Head of Department', 'Senior Consultant', 'Consultant',
    'Associate Consultant', 'Medical Officer', 'Junior Doctor', 'Resident Doctor'
  ];

  readonly DOCTOR_QUALIFICATIONS = [
    'MBBS', 'MBBS MD', 'MBBS MS', 'MD', 'MS', 'MCh', 'DM',
    'BDS', 'MDS', 'BPT', 'MPT', 'DNB', 'FRCS', 'MRCP', 'Other'
  ];

  // ── Staff-specific dropdowns ───────────────────────────────────────────────
  readonly STAFF_DEPARTMENTS = [
    'Administration', 'Human Resources', 'Finance & Accounts',
    'Operations', 'IT & Systems', 'Housekeeping', 'Security',
    'Medical Records', 'Supply Chain', 'Legal & Compliance'
  ];

  readonly STAFF_DESIGNATIONS = [
    'Senior Manager', 'Manager', 'Assistant Manager', 'Supervisor',
    'Team Lead', 'Executive', 'Senior Executive', 'Coordinator',
    'Assistant', 'Officer', 'Staff'
  ];

  readonly STAFF_QUALIFICATIONS = [
    'MBA', 'BBA', 'B.Com', 'M.Com', 'BCA', 'MCA', 'B.Tech', 'M.Tech',
    'Diploma', 'Graduate', 'Post Graduate', 'Other'
  ];

  // ── Mode-aware getters ─────────────────────────────────────────────────────
  get activeDepartments(): string[] {
    return this.addMode === 'doctor' ? this.DOCTOR_DEPARTMENTS : this.STAFF_DEPARTMENTS;
  }

  get activeDesignations(): string[] {
    return this.addMode === 'doctor' ? this.DOCTOR_DESIGNATIONS : this.STAFF_DESIGNATIONS;
  }

  get activeQualifications(): string[] {
    return this.addMode === 'doctor' ? this.DOCTOR_QUALIFICATIONS : this.STAFF_QUALIFICATIONS;
  }

  // Today's date string for join date max, and org establishment min
  readonly today = new Date().toISOString().split('T')[0];
  orgJoinDateMin = '';   // set after org profile loads: 'YYYY-MM-01'

  // Pay Salary modal
  payNurse:            any    = null;
  payMonth             = '';
  payBase              = '';
  payHRA               = '';
  payTravel            = '';
  payOther             = '';
  payMethod            = 'BANK_TRANSFER';
  isSalaryProcessing   = false;
  salaryError          = '';
  salarySuccess        = '';
  alreadyPaidWarning   = '';

  // "nurseId-MonthLabel" → already paid this month
  paidMonths = new Set<string>();

  // Salary slip live calculations
  get slipGross():    number { return (+this.payBase||0) + (+this.payHRA||0) + (+this.payTravel||0) + (+this.payOther||0); }
  get slipTDS():      number { return Math.round(this.slipGross * 0.10); }
  get slipPF():       number { return Math.round((+this.payBase||0) * 0.12); }
  get slipESI():      number { return this.slipGross <= 21000 ? Math.round(this.slipGross * 0.0075) : 0; }
  get slipPT():       number { return 200; }
  get slipTotalDed(): number { return this.slipTDS + this.slipPF + this.slipESI + this.slipPT; }
  get slipNetPay():   number { return this.slipGross - this.slipTotalDed; }

  readonly COUNTRY_CODES = [
    { label: '+91  India',      code: '+91'  },
    { label: '+1   USA/Canada', code: '+1'   },
    { label: '+44  UK',         code: '+44'  },
    { label: '+61  Australia',  code: '+61'  },
    { label: '+971 UAE',        code: '+971' },
    { label: '+65  Singapore',  code: '+65'  },
    { label: '+49  Germany',    code: '+49'  },
    { label: '+33  France',     code: '+33'  },
  ];

  // ── Mandatory Training Management ─────────────────────────────────────────
  orgCourses:       any[]    = [];
  courseFormOpen    = false;
  isSavingCourse    = false;
  courseSuccessMsg  = '';
  courseErrorMsg    = '';
  courseForm!: FormGroup;

  readonly COURSE_CATEGORIES = ['Critical Care', 'Emergency', 'Pediatric', 'Compliance', 'Leadership', 'General'];
  readonly CEU_OPTIONS       = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20];

  readonly PREDEFINED_COURSES = [
    { title: 'HIPAA Compliance & Privacy',               category: 'Compliance',   credits: 2  },
    { title: 'BLS Recertification',                      category: 'Emergency',    credits: 4  },
    { title: 'CPR Certification',                        category: 'Emergency',    credits: 3  },
    { title: 'Advanced Cardiac Life Support (ACLS)',     category: 'Critical Care',credits: 8  },
    { title: 'Infection Control & Prevention',           category: 'Compliance',   credits: 3  },
    { title: 'Medication Administration Safety',         category: 'General',      credits: 3  },
    { title: 'Wound Care & Dressing Management',         category: 'General',      credits: 4  },
    { title: 'Pediatric Advanced Life Support (PALS)',   category: 'Pediatric',    credits: 8  },
    { title: 'Neonatal Resuscitation Program (NRP)',     category: 'Pediatric',    credits: 6  },
    { title: 'Critical Care Ventilator Management',      category: 'Critical Care',credits: 10 },
    { title: 'Stroke Recognition & Emergency Response',  category: 'Emergency',    credits: 5  },
    { title: 'Dementia & Elderly Care Protocols',        category: 'General',      credits: 6  },
    { title: 'Drug Screening & Substance Abuse Policy',  category: 'Compliance',   credits: 2  },
    { title: 'Patient Safety & Fall Prevention',         category: 'General',      credits: 3  },
    { title: 'Nurse Leadership & Team Management',       category: 'Leadership',   credits: 6  },
    { title: 'Hepatitis B & Blood-Borne Pathogens',     category: 'Compliance',   credits: 2  },
    { title: 'IV Therapy & Venipuncture',                category: 'General',      credits: 5  },
    { title: 'Mental Health First Aid',                  category: 'General',      credits: 4  },
    { title: 'Fire Safety & Emergency Evacuation',       category: 'Compliance',   credits: 2  },
    { title: 'Trauma Nursing Core Course (TNCC)',        category: 'Emergency',    credits: 12 },
  ];

  constructor(
    private fb: FormBuilder,
    private adminService: AdminService,
    private auth: AuthService,
    private trainingSvc: TrainingService,
    private paymentSvc: PaymentService
  ) {
    this.memberForm = this.fb.group({
      firstName:       ['', [Validators.required, Validators.minLength(3), Validators.maxLength(30),
                             Validators.pattern('^[A-Za-z]+$')]],
      middleName:      ['', [Validators.maxLength(30), Validators.pattern('^[A-Za-z]*$')]],
      lastName:        ['', [Validators.required, Validators.minLength(3), Validators.maxLength(30),
                             Validators.pattern('^[A-Za-z.]+$')]],
      role:            ['', Validators.required],
      department:      [''],
      designation:     [''],
      qualification:   [''],
      email:           ['', [Validators.required,
                             Validators.pattern('^[a-zA-Z0-9._%+\\-]+@(gmail|yahoo|outlook|infosys)\\.(com|in|org)$')]],
      phoneCountryCode:['+91'],
      phone:           ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      joinDate:        ['', [Validators.required, (c: AbstractControl) => {
        if (!c.value) return null;
        if (c.value > new Date().toISOString().split('T')[0]) return { futureDate: true };
        if (this.orgJoinDateMin && c.value < this.orgJoinDateMin) return { beforeEstablishment: true };
        return null;
      }]]
    });
  }

  ngOnInit(): void {
    this.orgUserId = this.auth.getUserId()!;
    this.courseForm = this.fb.group({
      title:        ['', Validators.required],
      description:  ['', [Validators.minLength(10), Validators.maxLength(150)]],
      category:     ['', Validators.required],
      creditPoints: [1, Validators.required],
      mandatory:    [true]
    });
    this.loadAll();

    // Load org establishment date to set joinDate minimum
    this.adminService.getOrgProfile(this.orgUserId).subscribe({
      next: (data) => {
        if (data?.establishedYear && data?.establishedMonth) {
          const m = String(data.establishedMonth).padStart(2, '0');
          this.orgJoinDateMin = `${data.establishedYear}-${m}-01`;
        }
      }
    });
  }

  loadAll(): void {
    this.isLoading = true;
    forkJoin({
      nurses:   this.adminService.getApprovedNurses(this.orgUserId),
      team:     this.adminService.getTeamMembers(this.orgUserId),
      courses:  this.trainingSvc.getOrgCourses(this.orgUserId),
      salaries: this.paymentSvc.getOrgSalaryHistory(this.orgUserId)
    }).subscribe({
      next: ({ nurses, team, courses, salaries }) => {
        this.approvedNurses = nurses  || [];
        this.teamMembers    = team    || [];
        this.orgCourses     = courses || [];
        this.buildPaidMonths(salaries || []);
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  private buildPaidMonths(salaries: any[]): void {
    this.paidMonths = new Set(
      salaries.map(s => `${s.nurseId}-${s.salaryMonth}`)
    );
  }

  onCourseSelect(): void {
    const title    = this.courseForm.get('title')?.value;
    const selected = this.PREDEFINED_COURSES.find(c => c.title === title);
    if (selected) {
      this.courseForm.patchValue({ category: selected.category, creditPoints: selected.credits });
    }
  }

  get descLen(): number { return (this.courseForm.get('description')?.value || '').length; }

  addCourse(): void {
    if (this.courseForm.invalid) { this.courseForm.markAllAsTouched(); return; }
    this.isSavingCourse = true;
    this.courseErrorMsg = '';
    this.trainingSvc.addOrgCourse(this.orgUserId, this.courseForm.value).subscribe({
      next: (course) => {
        this.orgCourses.push(course);
        this.isSavingCourse   = false;
        this.courseFormOpen   = false;
        this.courseSuccessMsg = 'Course added! Nurses can now see it in their Training page.';
        this.courseForm.reset({ mandatory: true, creditPoints: 1 });
        setTimeout(() => this.courseSuccessMsg = '', 4000);
      },
      error: (err: Error) => { this.courseErrorMsg = err.message; this.isSavingCourse = false; }
    });
  }

  deleteCourse(id: number): void {
    this.trainingSvc.deleteOrgCourse(this.orgUserId, id).subscribe({
      next: () => { this.orgCourses = this.orgCourses.filter(c => c.id !== id); }
    });
  }

  get f() { return this.memberForm.controls; }

  onAdd(): void {
    if (this.memberForm.invalid) { this.memberForm.markAllAsTouched(); return; }

    this.isSaving = true;
    this.errorMsg = '';

    const v = this.memberForm.value;
    const fullName = [capName(v.firstName), capName(v.middleName), capName(v.lastName)]
                     .filter(Boolean).join(' ');
    const payload = {
      name:          fullName,
      role:          v.role,
      department:    v.department  || null,
      designation:   v.designation || null,
      qualification: v.qualification || null,
      email:         v.email.trim().toLowerCase(),
      phone:         (v.phoneCountryCode || '+91') + v.phone,
      joinDate:      v.joinDate,
    };

    this.adminService.addTeamMember(this.orgUserId, payload).subscribe({
      next: (member) => {
        this.teamMembers.push(member);
        this.isSaving  = false;
        this.addOpen   = false;
        this.addMode   = null;
        this.successMsg = 'Team member added successfully!';
        this.memberForm.reset({ phoneCountryCode: '+91' });
        setTimeout(() => this.successMsg = '', 3000);
      },
      error: (err: Error) => {
        this.isSaving = false;
        this.errorMsg = err.message;
      }
    });
  }

  toggleStatus(member: any): void {
    this.adminService.toggleTeamMemberStatus(member.id).subscribe({
      next: (updated) => { member.status = updated.status; }
    });
  }

  deleteMember(id: number): void {
    this.adminService.deleteTeamMember(id).subscribe({
      next: () => { this.teamMembers = this.teamMembers.filter(m => m.id !== id); }
    });
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  }

  // ── Pay Salary ────────────────────────────────────────────────────────────

  openPayModal(nurse: any): void {
    this.payNurse            = nurse;
    this.payMonth            = '';
    this.payBase             = nurse.jobSalaryMin ? String(nurse.jobSalaryMin) : '';
    this.payHRA              = '';
    this.payTravel           = '';
    this.payOther            = '';
    this.payMethod           = 'BANK_TRANSFER';
    this.salaryError         = '';
    this.salarySuccess       = '';
    this.alreadyPaidWarning  = '';
    this.isSalaryProcessing  = false;
  }

  closePayModal(): void { this.payNurse = null; }

  private monthLabel(yyyyMM: string): string {
    return new Date(yyyyMM + '-01')
      .toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }

  checkAlreadyPaid(): void {
    this.alreadyPaidWarning = '';
    if (!this.payMonth || !this.payNurse) return;
    const key = `${this.payNurse.nurseId}-${this.monthLabel(this.payMonth)}`;
    if (this.paidMonths.has(key)) {
      this.alreadyPaidWarning =
        `${this.payNurse.nurseName} has already been paid for ${this.monthLabel(this.payMonth)}. Duplicate payment is not allowed.`;
    }
  }

  processSalary(): void {
    if (!this.payMonth || !this.payBase) {
      this.salaryError = 'Month and base salary are required.'; return;
    }
    if (this.slipNetPay <= 0) {
      this.salaryError = 'Net pay is zero or negative. Please review the salary inputs.'; return;
    }
    this.isSalaryProcessing = true;
    this.salaryError        = '';

    // Format "YYYY-MM" → "May 2026"
    const monthLabel = new Date(this.payMonth + '-01')
      .toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    this.paymentSvc.processMonthlySalary(this.orgUserId, {
      nurseUserId:      this.payNurse.nurseUserId,
      salaryMonth:      monthLabel,
      baseSalary:       +this.payBase,
      hra:              this.payHRA    ? +this.payHRA    : undefined,
      travelAllowance:  this.payTravel ? +this.payTravel : undefined,
      otherAllowances:  this.payOther  ? +this.payOther  : undefined,
      professionalTax:  this.slipPT,
      paymentMethod:    this.payMethod,
    }).subscribe({
      next: () => {
        // Mark this month as paid immediately so re-opening blocks it
        this.paidMonths.add(`${this.payNurse.nurseId}-${monthLabel}`);
        this.isSalaryProcessing = false;
        this.salarySuccess = `Salary of ₹${this.slipNetPay.toLocaleString('en-IN')} processed for ${this.payNurse.nurseName}!`;
        setTimeout(() => this.closePayModal(), 2500);
      },
      error: (err: Error) => {
        this.salaryError        = err.message;
        this.isSalaryProcessing = false;
      }
    });
  }

  logout(): void { this.auth.logout(); }
}
