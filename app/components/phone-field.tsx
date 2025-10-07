"use client";
import React from "react";
import { formatPhone, normalizeExtension } from "@/lib/utils";

interface PhoneFieldProps {
  label?: string;
  phoneLabel?: string;
  extLabel?: string;
  value: string;
  extValue: string;
  onChangePhoneAction: (v: string) => void;
  onChangeExtAction: (v: string) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  className?: string;
  phonePlaceholder?: string;
  extPlaceholder?: string;
}

// A compact paired phone + extension input cluster.
export function PhoneField({
  label,
  phoneLabel = "Phone",
  extLabel = "Ext",
  value,
  extValue,
  onChangePhoneAction,
  onChangeExtAction,
  disabled,
  required,
  error,
  className,
  phonePlaceholder = "(555) 123-4567",
  extPlaceholder = "123",
}: PhoneFieldProps) {
  return (
    <div className={["space-y-1", className].filter(Boolean).join(" ")}>
      {label && (
        <p className="text-xs font-medium text-gray-600">
          {label} {required && <span className="text-red-500">*</span>}
        </p>
      )}
      <div className="flex gap-2">
        <div className="flex-1 min-w-0">
          {!label && (
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {phoneLabel} {required && <span className="text-red-500">*</span>}
            </label>
          )}
          <input
            type="tel"
            value={value}
            onChange={(e) => onChangePhoneAction(e.target.value)}
            onBlur={(e) => onChangePhoneAction(formatPhone(e.target.value))}
            placeholder={phonePlaceholder}
            disabled={disabled}
            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="w-28">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {extLabel}
          </label>
          <input
            type="text"
            value={extValue}
            onChange={(e) =>
              onChangeExtAction(e.target.value.replace(/[^0-9]/g, ""))
            }
            onBlur={(e) =>
              onChangeExtAction(normalizeExtension(e.target.value))
            }
            placeholder={extPlaceholder}
            disabled={disabled}
            maxLength={8}
            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  );
}

export default PhoneField;
