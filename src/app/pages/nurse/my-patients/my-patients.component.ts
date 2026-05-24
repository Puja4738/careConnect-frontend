import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { AppointmentService } from '../../../services/appointment.service';
import { MessageService } from '../../../services/message.service';
import { ShiftService } from '../../../services/shift.service';
import { NotificationService } from '../../../services/notification.service';
import { MedicalRecordService } from '../../../services/medical-record.service';
import { VitalSignService } from '../../../services/vital-sign.service';
import { CareCoordinationService } from '../../../services/care-coordination.service';

type CareTab = 'records' | 'vitals' | 'notes' | 'careteam' | 'medications';

@Component({
  selector: 'app-my-patients',
  templateUrl: './my-patients.component.html',
  styleUrls: ['./my-patients.component.css']
})
export class MyPatientsComponent implements OnInit, OnDestroy, AfterViewChecked {

  @ViewChild('msgEnd') msgEnd!: ElementRef;

  appointments: any[] = [];
  isLoading    = true;
  activeFilter = 'All';
  filters      = ['All', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED'];
  filterLabels: Record<string, string> = {
    All: 'All', CONFIRMED: 'Confirmed', IN_PROGRESS: 'In Progress', COMPLETED: 'Completed'
  };

  shiftsMap:    Record<number, any[]> = {};
  loadingShifts = new Set<number>();

  totalPending = 0;
  unreadCount  = 0;

  confirmingShiftId: number | null = null;
  rejectingShiftId:  number | null = null;
  shiftActionError   = '';

  // ── Reconciliation ────────────────────────────────────────────────────────
  reconcilingId: number | null = null;
  reconcileError  = '';
  reconcileSuccess: Record<number, boolean> = {};

  needsNurseReconciliation(appt: any): boolean {
    return appt.reconciliationStatus === 'PENDING' || appt.reconciliationStatus === 'PATIENT_CONFIRMED';
  }

  confirmReconciliation(appt: any): void {
    this.reconcilingId  = appt.id;
    this.reconcileError = '';
    this.apptService.reconcileByNurse(appt.id, this.myUserId).subscribe({
      next: (updated: any) => {
        const idx = this.appointments.findIndex((a: any) => a.id === appt.id);
        if (idx !== -1) this.appointments[idx] = { ...this.appointments[idx], ...updated };
        this.reconcilingId = null;
        this.reconcileSuccess[appt.id] = true;
        setTimeout(() => delete this.reconcileSuccess[appt.id], 4000);
      },
      error: (err: Error) => {
        this.reconcileError = err.message;
        this.reconcilingId  = null;
      }
    });
  }

  // ── Care Panel ─────────────────────────────────────────────────────────────
  carePanelPatient: any    = null;
  carePanelTab: CareTab    = 'records';

  // Records
  patientRecords: Record<number, any[]> = {};
  loadingRecords = new Set<number>();

  // Vitals
  patientVitals: Record<number, any[]> = {};
  loadingVitals = new Set<number>();
  vitals = { bloodPressure: '', pulseRate: '', temperature: '', spo2: '', weight: '', notes: '' };
  isSavingVitals = false;
  vitalsError    = '';
  vitalsSuccess  = false;

  // Care Notes
  noteTitle    = '';
  noteContent  = '';
  isSavingNote = false;
  noteError    = '';
  noteSuccess  = false;
  noteRecords: Record<number, any[]> = {};

  // ── Care Team ──────────────────────────────────────────────────────────────
  careTeamMap:       Record<number, any[]> = {};
  orgTeamMembers:    any[] = [];
  isLoadingCareTeam = new Set<number>();
  isAddingMember    = false;
  careTeamError     = '';
  careTeamSuccess   = '';

  providerNotes:       Record<number, any[]> = {};
  noteContent2         = '';
  noteType2            = 'CLINICAL_UPDATE';
  isSavingProvNote     = false;
  provNoteError        = '';
  provNoteSuccess      = false;

  readonly NOTE_TYPES = [
    { value: 'CLINICAL_UPDATE', label: 'Clinical Update' },
    { value: 'REFERRAL',        label: 'Referral'        },
    { value: 'ALERT',           label: 'Alert'           },
    { value: 'FOLLOW_UP',       label: 'Follow-Up Task'  },
  ];

  // ── Medications ───────────────────────────────────────────────────────────
  patientMeds:    Record<number, any[]> = {};
  medName         = '';
  medNameCustom   = '';
  medDosage       = '';
  medFrequency    = '';
  medNotes        = '';
  isSavingMed     = false;
  medError        = '';
  medSuccess      = false;

  readonly MEDICINE_NAMES = [
    'Paracetamol', 'Ibuprofen', 'Aspirin', 'Diclofenac', 'Tramadol',
    'Amoxicillin', 'Azithromycin', 'Ciprofloxacin', 'Metronidazole', 'Doxycycline',
    'Amlodipine', 'Metoprolol', 'Atorvastatin', 'Losartan', 'Enalapril',
    'Clopidogrel', 'Furosemide', 'Digoxin',
    'Metformin', 'Glibenclamide', 'Sitagliptin', 'Insulin (Regular)',
    'Omeprazole', 'Pantoprazole', 'Ondansetron', 'Domperidone',
    'Cetirizine', 'Montelukast', 'Salbutamol',
    'Prednisolone', 'Dexamethasone',
    'Vitamin D3', 'Vitamin B12', 'Folic Acid', 'Iron Supplement', 'Calcium + Vitamin D',
    '__other__'
  ];

  readonly MEDICINE_NAME_LABELS: Record<string, string> = {
    '__other__': 'Other (specify below)'
  };

  getMedicineName(val: string): string {
    return this.MEDICINE_NAME_LABELS[val] ?? val;
  }

  readonly DOSAGE_OPTIONS = [
    '25mg', '50mg', '75mg', '100mg', '125mg', '150mg', '200mg',
    '250mg', '500mg', '650mg', '750mg', '1g', '5ml', '10ml'
  ];

  readonly FREQUENCY_OPTIONS = [
    'Once daily (OD)',
    'Twice daily (BD)',
    'Three times daily (TDS)',
    'Four times daily (QID)',
    'Every 4 hours',
    'Every 6 hours',
    'Every 8 hours',
    'Every 12 hours',
    'Before meals',
    'After meals',
    'At bedtime (HS)',
    'As needed (SOS/PRN)',
    'Once weekly',
    'Alternate days'
  ];

  // ── Care Goals ─────────────────────────────────────────────────────────────
  careGoals:      Record<number, any[]> = {};
  goalText        = '';
  goalTargetDate  = '';
  isSavingGoal    = false;
  goalError       = '';
  goalSuccess     = false;

  readonly GOAL_STATUSES = ['PENDING', 'IN_PROGRESS', 'ACHIEVED'];

  // Chat state
  chatPatient: any   = null;
  messages:    any[] = [];
  newMessage   = '';
  isSending    = false;
  chatError    = '';
  unreadFrom   = new Set<number>();
  private pollTimer?: any;
  private unreadTimer?: any;
  private shouldScroll = false;

  private myUserId!: number;
  private myName!:   string;
  private notifSub!: Subscription;

  constructor(
    private auth:         AuthService,
    private apptService:  AppointmentService,
    private msgSvc:       MessageService,
    private shiftSvc:     ShiftService,
    private notifSvc:     NotificationService,
    private recordSvc:    MedicalRecordService,
    private vitalSvc:     VitalSignService,
    private careSvc:      CareCoordinationService
  ) {}

  ngOnInit(): void {
    const user    = this.auth.getUser();
    this.myUserId = this.auth.getUserId()!;
    this.myName   = user?.fullName || user?.email || 'Nurse';
    this.notifSvc.initSSE(this.myUserId);
    this.notifSub = this.notifSvc.unreadCount$.subscribe(c => this.unreadCount = c);

    this.apptService.getByNurse(this.myUserId).subscribe({
      next: (data) => {
        this.appointments = data || [];
        this.activeAppointments.forEach(a => this.loadShiftsFor(a.id));
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });

    this.refreshUnread();
    this.unreadTimer = setInterval(() => this.refreshUnread(), 10000);
  }

  ngOnDestroy(): void { this.stopPoll(); clearInterval(this.unreadTimer); this.notifSub?.unsubscribe(); }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) { this.scrollToBottom(); this.shouldScroll = false; }
  }

  // ── Appointments ──────────────────────────────────────────────────────────

  get activeAppointments(): any[] {
    const ACTIVE = ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'];
    return this.appointments.filter(a => ACTIVE.includes((a.status || '').toUpperCase()));
  }

  get filteredAppointments(): any[] {
    if (this.activeFilter === 'All') return this.activeAppointments;
    return this.activeAppointments.filter(a => a.status === this.activeFilter);
  }

  get assignedPatients(): any[] {
    const seen = new Set<number>();
    return this.appointments.filter(a => {
      if (seen.has(a.patientId)) return false;
      seen.add(a.patientId);
      return true;
    });
  }

  appointmentsFor(patientId: number): any[] {
    return this.appointments.filter(a =>
      a.patientId === patientId &&
      (this.activeFilter === 'All' || a.status === this.activeFilter)
    );
  }

  hasActiveAppointment(patientId: number): boolean {
    const ACTIVE = ['CONFIRMED', 'IN_PROGRESS'];
    return this.appointments.some(a =>
      a.patientId === patientId && ACTIVE.includes((a.status || '').toUpperCase())
    );
  }

  get filteredPatients(): any[] {
    if (this.activeFilter === 'All') return this.assignedPatients;
    return this.assignedPatients.filter(p => this.appointmentsFor(p.patientId).length > 0);
  }

  // ── Shifts ────────────────────────────────────────────────────────────────

  loadShiftsFor(appointmentId: number): void {
    this.loadingShifts.add(appointmentId);
    this.shiftSvc.getByAppointment(appointmentId).subscribe({
      next: (shifts) => {
        this.shiftsMap[appointmentId] = shifts || [];
        this.loadingShifts.delete(appointmentId);
        this.recalcPending();
      },
      error: () => { this.loadingShifts.delete(appointmentId); }
    });
  }

  private recalcPending(): void {
    let count = 0;
    Object.values(this.shiftsMap).forEach(shifts =>
      shifts.forEach(s => { if (s.status === 'PENDING_CONFIRMATION') count++; })
    );
    this.totalPending = count;
  }

  shiftsFor(appointmentId: number): any[] { return this.shiftsMap[appointmentId] || []; }

  pendingShiftsFor(appointmentId: number): any[] {
    return this.shiftsFor(appointmentId).filter(s => s.status === 'PENDING_CONFIRMATION');
  }

  confirmedShiftsFor(appointmentId: number): any[] {
    return this.shiftsFor(appointmentId).filter(s => s.status === 'CONFIRMED');
  }

  confirmShift(shift: any, acceptNegotiation = false): void {
    this.confirmingShiftId = shift.id;
    this.shiftActionError  = '';
    this.shiftSvc.confirmShift(this.myUserId, shift.id, acceptNegotiation).subscribe({
      next: (updated) => {
        this.updateShiftInMap(shift.appointmentId, updated);
        this.confirmingShiftId = null;
        this.recalcPending();
      },
      error: (err: Error) => {
        this.shiftActionError  = err.message;
        this.confirmingShiftId = null;
      }
    });
  }

  rejectShift(shift: any): void {
    this.rejectingShiftId = shift.id;
    this.shiftActionError = '';
    this.shiftSvc.rejectShift(this.myUserId, shift.id).subscribe({
      next: (updated) => {
        this.updateShiftInMap(shift.appointmentId, updated);
        this.rejectingShiftId = null;
        this.recalcPending();
      },
      error: (err: Error) => {
        this.shiftActionError = err.message;
        this.rejectingShiftId = null;
      }
    });
  }

  private updateShiftInMap(appointmentId: number, updated: any): void {
    const list = this.shiftsMap[appointmentId];
    if (!list) return;
    const idx = list.findIndex(s => s.id === updated.id);
    if (idx !== -1) list[idx] = updated;
  }

  // ── Care Panel ────────────────────────────────────────────────────────────

  openCarePanel(patient: any, tab: CareTab): void {
    this.carePanelPatient = patient;
    this.carePanelTab     = tab;
    this.resetCareforms();
    if (tab === 'records')      this.loadRecordsFor(patient.patientUserId);
    if (tab === 'vitals')       this.loadVitalsFor(patient.patientUserId);
    if (tab === 'notes')        this.loadNotesFor(patient.patientUserId);
    if (tab === 'careteam')     this.loadCareTeam(patient.patientUserId);
    if (tab === 'medications')  this.loadMedsFor(patient.patientUserId);
  }

  closeCarePanel(): void {
    this.carePanelPatient = null;
    this.resetCareforms();
  }

  switchCareTab(tab: CareTab): void {
    this.carePanelTab = tab;
    this.resetCareforms();
    const pid = this.carePanelPatient?.patientUserId;
    if (!pid) return;
    if (tab === 'records'     && !this.patientRecords[pid]) this.loadRecordsFor(pid);
    if (tab === 'vitals'      && !this.patientVitals[pid])  this.loadVitalsFor(pid);
    if (tab === 'notes'       && !this.noteRecords[pid])    this.loadNotesFor(pid);
    if (tab === 'careteam')                                 this.loadCareTeam(pid);
    if (tab === 'medications')                              this.loadMedsFor(pid);
  }

  private resetCareforms(): void {
    this.vitals        = { bloodPressure: '', pulseRate: '', temperature: '', spo2: '', weight: '', notes: '' };
    this.vitalsError   = '';
    this.vitalsSuccess = false;
    this.noteTitle     = '';
    this.noteContent   = '';
    this.noteError     = '';
    this.noteSuccess   = false;
    this.noteContent2  = '';
    this.noteType2     = 'CLINICAL_UPDATE';
    this.provNoteError = '';
    this.provNoteSuccess = false;
    this.careTeamError   = '';
    this.careTeamSuccess = '';
    this.goalText        = '';
    this.goalTargetDate  = '';
    this.goalError       = '';
    this.goalSuccess     = false;
    this.medName         = '';
    this.medNameCustom   = '';
    this.medDosage       = '';
    this.medFrequency    = '';
    this.medNotes        = '';
    this.medError        = '';
    this.medSuccess      = false;
  }

  // ── Medications ───────────────────────────────────────────────────────────

  loadMedsFor(patientUserId: number): void {
    this.recordSvc.getByPatient(patientUserId).subscribe({
      next: (data) => {
        this.patientMeds[patientUserId] = (data || []).filter((r: any) => r.recordType === 'Medication');
      },
      error: () => {}
    });
  }

  getMeds(patientUserId: number): any[] { return this.patientMeds[patientUserId] || []; }

  addMedication(): void {
    const pid = this.carePanelPatient?.patientUserId;
    if (!pid) return;
    const resolvedName = this.medName === '__other__' ? this.medNameCustom.trim() : this.medName;
    if (!resolvedName) { this.medError = 'Medication name is required.'; return; }
    this.isSavingMed = true;
    this.medError    = '';
    const title = resolvedName
      + (this.medDosage ? ` — ${this.medDosage}` : '')
      + (this.medFrequency ? ` (${this.medFrequency})` : '');
    this.recordSvc.upload(pid, this.myUserId, 'Medication', title, this.medNotes.trim() || undefined)
      .subscribe({
        next: (saved) => {
          if (!this.patientMeds[pid]) this.patientMeds[pid] = [];
          this.patientMeds[pid].unshift(saved);
          this.medName        = '';
          this.medNameCustom  = '';
          this.medDosage      = '';
          this.medFrequency   = '';
          this.medNotes       = '';
          this.isSavingMed  = false;
          this.medSuccess   = true;
          setTimeout(() => this.medSuccess = false, 3000);
        },
        error: (err: Error) => { this.medError = err.message; this.isSavingMed = false; }
      });
  }

  deleteMed(med: any): void {
    const pid = this.carePanelPatient?.patientUserId;
    if (!pid) return;
    this.recordSvc.delete(med.id).subscribe({
      next: () => {
        this.patientMeds[pid] = (this.patientMeds[pid] || []).filter((m: any) => m.id !== med.id);
      },
      error: () => {}
    });
  }


  // ── EHR Records ───────────────────────────────────────────────────────────

  loadRecordsFor(patientUserId: number): void {
    if (this.loadingRecords.has(patientUserId)) return;
    this.loadingRecords.add(patientUserId);
    this.recordSvc.getByPatient(patientUserId).subscribe({
      next: (data) => {
        this.patientRecords[patientUserId] = (data || []).map((r: any) => ({
          id:         r.id,
          title:      r.title || 'Record',
          type:       r.recordType || '—',
          notes:      r.description || '',
          fileUrl:    r.fileUrl || null,
          fileName:   r.fileName || '',
          date:       r.createdAt
            ? new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
            : '—'
        }));
        this.loadingRecords.delete(patientUserId);
      },
      error: () => { this.loadingRecords.delete(patientUserId); }
    });
  }

  getRecordsFor(patientUserId: number): any[] {
    return this.patientRecords[patientUserId] || [];
  }

  isLoadingRecords(patientUserId: number): boolean {
    return this.loadingRecords.has(patientUserId);
  }

  getFileViewUrl(fileUrl: string): string {
    return this.recordSvc.getFileUrl(fileUrl);
  }

  getRecordTypeIcon(type: string): string {
    switch (type) {
      case 'Lab Report':        return 'bi-flask';
      case 'Prescription':      return 'bi-capsule';
      case 'Imaging':           return 'bi-image';
      case 'Discharge Summary': return 'bi-file-earmark-medical';
      case 'Care Note':         return 'bi-journal-text';
      default:                  return 'bi-file-earmark';
    }
  }

  // ── Vitals ────────────────────────────────────────────────────────────────

  loadVitalsFor(patientUserId: number): void {
    if (this.loadingVitals.has(patientUserId)) return;
    this.loadingVitals.add(patientUserId);
    this.vitalSvc.getByPatient(patientUserId).subscribe({
      next: (data) => {
        this.patientVitals[patientUserId] = (data || []).map((v: any) => ({
          ...v,
          date: v.recordedAt
            ? new Date(v.recordedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
            + ' ' + new Date(v.recordedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
            : '—'
        }));
        this.loadingVitals.delete(patientUserId);
      },
      error: () => { this.loadingVitals.delete(patientUserId); }
    });
  }

  getVitalsFor(patientUserId: number): any[] { return this.patientVitals[patientUserId] || []; }
  isLoadingVitals(patientUserId: number): boolean { return this.loadingVitals.has(patientUserId); }

  logVitals(): void {
    const v = this.vitals;
    if (!v.bloodPressure && !v.pulseRate && !v.temperature && !v.spo2 && !v.weight) {
      this.vitalsError = 'Please fill in at least one vital sign.';
      return;
    }
    const pid = this.carePanelPatient?.patientUserId;
    if (!pid) return;

    this.isSavingVitals = true;
    this.vitalsError    = '';

    const appt = this.appointments.find(a =>
      a.patientId === this.carePanelPatient.patientId &&
      ['CONFIRMED','IN_PROGRESS'].includes(a.status?.toUpperCase() || '')
    );

    this.vitalSvc.save({
      patientUserId: pid,
      nurseUserId:   this.myUserId,
      appointmentId: appt?.id,
      bloodPressure: v.bloodPressure || undefined,
      pulseRate:     v.pulseRate ? +v.pulseRate : undefined,
      temperature:   v.temperature ? +v.temperature : undefined,
      spo2:          v.spo2 ? +v.spo2 : undefined,
      weight:        v.weight ? +v.weight : undefined,
      notes:         v.notes || undefined
    }).subscribe({
      next: (saved) => {
        const entry = {
          ...saved,
          date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
              + ' ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        };
        if (!this.patientVitals[pid]) this.patientVitals[pid] = [];
        this.patientVitals[pid].unshift(entry);
        this.vitals        = { bloodPressure: '', pulseRate: '', temperature: '', spo2: '', weight: '', notes: '' };
        this.isSavingVitals = false;
        this.vitalsSuccess  = true;
        setTimeout(() => this.vitalsSuccess = false, 3000);
      },
      error: (err: Error) => {
        this.vitalsError    = err.message;
        this.isSavingVitals = false;
      }
    });
  }

  // ── Care Notes ────────────────────────────────────────────────────────────

  loadNotesFor(patientUserId: number): void {
    this.recordSvc.getByPatient(patientUserId).subscribe({
      next: (data) => {
        this.noteRecords[patientUserId] = (data || [])
          .filter((r: any) => r.recordType === 'Care Note')
          .map((r: any) => ({
            id:    r.id,
            title: r.title || 'Care Note',
            notes: r.description || '',
            date:  r.createdAt
              ? new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
              : '—'
          }));
      },
      error: () => {}
    });
  }

  getNotesFor(patientUserId: number): any[] { return this.noteRecords[patientUserId] || []; }

  addNote(): void {
    if (!this.noteTitle.trim()) { this.noteError = 'Note title is required.'; return; }
    const pid = this.carePanelPatient?.patientUserId;
    if (!pid) return;

    this.isSavingNote = true;
    this.noteError    = '';

    this.recordSvc.upload(pid, this.myUserId, 'Care Note', this.noteTitle.trim(),
      this.noteContent.trim() || undefined).subscribe({
      next: (saved) => {
        const entry = {
          id:    saved.id,
          title: saved.title,
          notes: saved.description || '',
          date:  new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        };
        if (!this.noteRecords[pid]) this.noteRecords[pid] = [];
        this.noteRecords[pid].unshift(entry);
        this.noteTitle    = '';
        this.noteContent  = '';
        this.isSavingNote = false;
        this.noteSuccess  = true;
        setTimeout(() => this.noteSuccess = false, 3000);
      },
      error: (err: Error) => {
        this.noteError    = err.message;
        this.isSavingNote = false;
      }
    });
  }

  // ── Care Team ─────────────────────────────────────────────────────────────

  loadCareTeam(patientUserId: number): void {
    this.isLoadingCareTeam.add(patientUserId);
    this.careTeamError = '';
    this.careSvc.getTeam(patientUserId).subscribe({
      next: (data) => {
        this.careTeamMap[patientUserId] = data || [];
        this.isLoadingCareTeam.delete(patientUserId);
      },
      error: () => { this.isLoadingCareTeam.delete(patientUserId); }
    });
    if (this.orgTeamMembers.length === 0) {
      this.careSvc.getAllTeamMembers().subscribe({
        next: (data) => {
          const doctorRoles = ['Doctor', 'Senior Consultant', 'Junior Doctor', 'Resident Doctor', 'Specialist', 'Medical Officer', 'Head of Department'];
          this.orgTeamMembers = (data || []).filter((m: any) => m.status === 'Active' && doctorRoles.includes(m.role));
        },
        error: () => {}
      });
    }
    this.loadProviderNotes(patientUserId);
    this.loadGoals(patientUserId);
  }

  getCareTeam(patientUserId: number): any[] { return this.careTeamMap[patientUserId] || []; }

  addToCareTeam(member: any): void {
    const pid = this.carePanelPatient?.patientUserId;
    if (!pid) return;
    this.isAddingMember = true;
    this.careTeamError  = '';
    this.careSvc.addToTeam(pid, {
      teamMemberId:  member.id,
      nurseUserId:   this.myUserId,
      nurseName:     this.myName
    }).subscribe({
      next: (entry) => {
        if (!this.careTeamMap[pid]) this.careTeamMap[pid] = [];
        this.careTeamMap[pid].push(entry);
        this.isAddingMember  = false;
        this.careTeamSuccess = member.name + ' added to care team!';
        setTimeout(() => this.careTeamSuccess = '', 3000);
      },
      error: (err: Error) => { this.careTeamError = err.message; this.isAddingMember = false; }
    });
  }

  removeFromCareTeam(entryId: number): void {
    const pid = this.carePanelPatient?.patientUserId;
    if (!pid) return;
    this.careSvc.removeFromTeam(entryId).subscribe({
      next: () => {
        this.careTeamMap[pid] = (this.careTeamMap[pid] || []).filter((m: any) => m.id !== entryId);
      },
      error: () => {}
    });
  }

  isAlreadyInTeam(memberId: number): boolean {
    const pid = this.carePanelPatient?.patientUserId;
    if (!pid) return false;
    return (this.careTeamMap[pid] || []).some((m: any) => m.teamMemberId === memberId);
  }

  loadProviderNotes(patientUserId: number): void {
    this.careSvc.getNotes(patientUserId).subscribe({
      next: (data) => { this.providerNotes[patientUserId] = data || []; },
      error: () => {}
    });
  }

  getProviderNotes(patientUserId: number): any[] { return this.providerNotes[patientUserId] || []; }

  addProviderNote(): void {
    if (!this.noteContent2.trim()) { this.provNoteError = 'Note content is required.'; return; }
    const pid = this.carePanelPatient?.patientUserId;
    if (!pid) return;
    this.isSavingProvNote = true;
    this.provNoteError    = '';
    this.careSvc.addNote(pid, {
      content:          this.noteContent2.trim(),
      noteType:         this.noteType2,
      authorNurseUserId: this.myUserId,
      authorName:       this.myName,
      authorRole:       'Nurse'
    }).subscribe({
      next: (note) => {
        if (!this.providerNotes[pid]) this.providerNotes[pid] = [];
        this.providerNotes[pid].unshift(note);
        this.noteContent2     = '';
        this.noteType2        = 'CLINICAL_UPDATE';
        this.isSavingProvNote = false;
        this.provNoteSuccess  = true;
        setTimeout(() => this.provNoteSuccess = false, 3000);
      },
      error: (err: Error) => { this.provNoteError = err.message; this.isSavingProvNote = false; }
    });
  }

  noteTypeLabel(type: string): string {
    return this.NOTE_TYPES.find(t => t.value === type)?.label || type;
  }

  // ── Care Goals ─────────────────────────────────────────────────────────────

  loadGoals(patientUserId: number): void {
    this.careSvc.getGoals(patientUserId).subscribe({
      next: (data) => { this.careGoals[patientUserId] = data || []; },
      error: () => {}
    });
  }

  getGoals(patientUserId: number): any[] { return this.careGoals[patientUserId] || []; }

  addGoal(): void {
    if (!this.goalText.trim()) { this.goalError = 'Goal description is required.'; return; }
    const pid = this.carePanelPatient?.patientUserId;
    if (!pid) return;
    this.isSavingGoal = true;
    this.goalError    = '';
    this.careSvc.addGoal(pid, {
      goalText:    this.goalText.trim(),
      targetDate:  this.goalTargetDate || null,
      nurseUserId: this.myUserId,
      nurseName:   this.myName
    }).subscribe({
      next: (goal) => {
        if (!this.careGoals[pid]) this.careGoals[pid] = [];
        this.careGoals[pid].unshift(goal);
        this.goalText       = '';
        this.goalTargetDate = '';
        this.isSavingGoal   = false;
        this.goalSuccess    = true;
        setTimeout(() => this.goalSuccess = false, 3000);
      },
      error: (err: Error) => { this.goalError = err.message; this.isSavingGoal = false; }
    });
  }

  updateGoalStatus(goal: any, status: string): void {
    this.careSvc.updateGoalStatus(goal.id, status).subscribe({
      next: (updated) => { Object.assign(goal, updated); },
      error: () => {}
    });
  }

  deleteGoal(goalId: number): void {
    const pid = this.carePanelPatient?.patientUserId;
    if (!pid) return;
    this.careSvc.deleteGoal(goalId).subscribe({
      next: () => {
        this.careGoals[pid] = (this.careGoals[pid] || []).filter((g: any) => g.id !== goalId);
      },
      error: () => {}
    });
  }

  goalStatusClass(status: string): string {
    return status === 'ACHIEVED'   ? 'gs-achieved'
         : status === 'IN_PROGRESS' ? 'gs-progress'
         : 'gs-pending';
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  formatAmount(n: number): string { return '₹' + Number(n).toLocaleString('en-IN'); }

  totalConfirmedAmount(appointmentId: number): number {
    return this.confirmedShiftsFor(appointmentId)
      .reduce((sum, s) => sum + (s.finalRate || s.originalRate || 0), 0);
  }

  shiftStatusClass(status: string): string {
    switch (status) {
      case 'CONFIRMED':            return 'sc-confirmed';
      case 'PENDING_CONFIRMATION': return 'sc-pending';
      case 'REJECTED':             return 'sc-rejected';
      default:                     return 'sc-pending';
    }
  }

  shiftStatusLabel(status: string): string {
    switch (status) {
      case 'CONFIRMED':            return '✓ Confirmed';
      case 'PENDING_CONFIRMATION': return '⏳ Your confirmation needed';
      case 'REJECTED':             return '✗ Rejected';
      default:                     return status;
    }
  }

  getStatusClass(status: string): string {
    const s = (status ?? '').toUpperCase();
    return s === 'CONFIRMED'   ? 'badge-confirmed'
         : s === 'COMPLETED'   ? 'badge-completed'
         : s === 'CANCELLED'   ? 'badge-cancelled'
         : s === 'IN_PROGRESS' ? 'badge-inprogress'
         : 'badge-pending';
  }

  // ── Chat ──────────────────────────────────────────────────────────────────

  private refreshUnread(): void {
    this.msgSvc.getUnreadSenders(this.myUserId).subscribe({
      next: (ids) => { this.unreadFrom = new Set(ids); },
      error: () => {}
    });
  }

  openChat(patient: any, event: Event): void {
    event.stopPropagation();
    this.unreadFrom.delete(patient.patientUserId);
    this.chatPatient = patient;
    this.messages    = [];
    this.newMessage  = '';
    this.chatError   = '';
    this.loadMessages();
    this.startPoll();
  }

  closeChat(): void { this.chatPatient = null; this.stopPoll(); }

  private loadMessages(): void {
    if (!this.chatPatient?.patientUserId) return;
    this.msgSvc.getConversation(this.myUserId, this.chatPatient.patientUserId).subscribe({
      next: (msgs) => {
        const prevLen = this.messages.length;
        this.messages = msgs;
        if (msgs.length > prevLen) this.shouldScroll = true;
        this.msgSvc.markRead(this.myUserId, this.chatPatient.patientUserId).subscribe({
          next: () => this.unreadFrom.delete(this.chatPatient.patientUserId)
        });
      },
      error: () => {}
    });
  }

  sendMessage(): void {
    const text = this.newMessage.trim();
    if (!text || !this.chatPatient?.patientUserId) return;
    this.isSending = true;
    this.chatError = '';
    this.msgSvc.send(this.myUserId, this.myName, 'NURSE', this.chatPatient.patientUserId, 'PATIENT', text).subscribe({
      next: (msg) => {
        this.messages.push(msg);
        this.newMessage   = '';
        this.isSending    = false;
        this.shouldScroll = true;
      },
      error: (err: Error) => { this.isSending = false; this.chatError = err.message; }
    });
  }

  onEnter(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); this.sendMessage(); }
  }

  isMine(msg: any): boolean { return msg.senderId === this.myUserId; }

  private startPoll(): void { this.pollTimer = setInterval(() => this.loadMessages(), 4000); }
  private stopPoll(): void  { if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = undefined; } }
  private scrollToBottom(): void {
    try { this.msgEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth' }); } catch {}
  }

  logout(): void { this.auth.logout(); }
}
