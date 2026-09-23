/**
 * Firebase settings.
 *
 * Paste the config object from the Firebase console here and set `enabled` to
 * true. Until then Radar behaves exactly as it does now — the API when the
 * server is running, browser storage otherwise — so an unconfigured copy of
 * the site is never broken by this file.
 *
 * These values are not secrets. Firebase publishes them in every web app it
 * generates; they identify the project, they do not authorise anything. What
 * actually protects student data is firestore.rules, which only lets a signed
 * in person touch their own documents.
 */
export const FIREBASE = {
  enabled: false,

  /* Firebase console → Project settings → Your apps → Web app → SDK setup. */
  config: {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
  },

  /* Which sign-in methods the interface offers. Enable the matching providers
     in Firebase console → Authentication → Sign-in method, or the button will
     fail with "operation not allowed". */
  providers: {
    google: true,
    emailPassword: true,
  },

  /* The SDK is loaded from Google's CDN on demand. Bump this to move version. */
  sdkVersion: '11.0.2',
};

export const firebaseReady = () =>
  FIREBASE.enabled && Boolean(FIREBASE.config.apiKey && FIREBASE.config.projectId);
