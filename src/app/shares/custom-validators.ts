import { AbstractControl, ValidationErrors } from '@angular/forms';

export const trimRequired = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value?.trim();
  return value ? null : { required: true };
};

export const noWhitespace = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value || '';
  return /\s/.test(value) ? { whitespace: true } : null;
};

export const passwordMismatch = (control: AbstractControl): ValidationErrors | null => {
  const password = control.get('password')?.value;
  const confirm = control.get('confirmPassword')?.value;

  if (!password || !confirm) return null;

  return password !== confirm ? { passwordMismatch: true } : null;
};