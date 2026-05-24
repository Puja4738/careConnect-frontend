import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { HomeComponent } from './pages/home/home.component';
import { ForgotPasswordComponent } from './pages/forgot-password/forgot-password.component';

import { AdminDashboardComponent } from './pages/admin/admin-dashboard/admin-dashboard.component';
import { PostJobComponent } from './pages/admin/post-job/post-job.component';
import { NurseApplicationsComponent } from './pages/admin/nurse-applications/nurse-applications.component';
import { ComplianceComponent } from './pages/admin/compliance/compliance.component';
import { CredentialingComponent } from './pages/admin/credentialing/credentialing.component';
import { TeamManagementComponent } from './pages/admin/team-management/team-management.component';
import { StaffingAnalyticsComponent } from './pages/admin/staffing-analytics/staffing-analytics.component';
import { SupervisorComponent } from './pages/admin/supervisor/supervisor.component';

import { PatientDashboardComponent } from './pages/patient/patient-dashboard/patient-dashboard.component';
import { BookAppointmentComponent } from './pages/patient/book-appointment/book-appointment.component';
import { MyAppointmentsComponent } from './pages/patient/my-appointments/my-appointments.component';
import { MedicalRecordsComponent } from './pages/patient/medical-records/medical-records.component';
import { SettingsComponent } from './pages/patient/settings/settings.component';
import { MyNursesComponent } from './pages/patient/my-nurses/my-nurses.component';
import { EmergencyRequestComponent } from './pages/patient/emergency-request/emergency-request.component';
import { PatientCarePlanComponent } from './pages/patient/patient-care-plan/patient-care-plan.component';
import { AdminLoginComponent } from './pages/admin-login/admin-login.component';
import { PlatformAdminComponent } from './pages/platform-admin/platform-admin.component';

import { NurseDashboardComponent } from './pages/nurse/nurse-dashboard/nurse-dashboard.component';
import { ProfileComponent } from './pages/nurse/profile/profile.component';
import { JobsComponent } from './pages/nurse/jobs/jobs.component';
import { ApplicationsComponent } from './pages/nurse/applications/applications.component';
import { ScheduleComponent } from './pages/nurse/schedule/schedule.component';
import { PaymentsComponent } from './pages/nurse/payments/payments.component';
import { TrainingComponent } from './pages/nurse/training/training.component';
import { MyPatientsComponent } from './pages/nurse/my-patients/my-patients.component';
import { NotificationsComponent } from './pages/nurse/notifications/notifications.component';
import { TelehealthComponent } from './pages/nurse/telehealth/telehealth.component';
import { NurseComplianceComponent } from './pages/nurse/nurse-compliance/nurse-compliance.component';

const routes: Routes = [
  // Public — always accessible
  { path: '',               component: HomeComponent },
  { path: 'home',           component: HomeComponent },
  { path: 'login',          component: LoginComponent },
  { path: 'register',       component: RegisterComponent },
  { path: 'forgot-password',component: ForgotPasswordComponent },

  // Admin (Organization) routes — must be logged in AND role = ORGANIZATION
  { path: 'admin',               component: AdminDashboardComponent,    canActivate: [authGuard, roleGuard], data: { role: 'ORGANIZATION' } },
  { path: 'admin-post-job',      component: PostJobComponent,           canActivate: [authGuard, roleGuard], data: { role: 'ORGANIZATION' } },
  { path: 'admin-applications',  component: NurseApplicationsComponent, canActivate: [authGuard, roleGuard], data: { role: 'ORGANIZATION' } },
  { path: 'admin-compliance',    component: ComplianceComponent,        canActivate: [authGuard, roleGuard], data: { role: 'ORGANIZATION' } },
  { path: 'admin-credentialing', component: CredentialingComponent,     canActivate: [authGuard, roleGuard], data: { role: 'ORGANIZATION' } },
  { path: 'admin-team',          component: TeamManagementComponent,    canActivate: [authGuard, roleGuard], data: { role: 'ORGANIZATION' } },
  { path: 'admin-analytics',     component: StaffingAnalyticsComponent, canActivate: [authGuard, roleGuard], data: { role: 'ORGANIZATION' } },
  { path: 'admin-supervisor',   component: SupervisorComponent,        canActivate: [authGuard, roleGuard], data: { role: 'ORGANIZATION' } },

  // Patient routes — must be logged in AND role = PATIENT
  { path: 'patient',                  component: PatientDashboardComponent, canActivate: [authGuard, roleGuard], data: { role: 'PATIENT' } },
  { path: 'patient-book-appointment', component: BookAppointmentComponent,  canActivate: [authGuard, roleGuard], data: { role: 'PATIENT' } },
  { path: 'patient-appointments',     component: MyAppointmentsComponent,   canActivate: [authGuard, roleGuard], data: { role: 'PATIENT' } },
  { path: 'patient-medical-records',  component: MedicalRecordsComponent,   canActivate: [authGuard, roleGuard], data: { role: 'PATIENT' } },
  { path: 'patient-settings',         component: SettingsComponent,         canActivate: [authGuard, roleGuard], data: { role: 'PATIENT' } },
  { path: 'patient-my-nurses',        component: MyNursesComponent,         canActivate: [authGuard, roleGuard], data: { role: 'PATIENT' } },
  { path: 'patient-emergency',        component: EmergencyRequestComponent, canActivate: [authGuard, roleGuard], data: { role: 'PATIENT' } },
  { path: 'patient-care-plan',        component: PatientCarePlanComponent,  canActivate: [authGuard, roleGuard], data: { role: 'PATIENT' } },

  // Platform Admin routes
  { path: 'admin-login',     component: AdminLoginComponent },
  { path: 'platform-admin',  component: PlatformAdminComponent, canActivate: [authGuard, roleGuard], data: { role: 'PLATFORM_ADMIN' } },

  // Nurse routes — must be logged in AND role = NURSE
  { path: 'nurse',                component: NurseDashboardComponent, canActivate: [authGuard, roleGuard], data: { role: 'NURSE' } },
  { path: 'nurse-dashboard',      component: NurseDashboardComponent, canActivate: [authGuard, roleGuard], data: { role: 'NURSE' } },
  { path: 'nurse-profile',        component: ProfileComponent,        canActivate: [authGuard, roleGuard], data: { role: 'NURSE' } },
  { path: 'nurse-available-jobs', component: JobsComponent,           canActivate: [authGuard, roleGuard], data: { role: 'NURSE' } },
  { path: 'nurse-applications',   component: ApplicationsComponent,   canActivate: [authGuard, roleGuard], data: { role: 'NURSE' } },
  { path: 'nurse-schedule',       component: ScheduleComponent,       canActivate: [authGuard, roleGuard], data: { role: 'NURSE' } },
  { path: 'nurse-payments',       component: PaymentsComponent,       canActivate: [authGuard, roleGuard], data: { role: 'NURSE' } },
  { path: 'nurse-training',       component: TrainingComponent,       canActivate: [authGuard, roleGuard], data: { role: 'NURSE' } },
  { path: 'nurse-my-patients',    component: MyPatientsComponent,     canActivate: [authGuard, roleGuard], data: { role: 'NURSE' } },
  { path: 'nurse-notifications',  component: NotificationsComponent,  canActivate: [authGuard, roleGuard], data: { role: 'NURSE' } },
  { path: 'nurse-telehealth',    component: TelehealthComponent,        canActivate: [authGuard, roleGuard], data: { role: 'NURSE' } },
  { path: 'nurse-compliance',   component: NurseComplianceComponent,   canActivate: [authGuard, roleGuard], data: { role: 'NURSE' } },

  // Fallback
  { path: '**', redirectTo: '' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
