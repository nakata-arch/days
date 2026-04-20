/**
 * @fileOverview Firebase configuration object.
 * This file only exports the configuration and does not initialize the Firebase app.
 */

// Firebase Web の設定値。APIキーはWebSDKでは公開前提で、セキュリティは
// Firestore ルール & Auth で担保する設計のため、ハードコード可。
// 環境変数が設定されていればそちらが優先される。
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDJMmJAwOlJZfZDxs9Sb_dI6rJcssjZ8SY",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "days-e3e72.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "days-e3e72",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "days-e3e72.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "543532992588",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:543532992588:web:82cebae847a0b92e918ce9",
};
