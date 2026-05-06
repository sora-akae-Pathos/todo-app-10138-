import { Routes } from '@angular/router';
import { SignInComponent } from './auth/signin/signin.component';
import { SignUpComponent } from './auth/signup/signup.component';
import { authGuard } from './auth/authguard/auth.guard';
import { HomeComponent } from './home/home.component';
import { TaskDetailComponent } from './task-detail/task-detail.component';
import { ProjectCreateComponent } from './project-create/project-create.component';
import { ProjectComponent } from './project/project.component';
import { TaskCreateComponent } from './task-create/task-create.component';
import { ProjectEditComponent } from './project-edit/project-edit.component';
import { LayoutComponent } from './layout/layout.component';
import { ProfileComponent } from './profile/profile.component';

export const routes: Routes = [
{
    path: '',
    component: LayoutComponent,
    children: [
{ path: 'profile', canActivate:[authGuard], component: ProfileComponent },
{ path: 'projects/create', canActivate:[authGuard], component: ProjectCreateComponent },
{ path: 'projects/:projectId/edit', canActivate:[authGuard], component: ProjectEditComponent },
{ path: 'projects/:projectId/tasks/create', canActivate:[authGuard], component: TaskCreateComponent },
{ path: 'projects/:projectId/tasks/:taskId', canActivate: [authGuard], component: TaskDetailComponent },
{ path: 'tasks/:taskId', canActivate: [authGuard], component: TaskDetailComponent },
{ path: '', canActivate:[authGuard],component: HomeComponent},
{ path: 'projects/:projectId', canActivate:[authGuard], component: ProjectComponent },
]},
{ path: 'signin', component: SignInComponent },
{ path: 'signup', component: SignUpComponent },
];
