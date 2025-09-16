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

// Lucide: import real names and alias to *Icon for your JSX
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

interface InsuredPerson {
  id: string;
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
  clientCompany: string;
  clientContact: string;
  claimNumber: string;
  policyNumber: string;

  // Addresses
  propertyAddress: Address;
  mailingAddress: Address;
  sameAsProperty: boolean;
  primaryContact: PrimaryContactValue;

  // Loss
  dateOfLoss: string;
  dateReceived: string;
  typeOfLoss: string;
  lossDescription: string;
  assignedManager: string;
  assignedAdjuster: string;

  // Policy
  effectiveDate: string;
  expirationDate: string;
  policyType: string;
  formNumbers: string;
  deductible: string;
}

export function ClaimIntake() {
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
    typeOfLoss: "",
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

  const [insuredPersons, setInsuredPersons] = useState<InsuredPerson[]>([
    { id: "1", firstName: "", lastName: "", email: "", phone: "", phone2: "" },
  ]);

  const [additionalContacts, setAdditionalContacts] = useState<
    AdditionalContact[]
  >([]);
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

  // Sample data
  const clientCompanies = [
    "Springfield Insurance Group",
    "Metro Insurance Co.",
    "National Claims Services",
    "Regional Insurance Partners",
  ] as const;

  const clientContacts: Record<(typeof clientCompanies)[number], string[]> = {
    "Springfield Insurance Group": ["Robert Taylor", "Jennifer Brown", "Mike Wilson"],
    "Metro Insurance Co.": ["Sarah Davis", "John Smith", "Lisa Martinez"],
    "National Claims Services": ["David Chen", "Maria Garcia", "James Wilson"],
    "Regional Insurance Partners": ["Emily Johnson", "Michael Brown", "Amanda Taylor"],
  };

  const states = [
    "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
  ];

  const lossTypes = [
    "Fire","Water Damage","Wind","Hail","Theft","Vandalism","Vehicle","Weight of Ice and Snow","Other",
  ];

  const managers = ["Mike Wilson", "Jennifer Brown", "David Chen", "Lisa Martinez"];
  const adjusters = ["Sarah Johnson", "Robert Taylor", "Emily Davis", "James Wilson"];
  const contactTypes = ["Public Adjuster", "Contractor", "Attorney", "Family Member", "Other"];

  // Helpers
  const updateFormData = <K extends keyof ClaimFormData>(field: K, value: ClaimFormData[K]) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      // Auto-calc expiration when effectiveDate set
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
      { id: newId, firstName: "", lastName: "", email: "", phone: "", phone2: "" },
    ]);
  };

  const removeInsuredPerson = (id: string) => {
    if (insuredPersons.length > 1) {
      setInsuredPersons((prev) => prev.filter((p) => p.id !== id));
      // If primaryContact pointed to the removed person, reset to insured-1
      setFormData((prev) =>
        prev.primaryContact === (`insured-${id}` as PrimaryContactValue)
          ? { ...prev, primaryContact: "insured-1" }
          : prev
      );
    }
  };

  const updateInsuredPerson = (id: string, field: keyof InsuredPerson, value: string) => {
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

  const updateAdditionalContact = (
    id: string,
    field: keyof AdditionalContact,
    value: string
  ) => {
    setAdditionalContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  // Coverage lines
  const addCoverageLine = () => {
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

  // Validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.clientCompany) newErrors.clientCompany = "Client Company is required";
    if (!formData.claimNumber) newErrors.claimNumber = "Claim Number is required";
    if (!formData.policyNumber) newErrors.policyNumber = "Policy Number is required";
    if (!insuredPersons[0].firstName) newErrors.insuredFirstName = "Insured First Name is required";
    if (!insuredPersons[0].lastName) newErrors.insuredLastName = "Insured Last Name is required";

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
      // TODO: call your API here
      await new Promise((r) => setTimeout(r, 800));

      console.log("Form submitted:", {
        formData,
        insuredPersons,
        additionalContacts,
        coverageLines,
        submitType,
      });

      if (submitType === "submitAndAdd") {
        // reset but keep today’s date for received; and keep at least one insured
        setFormData({ ...initialForm, dateReceived: getCurrentDate() });
        setInsuredPersons([{ id: "1", firstName: "", lastName: "", email: "", phone: "", phone2: "" }]);
        setAdditionalContacts([]);
        setCoverageLines([{ id: "1", description: "", amount: "" }]);
        setErrors({});
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("Submission error:", err);
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
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select client company" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientCompanies.map((company) => (
                      <SelectItem key={company} value={company}>
                        {company}
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
                  disabled={!formData.clientCompany}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select client contact" />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.clientCompany &&
                      clientContacts[formData.clientCompany as keyof typeof clientContacts]?.map(
                        (contact) => (
                          <SelectItem key={contact} value={contact}>
                            {contact}
                          </SelectItem>
                        )
                      )}
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

              {/* Policy Number */}
              <div className="space-y-2">
                <Label htmlFor="policyNumber" className="text-sm font-medium">
                  Policy Number *
                </Label>
                <Input
                  id="policyNumber"
                  value={formData.policyNumber}
                  onChange={(e) => updateFormData("policyNumber", e.target.value)}
                  className="h-11"
                  placeholder="Enter policy number"
                />
                {errors.policyNumber && (
                  <p className="text-sm text-red-600">{errors.policyNumber}</p>
                )}
              </div>
            </div>

            {/* Insured Persons */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900">Insured Persons</h4>

              {insuredPersons.map((person, index) => (
                <div key={person.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h5 className="font-medium text-gray-900">
                      {index === 0 ? "Primary Insured" : `Additional Insured ${index}`}
                    </h5>
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

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        First Name {index === 0 && "*"}
                      </Label>
                      <Input
                        value={person.firstName}
                        onChange={(e) =>
                          updateInsuredPerson(person.id, "firstName", e.target.value)
                        }
                        className="h-11"
                        placeholder="Enter first name"
                      />
                      {index === 0 && errors.insuredFirstName && (
                        <p className="text-sm text-red-600">{errors.insuredFirstName}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Last Name {index === 0 && "*"}
                      </Label>
                      <Input
                        value={person.lastName}
                        onChange={(e) =>
                          updateInsuredPerson(person.id, "lastName", e.target.value)
                        }
                        className="h-11"
                        placeholder="Enter last name"
                      />
                      {index === 0 && errors.insuredLastName && (
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

        {/* Property Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPinIcon className="h-5 w-5 text-[#92C4D5]" />
              <span>Property Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Property Address */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900">Property Address</h4>
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
                    Same as Property Address
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
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select contact type" />
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
                          {person.firstName} {person.lastName} {index === 0 ? "(Primary Insured)" : ""}
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
                  onValueChange={(v) => updateFormData("typeOfLoss", v)}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select loss type" />
                  </SelectTrigger>
                  <SelectContent>
                    {lossTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
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
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select manager" />
                  </SelectTrigger>
                  <SelectContent>
                    {managers.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
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
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select adjuster" />
                  </SelectTrigger>
                  <SelectContent>
                    {adjusters.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
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

        {/* Policy Information */}
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

            {/* Coverage Lines */}
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
