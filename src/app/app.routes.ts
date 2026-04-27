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

export const routes: Routes = [

{ path: 'projects/create', canActivate:[authGuard], component: ProjectCreateComponent },
{ path: 'projects/:projectId/edit', canActivate:[authGuard], component: ProjectEditComponent },

{ path: 'projects/:projectId', canActivate:[authGuard], component: ProjectComponent },
{ path: 'projects/:projectId', canActivate: [authGuard], children:[{ path: 'tasks/create', component: TaskCreateComponent }] },
{ path: 'projects/:projectId/tasks/:taskId', canActivate: [authGuard], component: TaskDetailComponent },
{ path: 'tasks/:taskId', canActivate: [authGuard], component: TaskDetailComponent },

{ path: '', canActivate:[authGuard],component: HomeComponent},

{ path: 'signin', component: SignInComponent },
{ path: 'signup', component: SignUpComponent },
];
