"use client";

import { supabase } from "@/app/lib/supabase";

export async function signUpCustomer(email: string, password: string) {
  return supabase.auth.signUp({
    email,
    password,
  });
}

export async function signInCustomer(email: string, password: string) {
  return supabase.auth.signInWithPassword({
    email,
    password,
  });
}

export async function signOutCustomer() {
  return supabase.auth.signOut();
}

export async function getCurrentSession() {
  return supabase.auth.getSession();
}

export async function getCurrentUser() {
  return supabase.auth.getUser();
}

export async function resetCustomerPassword(email: string) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
}

export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
}

export async function signInWithApple() {
  return supabase.auth.signInWithOAuth({
    provider: "apple",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
}

export async function sendPhoneOtp(phone: string) {
  return supabase.auth.signInWithOtp({ phone });
}

export async function verifyPhoneOtp(phone: string, token: string) {
  return supabase.auth.verifyOtp({
    phone,
    token,
    type: "sms",
  });
}

export async function updateCustomerPassword(password: string) {
  return supabase.auth.updateUser({ password });
}