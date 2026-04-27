import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideFirebaseApp(() => initializeApp({ 
      projectId: "kensyu10138", 
      appId: "1:878192124101:web:f08c1abf925361457610ac", 
      storageBucket: "kensyu10138.firebasestorage.app", 
      apiKey: "AIzaSyD4TFR96oVu81LFAKdILbrPaefRG8d7Jg0", 
      authDomain: "kensyu10138.firebaseapp.com", 
      messagingSenderId: "878192124101", 
      measurementId: "G-PXMTR2KDVS", 
      // projectNumber: "878192124101", 
      // version: "2" 
    })), 
    provideAuth(() => getAuth()), provideFirestore(() => getFirestore())
  ]
};
