import { AbstractControl, ValidationErrors } from '@angular/forms';

export const trimRequired = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value?.trim();
  return value ? null : { required: true };
};

export const noWhitespace = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value || '';
  return /\s/.test(value) ? { whitespace: true } : null;
};