"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

import {
  Plus as PlusIcon,
  X as XIcon,
  User as UserIcon,
  Building2 as BuildingIcon,
  MapPin as MapPinIcon,
  FileText as FileTextIcon,
} from "lucide-react";

type Address = {
  street1: string;
  street2: string;
  city: string;
  state: string;
  zip: string;
};

// ✅ Added business support + orgName
interface InsuredPerson {
  id: string;
  isBusiness?: boolean;
  orgName?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  phone2: string;
}

interface AdditionalContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  contactType: string;
  customType?: string;
}

interface CoverageLine {
  id: string;
  description: string;
  amount: string;
}

type PrimaryContactValue = `insured-${string}` | `contact-${string}`;

interface ClaimFormData {
  // Assignment
  clientCompany: string;   // carrier_id
  clientContact: string;   // optional; we'll resolve in API
  claimNumber: string;
  policyNumber: string;    // optional now

  // Addresses (Loss/Property + Mailing)
  propertyAddress: Address;
  mailingAddress: Address;
  sameAsProperty: boolean;
  primaryContact: PrimaryContactValue;

  // Loss
  dateOfLoss: string;
  dateReceived: string;
  typeOfLoss: string;      // will hold loss_cause.id (string)
  lossDescription: string;
  assignedManager: string;   // your UI keeps both
  assignedAdjuster: string;  // API will map this to claims.assigned_to_user

  // Policy (optional block)
  effectiveDate: string;
  expirationDate: string;
  policyType: string;
  formNumbers: string;
  deductible: string;
}

export default function ClaimIntake() {
  const router = useRouter();
  const getCurrentDate = () => new Date().toISOString().split("T")[0];

  const initialForm: ClaimFormData = {
    clientCompany: "",
    clientContact: "",
    claimNumber: "",
    policyNumber: "",

    propertyAddress: { street1: "", street2: "", city: "", state: "", zip: "" },
    mailingAddress: { street1: "", street2: "", city: "", state: "", zip: "" },
    sameAsProperty: false,
    primaryContact: "insured-1",

    dateOfLoss: "",
    dateReceived: getCurrentDate(),
    typeOfLoss: "",        // will store ID string
    lossDescription: "",
    assignedManager: "",
    assignedAdjuster: "",

    effectiveDate: "",
    expirationDate: "",
    policyType: "",
    formNumbers: "",
    deductible: "",
  };

  const [formData, setFormData] = useState<ClaimFormData>(initialForm);

  // Helper to get staff name by ID
  const getStaffName = (id: string, list: { id: string; name: string }[]) => {
    const found = list.find((s) => s.id === id);
    return found ? found.name : "";
  };

  // ✅ Add business fields into InsuredPerson shape
  const [insuredPersons, setInsuredPersons] = useState<InsuredPerson[]>([
    { id: "1", isBusiness: false, orgName: "", firstName: "", lastName: "", email: "", phone: "", phone2: "" },
  ]);

  const [additionalContacts, setAdditionalContacts] = useState<AdditionalContact[]>([]);
  const [coverageLines, setCoverageLines] = useState<CoverageLine[]>([
    { id: "1", description: "", amount: "" },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-save (mock)
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log("Auto-saving form data...");
    }, 2000);
    return () => clearTimeout(timer);
  }, [formData, insuredPersons, additionalContacts, coverageLines]);

  // Dynamic client companies (Carriers)
  const [clientCompanies, setClientCompanies] = useState<{ id: string; name: string }[]>([]);
  const [clientCompaniesLoading, setClientCompaniesLoading] = useState(true);
  useEffect(() => {
    setClientCompaniesLoading(true);
    fetch("/api/carriers")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.data)) {
          setClientCompanies(data.data.map((c: any) => ({ id: String(c.id), name: c.name })));
        } else {
          setClientCompanies([]);
        }
      })
      .catch(() => setClientCompanies([]))
      .finally(() => setClientCompaniesLoading(false));
  }, []);

  // Dynamic client contacts (per carrier)
  const [clientContacts, setClientContacts] = useState<{ id: string; label: string }[]>([]);
  const [clientContactsLoading, setClientContactsLoading] = useState(false);
  useEffect(() => {
    if (!formData.clientCompany) {
      setClientContacts([]);
      return;
    }
    setClientContactsLoading(true);
    fetch(`/api/carriers/${formData.clientCompany}/contacts`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.data)) {
          setClientContacts(
            data.data.map((c: any) => ({
              id: String(c.id ?? c.email ?? c.name ?? ""),
              label: c.name || c.full_name || c.email || "",
            }))
          );
        } else {
          setClientContacts([]);
        }
      })
      .catch(() => setClientContacts([]))
      .finally(() => setClientContactsLoading(false));
  }, [formData.clientCompany]);

  const states = [
    "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
  ];

  // Contact types for Additional Contacts
  const [contactTypes, setContactTypes] = useState<string[]>([]);
  const [contactTypesLoading, setContactTypesLoading] = useState<boolean>(true);
  useEffect(() => {
    let isActive = true;
    setContactTypesLoading(true);
    fetch("/api/roles")
      .then((res) => res.json())
      .then((data) => {
        if (!isActive) return;
        const arr = Array.isArray(data?.data)
          ? data.data
              .map((r: any) => r?.name)
              .filter((n: any) => typeof n === "string" && n.trim().length > 0)
          : [];
        // Always include "Other" as a choice at the end
        const unique = Array.from(new Set([...arr, "Other"]));
        setContactTypes(unique);
      })
      .catch(() => setContactTypes(["Other"]))
      .finally(() => isActive && setContactTypesLoading(false));
    return () => {
      isActive = false;
    };
  }, []);

  // Dynamic loss causes (we'll store ID now)
  const [lossCauses, setLossCauses] = useState<{ id: string; name: string }[]>([]);
  const [lossCausesLoading, setLossCausesLoading] = useState(true);
  useEffect(() => {
    setLossCausesLoading(true);
    fetch("/api/loss-causes")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.data)) {
          setLossCauses(data.data.map((c: any) => ({ id: String(c.id), name: c.name })));
        } else {
          setLossCauses([]);
        }
      })
      .catch(() => setLossCauses([]))
      .finally(() => setLossCausesLoading(false));
  }, []);

  // Dynamic managers/adjusters (all staff; UI keeps both)
  const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);
  const [staffLoading, setStaffLoading] = useState(true);
  useEffect(() => {
    setStaffLoading(true);
    fetch("/api/staff")
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.data)) {
          setStaff(data.data.map((s: any) => ({ id: String(s.id), name: s.name })));
        } else {
          setStaff([]);
        }
      })
      .catch(() => setStaff([]))
      .finally(() => setStaffLoading(false));
  }, []);

  // Helpers
  const updateFormData = <K extends keyof ClaimFormData>(field: K, value: ClaimFormData[K]) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "effectiveDate" && typeof value === "string" && value) {
        const effectiveDate = new Date(value);
        const expirationDate = new Date(effectiveDate);
        expirationDate.setFullYear(expirationDate.getFullYear() + 1);
        updated.expirationDate = expirationDate.toISOString().split("T")[0];
      }
      return updated;
    });
  };

  const updateNestedFormData = (
    section: "propertyAddress" | "mailingAddress",
    field: keyof Address,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }));
  };

  const handleSameAsProperty = (checked: boolean | "indeterminate") => {
    const isChecked = checked === true;
    setFormData((prev) => ({
      ...prev,
      sameAsProperty: isChecked,
      mailingAddress: isChecked
        ? { ...prev.propertyAddress }
        : { street1: "", street2: "", city: "", state: "", zip: "" },
    }));
  };

  // Insured persons
  const addInsuredPerson = () => {
    const newId = (insuredPersons.length + 1).toString();
    setInsuredPersons((prev) => [
      ...prev,
      { id: newId, isBusiness: false, orgName: "", firstName: "", lastName: "", email: "", phone: "", phone2: "" },
    ]);
  };

  const removeInsuredPerson = (id: string) => {
    if (insuredPersons.length > 1) {
      setInsuredPersons((prev) => prev.filter((p) => p.id !== id));
      setFormData((prev) =>
        prev.primaryContact === (`insured-${id}` as PrimaryContactValue)
          ? { ...prev, primaryContact: "insured-1" }
          : prev
      );
    }
  };

  const updateInsuredPerson = (id: string, field: keyof InsuredPerson, value: any) => {
    setInsuredPersons((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  // Additional contacts
  const addAdditionalContact = () => {
    const newId = (additionalContacts.length + 1).toString();
    setAdditionalContacts((prev) => [
      ...prev,
      { id: newId, firstName: "", lastName: "", email: "", phone: "", contactType: "" },
    ]);
  };

  const removeAdditionalContact = (id: string) => {
    setAdditionalContacts((prev) => prev.filter((c) => c.id !== id));
    setFormData((prev) =>
      prev.primaryContact === (`contact-${id}` as PrimaryContactValue)
        ? { ...prev, primaryContact: "insured-1" }
        : prev
    );
  };

  const updateAdditionalContact = (id: string, field: keyof AdditionalContact, value: string) => {
    setAdditionalContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  // Coverage lines (cap at 8)
  const addCoverageLine = () => {
    if (coverageLines.length >= 8) return;
    const newId = (coverageLines.length + 1).toString();
    setCoverageLines((prev) => [...prev, { id: newId, description: "", amount: "" }]);
  };

  const removeCoverageLine = (id: string) => {
    if (coverageLines.length > 1) {
      setCoverageLines((prev) => prev.filter((l) => l.id !== id));
    }
  };

  const updateCoverageLine = (id: string, field: keyof CoverageLine, value: string) => {
    setCoverageLines((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  };

  // Validation (Policy Number now optional)
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.clientCompany) newErrors.clientCompany = "Client Company is required";
    if (!formData.claimNumber) newErrors.claimNumber = "Claim Number is required";
    // Policy number is OPTIONAL now

    if (!insuredPersons[0].firstName && !insuredPersons[0].isBusiness) {
      newErrors.insuredFirstName = "Insured First Name is required (or mark as business)";
    }
    if (!insuredPersons[0].lastName && !insuredPersons[0].isBusiness) {
      newErrors.insuredLastName = "Insured Last Name is required (or mark as business)";
    }
    if (insuredPersons[0].isBusiness && !insuredPersons[0].orgName) {
      newErrors.insuredOrg = "Organization Name is required for business insured";
    }

    insuredPersons.forEach((p, idx) => {
      if (p.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) {
        newErrors[`insuredEmail${idx}`] = "Invalid email format";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit
  const handleSubmit = async (submitType: "submit" | "submitAndAdd") => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/claims/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formData,
          insuredPersons,
          additionalContacts,
          coverageLines,
          submitType,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        const message = json?.detail
          ? `${json?.error ?? "Submission failed"}: ${json.detail}`
          : (json?.error || "Submission failed");
        throw new Error(message);
      }

      if (submitType === "submitAndAdd") {
        setFormData({ ...initialForm, dateReceived: getCurrentDate() });
        setInsuredPersons([{ id: "1", isBusiness: false, orgName: "", firstName: "", lastName: "", email: "", phone: "", phone2: "" }]);
        setAdditionalContacts([]);
        setCoverageLines([{ id: "1", description: "", amount: "" }]);
        setErrors({});
      } else {
        router.push(`/claims/${json.claimId}`);
      }
    } catch (err) {
      console.error("Submission error:", err);
      setErrors((e) => ({ ...e, submit: String(err) }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => router.push("/dashboard");

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Claim Intake</h1>
          <p className="text-gray-600">Enter claim information for processing</p>
        </div>
        <div className="text-sm text-gray-500">Auto-saving enabled</div>
      </div>

      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        {/* Assignment Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserIcon className="h-5 w-5 text-[#92C4D5]" />
              <span>Assignment Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Client Company */}
              <div className="space-y-2">
                <Label htmlFor="clientCompany" className="text-sm font-medium">
                  Client Company *
                </Label>
                <Select
                  value={formData.clientCompany}
                  onValueChange={(v) => updateFormData("clientCompany", v)}
                  disabled={clientCompaniesLoading}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder={clientCompaniesLoading ? "Loading..." : "Select client company"} />
                  </SelectTrigger>
                  <SelectContent>
                    {clientCompanies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.clientCompany && (
                  <p className="text-sm text-red-600">{errors.clientCompany}</p>
                )}
              </div>

              {/* Client Contact */}
              <div className="space-y-2">
                <Label htmlFor="clientContact" className="text-sm font-medium">
                  Client Contact
                </Label>
                <Select
                  value={formData.clientContact}
                  onValueChange={(v) => updateFormData("clientContact", v)}
                  disabled={!formData.clientCompany || clientContactsLoading}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder={clientContactsLoading ? "Loading..." : "Select client contact"} />
                  </SelectTrigger>
                  <SelectContent>
                    {clientContacts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Claim Number */}
              <div className="space-y-2">
                <Label htmlFor="claimNumber" className="text-sm font-medium">
                  Claim Number *
                </Label>
                <Input
                  id="claimNumber"
                  value={formData.claimNumber}
                  onChange={(e) => updateFormData("claimNumber", e.target.value)}
                  className="h-11"
                  placeholder="Enter claim number"
                />
                {errors.claimNumber && (
                  <p className="text-sm text-red-600">{errors.claimNumber}</p>
                )}
              </div>

              {/* Policy Number (optional) */}
              <div className="space-y-2">
                <Label htmlFor="policyNumber" className="text-sm font-medium">
                  Policy Number
                </Label>
                <Input
                  id="policyNumber"
                  value={formData.policyNumber}
                  onChange={(e) => updateFormData("policyNumber", e.target.value)}
                  className="h-11"
                  placeholder="Enter policy number (optional)"
                />
              </div>
            </div>

            {/* Insured Persons */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900">Insured</h4>

              {insuredPersons.map((person, index) => (
                <div key={person.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h5 className="font-medium text-gray-900">
                        {index === 0 ? "Primary Insured" : `Additional Insured ${index}`}
                      </h5>
                      {/* ✅ Business toggle */}
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`isBusiness-${person.id}`}
                          checked={!!person.isBusiness}
                          onCheckedChange={(v) => updateInsuredPerson(person.id, "isBusiness", v === true)}
                        />
                        <Label htmlFor={`isBusiness-${person.id}`} className="text-sm">
                          Insured is a business
                        </Label>
                      </div>
                    </div>
                    {index > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeInsuredPerson(person.id)}
                        className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                      >
                        <XIcon className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Organization name if business */}
                  {person.isBusiness && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-sm font-medium">Organization Name *</Label>
                        <Input
                          value={person.orgName || ""}
                          onChange={(e) => updateInsuredPerson(person.id, "orgName", e.target.value)}
                          className="h-11"
                          placeholder="Enter organization name"
                        />
                        {index === 0 && errors.insuredOrg && (
                          <p className="text-sm text-red-600">{errors.insuredOrg}</p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        First Name {index === 0 && !person.isBusiness && "*"}
                      </Label>
                      <Input
                        value={person.firstName}
                        onChange={(e) =>
                          updateInsuredPerson(person.id, "firstName", e.target.value)
                        }
                        className="h-11"
                        placeholder="Enter first name"
                        disabled={!!person.isBusiness}
                      />
                      {index === 0 && !person.isBusiness && errors.insuredFirstName && (
                        <p className="text-sm text-red-600">{errors.insuredFirstName}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Last Name {index === 0 && !person.isBusiness && "*"}
                      </Label>
                      <Input
                        value={person.lastName}
                        onChange={(e) =>
                          updateInsuredPerson(person.id, "lastName", e.target.value)
                        }
                        className="h-11"
                        placeholder="Enter last name"
                        disabled={!!person.isBusiness}
                      />
                      {index === 0 && !person.isBusiness && errors.insuredLastName && (
                        <p className="text-sm text-red-600">{errors.insuredLastName}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Email</Label>
                      <Input
                        type="email"
                        value={person.email}
                        onChange={(e) =>
                          updateInsuredPerson(person.id, "email", e.target.value)
                        }
                        className="h-11"
                        placeholder="Enter email address"
                      />
                      {errors[`insuredEmail${index}`] && (
                        <p className="text-sm text-red-600">{errors[`insuredEmail${index}`]}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Phone</Label>
                      <Input
                        type="tel"
                        value={person.phone}
                        onChange={(e) =>
                          updateInsuredPerson(person.id, "phone", e.target.value)
                        }
                        className="h-11"
                        placeholder="(555) 123-4567"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Phone 2</Label>
                      <Input
                        type="tel"
                        value={person.phone2}
                        onChange={(e) =>
                          updateInsuredPerson(person.id, "phone2", e.target.value)
                        }
                        className="h-11"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex justify-start">
                <Button type="button" variant="outline" size="sm" onClick={addInsuredPerson} className="h-9">
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add Insured
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loss / Property Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPinIcon className="h-5 w-5 text-[#92C4D5]" />
              <span>Loss & Property Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Loss Address (formerly Property Address) */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900">Loss Address</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label className="text-sm font-medium">Street Address 1</Label>
                  <Input
                    value={formData.propertyAddress.street1}
                    onChange={(e) => updateNestedFormData("propertyAddress", "street1", e.target.value)}
                    className="h-11"
                    placeholder="Enter street address"
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label className="text-sm font-medium">Street Address 2</Label>
                  <Input
                    value={formData.propertyAddress.street2}
                    onChange={(e) => updateNestedFormData("propertyAddress", "street2", e.target.value)}
                    className="h-11"
                    placeholder="Apt, suite, etc. (optional)"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">City</Label>
                  <Input
                    value={formData.propertyAddress.city}
                    onChange={(e) => updateNestedFormData("propertyAddress", "city", e.target.value)}
                    className="h-11"
                    placeholder="Enter city"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">State</Label>
                  <Select
                    value={formData.propertyAddress.state}
                    onValueChange={(v) => updateNestedFormData("propertyAddress", "state", v)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {states.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">ZIP Code</Label>
                  <Input
                    value={formData.propertyAddress.zip}
                    onChange={(e) => updateNestedFormData("propertyAddress", "zip", e.target.value)}
                    className="h-11"
                    placeholder="12345"
                  />
                </div>
              </div>
            </div>

            {/* Mailing Address */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <h4 className="text-lg font-medium text-gray-900">Mailing Address</h4>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sameAsProperty"
                    checked={formData.sameAsProperty}
                    onCheckedChange={handleSameAsProperty}
                  />
                  <Label htmlFor="sameAsProperty" className="text-sm">
                    Same as Loss Address
                  </Label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label className="text-sm font-medium">Street Address 1</Label>
                  <Input
                    value={formData.mailingAddress.street1}
                    onChange={(e) => updateNestedFormData("mailingAddress", "street1", e.target.value)}
                    className="h-11"
                    placeholder="Enter street address"
                    disabled={formData.sameAsProperty}
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label className="text-sm font-medium">Street Address 2</Label>
                  <Input
                    value={formData.mailingAddress.street2}
                    onChange={(e) => updateNestedFormData("mailingAddress", "street2", e.target.value)}
                    className="h-11"
                    placeholder="Apt, suite, etc. (optional)"
                    disabled={formData.sameAsProperty}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">City</Label>
                  <Input
                    value={formData.mailingAddress.city}
                    onChange={(e) => updateNestedFormData("mailingAddress", "city", e.target.value)}
                    className="h-11"
                    placeholder="Enter city"
                    disabled={formData.sameAsProperty}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">State</Label>
                  <Select
                    value={formData.mailingAddress.state}
                    onValueChange={(v) => updateNestedFormData("mailingAddress", "state", v)}
                    disabled={formData.sameAsProperty}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {states.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">ZIP Code</Label>
                  <Input
                    value={formData.mailingAddress.zip}
                    onChange={(e) => updateNestedFormData("mailingAddress", "zip", e.target.value)}
                    className="h-11"
                    placeholder="12345"
                    disabled={formData.sameAsProperty}
                  />
                </div>
              </div>
            </div>

            {/* Additional Contacts */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900">Additional Contacts</h4>

              <Button type="button" variant="outline" size="sm" onClick={addAdditionalContact} className="h-9">
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Contact
              </Button>

              {additionalContacts.map((contact) => (
                <div key={contact.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h5 className="font-medium text-gray-900">Additional Contact</h5>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAdditionalContact(contact.id)}
                      className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">First Name</Label>
                      <Input
                        value={contact.firstName}
                        onChange={(e) =>
                          updateAdditionalContact(contact.id, "firstName", e.target.value)
                        }
                        className="h-11"
                        placeholder="Enter first name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Last Name</Label>
                      <Input
                        value={contact.lastName}
                        onChange={(e) =>
                          updateAdditionalContact(contact.id, "lastName", e.target.value)
                        }
                        className="h-11"
                        placeholder="Enter last name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Email</Label>
                      <Input
                        type="email"
                        value={contact.email}
                        onChange={(e) => updateAdditionalContact(contact.id, "email", e.target.value)}
                        className="h-11"
                        placeholder="Enter email address"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Phone</Label>
                      <Input
                        type="tel"
                        value={contact.phone}
                        onChange={(e) => updateAdditionalContact(contact.id, "phone", e.target.value)}
                        className="h-11"
                        placeholder="(555) 123-4567"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Contact Type</Label>
                      <Select
                        value={contact.contactType}
                        onValueChange={(v) => updateAdditionalContact(contact.id, "contactType", v)}
                        disabled={contactTypesLoading}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder={contactTypesLoading ? "Loading..." : "Select contact type"} />
                        </SelectTrigger>
                        <SelectContent>
                          {contactTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {contact.contactType === "Other" && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Custom Type</Label>
                        <Input
                          value={contact.customType || ""}
                          onChange={(e) =>
                            updateAdditionalContact(contact.id, "customType", e.target.value)
                          }
                          className="h-11"
                          placeholder="Enter custom type"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Primary Contact */}
              {(insuredPersons.length > 0 || additionalContacts.length > 0) && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Primary Contact</Label>
                  <Select
                    value={formData.primaryContact}
                    onValueChange={(v) => updateFormData("primaryContact", v as PrimaryContactValue)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select primary contact" />
                    </SelectTrigger>
                    <SelectContent>
                      {insuredPersons.map((person, index) => (
                        <SelectItem key={`insured-${person.id}`} value={`insured-${person.id}`}>
                          {person.isBusiness
                            ? `${person.orgName || "Business"}`
                            : `${person.firstName} ${person.lastName}`} {index === 0 ? "(Primary Insured)" : ""}
                        </SelectItem>
                      ))}
                      {additionalContacts.map((contact) => (
                        <SelectItem key={`contact-${contact.id}`} value={`contact-${contact.id}`}>
                          {contact.firstName} {contact.lastName} ({contact.contactType})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Loss Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileTextIcon className="h-5 w-5 text-[#92C4D5]" />
              <span>Loss Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Date of Loss</Label>
                <Input
                  type="date"
                  value={formData.dateOfLoss}
                  onChange={(e) => updateFormData("dateOfLoss", e.target.value)}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Date Received</Label>
                <Input
                  type="date"
                  value={formData.dateReceived}
                  onChange={(e) => updateFormData("dateReceived", e.target.value)}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Type of Loss</Label>
                <Select
                  value={formData.typeOfLoss}
                  onValueChange={(v) => updateFormData("typeOfLoss", v)} // v is ID now
                  disabled={lossCausesLoading}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder={lossCausesLoading ? "Loading..." : "Select loss type"} />
                  </SelectTrigger>
                  <SelectContent>
                    {lossCauses.map((cause) => (
                      <SelectItem key={cause.id} value={cause.id}>
                        {cause.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Assigned Manager</Label>
                <Select
                  value={formData.assignedManager}
                  onValueChange={(v) => updateFormData("assignedManager", v)}
                  disabled={staffLoading}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue
                      placeholder={staffLoading ? "Loading..." : "Select manager"}
                    >
                      {getStaffName(formData.assignedManager, staff) || (staffLoading ? "Loading..." : "Select manager")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Assigned Adjuster</Label>
                <Select
                  value={formData.assignedAdjuster}
                  onValueChange={(v) => updateFormData("assignedAdjuster", v)}
                  disabled={staffLoading}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue
                      placeholder={staffLoading ? "Loading..." : "Select adjuster"}
                    >
                      {getStaffName(formData.assignedAdjuster, staff) || (staffLoading ? "Loading..." : "Select adjuster")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Loss Description</Label>
              <Textarea
                value={formData.lossDescription}
                onChange={(e) => updateFormData("lossDescription", e.target.value)}
                className="min-h-[100px]"
                placeholder="Describe the loss in detail..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Policy Information (shown only if a policy number is provided) */}
        {formData.policyNumber.trim() && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BuildingIcon className="h-5 w-5 text-[#92C4D5]" />
                <span>Policy Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Effective Date</Label>
                  <Input
                    type="date"
                    value={formData.effectiveDate}
                    onChange={(e) => updateFormData("effectiveDate", e.target.value)}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Expiration Date</Label>
                  <Input
                    type="date"
                    value={formData.expirationDate}
                    onChange={(e) => updateFormData("expirationDate", e.target.value)}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Policy Type</Label>
                  <Select
                    value={formData.policyType}
                    onValueChange={(v) => updateFormData("policyType", v)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select policy type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Homeowner">Homeowner</SelectItem>
                      <SelectItem value="Commercial">Commercial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Form Numbers</Label>
                  <Input
                    value={formData.formNumbers}
                    onChange={(e) => updateFormData("formNumbers", e.target.value)}
                    className="h-11"
                    placeholder="Enter form numbers"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Deductible</Label>
                  <Input
                    value={formData.deductible}
                    onChange={(e) => updateFormData("deductible", e.target.value)}
                    className="h-11"
                    placeholder="$0.00"
                  />
                </div>
              </div>

              {/* Coverage Lines (max 8) */}
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-gray-900">Coverage Lines</h4>

                <div className="space-y-4">
                  {coverageLines.map((line, index) => (
                    <div key={line.id} className="grid grid-cols-12 gap-4 items-end">
                      <div className="col-span-12 md:col-span-5 space-y-2">
                        <Label className="text-sm font-medium">Description</Label>
                        <Input
                          value={line.description}
                          onChange={(e) => updateCoverageLine(line.id, "description", e.target.value)}
                          className="h-11"
                          placeholder="Enter coverage description"
                        />
                      </div>

                      <div className="col-span-12 md:col-span-5 space-y-2">
                        <Label className="text-sm font-medium">Amount</Label>
                        <Input
                          value={line.amount}
                          onChange={(e) => updateCoverageLine(line.id, "amount", e.target.value)}
                          className="h-11"
                          placeholder="$0.00"
                        />
                      </div>

                      <div className="col-span-12 md:col-span-2 flex justify-end items-center">
                        {coverageLines.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCoverageLine(line.id)}
                            className="text-red-600 hover:text-red-700 h-11 w-11 p-0"
                          >
                            <XIcon className="h-4 w-4" />
                          </Button>
                        )}

                        {index === coverageLines.length - 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addCoverageLine}
                            className="h-9 ml-2"
                          >
                            <PlusIcon className="h-4 w-4 mr-1" />
                            Add Coverage
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end space-x-4 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="h-11 px-6"
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => handleSubmit("submitAndAdd")}
            disabled={isSubmitting}
            className="h-11 px-6"
          >
            {isSubmitting ? "Submitting..." : "Submit and Add Another"}
          </Button>

          <Button
            type="button"
            onClick={() => handleSubmit("submit")}
            disabled={isSubmitting}
            className="bg-[#92C4D5] hover:bg-[#7BB3C7] text-white h-11 px-6"
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
        </div>
      </form>
    </div>
  );
}
