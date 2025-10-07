import { type ClassValue } from "clsx";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format a phone number to (XXX) XXX-XXXX for 10-digit NANP numbers.
// - Strips non-digits.
// - If leading country code '1' present on 11-digit number, it is removed for formatting.
// - Returns original input (trimmed) if cannot confidently format.
// - Optionally return E.164 with { e164: true }.
export function formatPhone(raw: string | undefined | null, opts?: { e164?: boolean }): string {
  if (!raw) return '';
  const digits = String(raw).replace(/\D+/g, '');
  if (!digits) return '';
  let core = digits;
  if (core.length === 11 && core.startsWith('1')) core = core.slice(1);
  if (opts?.e164) {
    // Only produce e164 if 10 (assume US) or already 11 starting with 1
    if (core.length === 10) return '+1' + core;
    if (digits.length === 11 && digits.startsWith('1')) return '+' + digits;
    return '+' + digits; // fallback – minimal transformation
  }
  if (core.length === 10) {
    return `(${core.slice(0,3)}) ${core.slice(3,6)}-${core.slice(6)}`;
  }
  if (core.length === 7) {
    return `${core.slice(0,3)}-${core.slice(3)}`;
  }
  return raw.trim();
}

// Attempt to normalize to E.164 +1XXXXXXXXXX if possible; else return digits.
export function normalizePhoneE164(raw: string | undefined | null): string {
  if (!raw) return '';
  const digits = raw.replace(/\D+/g, '');
  if (!digits) return '';
  if (digits.length === 11 && digits.startsWith('1')) return '+' + digits;
  if (digits.length === 10) return '+1' + digits;
  return '+' + digits; // fallback
}

// Extract extension if embedded e.g. "(555) 123-4567 ext 234" or "555-1234 x89".
// Returns { phone: originalWithoutExt, ext } where ext is digits only or ''.
export function parsePhoneWithExt(input: string | null | undefined): { phone: string; ext: string } {
  if (!input) return { phone: '', ext: '' };
  const trimmed = input.trim();
  // Pattern captures ext tokens: ext, ext., x, x., #, extension
  const extRegex = /(?:\bext\.?|\bextension\b|x|#)\s*(\d{1,8})$/i;
  const m = trimmed.match(extRegex);
  if (m) {
    const ext = m[1];
    const phone = trimmed.slice(0, m.index).trim().replace(/[\s,;.-]+$/, '').trim();
    return { phone, ext };
  }
  return { phone: trimmed, ext: '' };
}

export function normalizeExtension(raw: string | null | undefined): string {
  if (!raw) return '';
  const digits = raw.replace(/\D+/g, '').slice(0, 8);
  return digits;
}

export function formatPhoneWithExt(phone: string | null | undefined, ext: string | null | undefined): string {
  const base = formatPhone(phone || '');
  const normExt = normalizeExtension(ext || '');
  return normExt ? `${base} ext. ${normExt}` : base;
}

