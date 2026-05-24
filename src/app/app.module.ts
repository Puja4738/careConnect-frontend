import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { NgrokInterceptor } from './interceptors/ngrok.interceptor';
import { CapFirstDirective } from './directives/cap-first.directive';
import { RouterModule } from '@angular/router';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

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

@NgModule({
  declarations: [
    AppComponent,
    CapFirstDirective,
    LoginComponent,
    RegisterComponent,
    HomeComponent,
    ForgotPasswordComponent,

    AdminDashboardComponent,
    PostJobComponent,
    NurseApplicationsComponent,
    ComplianceComponent,
    CredentialingComponent,
    TeamManagementComponent,
    StaffingAnalyticsComponent,
    SupervisorComponent,

    PatientDashboardComponent,
    BookAppointmentComponent,
    MyAppointmentsComponent,
    MedicalRecordsComponent,
    SettingsComponent,
    MyNursesComponent,
    EmergencyRequestComponent,
    PatientCarePlanComponent,
    AdminLoginComponent,
    PlatformAdminComponent,

    NurseDashboardComponent,
    ProfileComponent,
    JobsComponent,
    ApplicationsComponent,
    ScheduleComponent,
    PaymentsComponent,
    TrainingComponent,
    MyPatientsComponent,
    NotificationsComponent,
    TelehealthComponent,
    NurseComplianceComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    RouterModule,
    ReactiveFormsModule
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: NgrokInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
