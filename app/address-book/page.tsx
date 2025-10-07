"use client";

import { useEffect, useState } from "react";
import {
  formatPhoneWithExt,
  formatPhone,
  normalizeExtension,
} from "@/lib/utils";
import PhoneField from "@/components/phone-field";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Search as SearchIcon,
  Plus as PlusIcon,
  Pencil as PencilIcon,
  Loader2 as LoaderIcon,
  X as XIcon,
} from "lucide-react";

interface ContactItem {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  company: string;
  phone: string;
  phone_ext?: string;
  email: string;
  notes: string;
  name: string; // computed
}

interface EditableContactPayload {
  first_name?: string;
  last_name?: string;
  role?: string;
  company?: string;
  phone?: string;
  phone_ext?: string;
  email?: string;
  notes?: string;
}

export default function AddressBookPage() {
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  // Map of role id -> role name for display
  const [rolesMap, setRolesMap] = useState<Record<string, string>>({});
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  // Add/Edit modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editing, setEditing] = useState<ContactItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form fields (shared for add/edit)
  const emptyForm: EditableContactPayload = {
    first_name: "",
    last_name: "",
    role: "",
    company: "",
    phone: "",
    phone_ext: "",
    email: "",
    notes: "",
  };
  const [form, setForm] = useState<EditableContactPayload>(emptyForm);
  const updateForm = (k: keyof EditableContactPayload, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  function resetForm() {
    setForm(emptyForm);
    setError(null);
  }

  const loadContacts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/contacts");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load contacts");
      const list: ContactItem[] = Array.isArray(json?.data) ? json.data : [];
      setContacts(list);
    } catch (e) {
      setError(e.message || String(e));
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadContacts();
  }, []);
  useEffect(() => {
    setRolesLoading(true);
    fetch("/api/roles")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.data)) {
          const map: Record<string, string> = {};
          const arr: { id: string; name: string }[] = [];
          data.data.forEach((r: any) => {
            if (r?.id) {
              const nm = r.name || r.label || r.id;
              map[String(r.id)] = nm;
              arr.push({ id: String(r.id), name: nm });
            }
          });
          setRolesMap(map);
          setRoles(arr);
        }
      })
      .catch(() => {})
      .finally(() => setRolesLoading(false));
  }, []);

  // Add contact creation disabled (button removed)
  const openAdd = () => {};
  const openEdit = (c: ContactItem) => {
    setEditing(c);
    setForm({
      first_name: c.first_name,
      last_name: c.last_name,
      role: c.role,
      company: c.company,
      phone: c.phone,
      phone_ext: c.phone_ext || "",
      email: c.email,
      notes: c.notes,
    });
    setIsEditOpen(true);
  };

  const validate = () => {
    if (!form.company && !form.first_name && !form.last_name)
      return "Provide a company or a first/last name";
    if (form.email && !/^([^\s@]+)@([^\s@]+)\.[^\s@]+$/.test(form.email))
      return "Invalid email";
    return null;
  };

  const submitAdd = async () => {
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload: EditableContactPayload = {};
      Object.entries(form).forEach(([k, v]) => {
        if (v && v.toString().trim() !== "") {
          if (k === "phone_ext")
            (payload as any)[k] = normalizeExtension(String(v));
          else (payload as any)[k] = v;
        }
      });
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to create contact");
      setIsAddOpen(false);
      resetForm();
      loadContacts();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const submitEdit = async () => {
    if (!editing) return;
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload: EditableContactPayload = {};
      Object.entries(form).forEach(([k, v]) => {
        (payload as any)[k] =
          k === "phone_ext" ? normalizeExtension(String(v || "")) : v;
      });
      const res = await fetch(`/api/contacts/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to update contact");
      setIsEditOpen(false);
      setEditing(null);
      resetForm();
      loadContacts();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = contacts.filter((c) => {
    if (!filter.trim()) return true;
    const f = filter.toLowerCase();
    return [c.first_name, c.last_name, c.company, c.role, c.email].some((v) =>
      (v || "").toLowerCase().includes(f)
    );
  });

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Address Book</h1>
          <p className="text-gray-600">Manage all contacts</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <SearchIcon className="h-4 w-4" /> Search
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4 md:items-center">
              <div className="flex-1">
                <Input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Search name, company, role, email"
                  className="h-11"
                />
              </div>
              <div className="text-sm text-gray-500">
                {filtered.length} / {contacts.length} shown
              </div>
            </div>
            {loading && (
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <LoaderIcon className="h-4 w-4 animate-spin" /> Loading
                contacts...
              </div>
            )}
            {error && !loading && (
              <div className="text-sm text-red-600">{error}</div>
            )}
            {!loading && !error && filtered.length === 0 && (
              <div className="text-sm text-gray-500">
                No contacts match your search.
              </div>
            )}
            {!loading && !error && filtered.length > 0 && (
              <div className="overflow-x-auto border rounded-md">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr className="text-left">
                      <th className="py-2 px-3 font-medium">Name</th>
                      <th className="py-2 px-3 font-medium">Company</th>
                      <th className="py-2 px-3 font-medium">Role</th>
                      <th className="py-2 px-3 font-medium">Email</th>
                      <th className="py-2 px-3 font-medium">Phone</th>
                      <th className="py-2 px-3 font-medium w-10">Edit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c) => (
                      <tr key={c.id} className="border-t hover:bg-gray-50">
                        <td className="py-2 px-3">
                          {c.name ||
                            (c.first_name + " " + c.last_name).trim() ||
                            c.email ||
                            c.company ||
                            "Unnamed"}
                        </td>
                        <td className="py-2 px-3">{c.company}</td>
                        <td className="py-2 px-3">
                          {rolesMap[c.role] || c.role || ""}
                        </td>
                        <td className="py-2 px-3">{c.email}</td>
                        <td className="py-2 px-3">
                          {formatPhoneWithExt(c.phone, c.phone_ext)}
                        </td>
                        <td className="py-2 px-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEdit(c)}
                            className="h-8 px-2"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Contact Dialog */}
        <Dialog
          open={isAddOpen}
          onOpenChange={(o) => {
            setIsAddOpen(o);
            if (!o) resetForm();
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>New Contact</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <ContactFormFields
                form={form}
                updateForm={updateForm}
                roles={roles}
                rolesLoading={rolesLoading}
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
            <DialogFooter className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddOpen(false);
                  resetForm();
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={submitAdd}
                disabled={submitting}
                className="bg-[#92C4D5] hover:bg-[#7BB3C7] text-white"
              >
                {submitting ? "Saving..." : "Save Contact"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Contact Dialog */}
        <Dialog
          open={isEditOpen}
          onOpenChange={(o) => {
            setIsEditOpen(o);
            if (!o) {
              setEditing(null);
              resetForm();
            }
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Contact</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <ContactFormFields
                form={form}
                updateForm={updateForm}
                roles={roles}
                rolesLoading={rolesLoading}
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
            <DialogFooter className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditOpen(false);
                  setEditing(null);
                  resetForm();
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={submitEdit}
                disabled={submitting}
                className="bg-[#92C4D5] hover:bg-[#7BB3C7] text-white"
              >
                {submitting ? "Updating..." : "Update Contact"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}

function ContactFormFields({
  form,
  updateForm,
  roles,
  rolesLoading,
}: {
  form: EditableContactPayload;
  updateForm: (k: keyof EditableContactPayload, v: string) => void;
  roles: { id: string; name: string }[];
  rolesLoading: boolean;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium">First Name</Label>
        <Input
          value={form.first_name}
          onChange={(e) => updateForm("first_name", e.target.value)}
          className="h-11"
          placeholder="John"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium">Last Name</Label>
        <Input
          value={form.last_name}
          onChange={(e) => updateForm("last_name", e.target.value)}
          className="h-11"
          placeholder="Doe"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium">Company</Label>
        <Input
          value={form.company}
          onChange={(e) => updateForm("company", e.target.value)}
          className="h-11"
          placeholder="Company Inc"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium">Role</Label>
        <Select
          value={form.role || ""}
          onValueChange={(v) => updateForm("role", v)}
          disabled={rolesLoading}
        >
          <SelectTrigger className="h-11">
            <SelectValue
              placeholder={rolesLoading ? "Loading..." : "Select role"}
            />
          </SelectTrigger>
          <SelectContent>
            {roles.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium">Email</Label>
        <Input
          type="email"
          value={form.email}
          onChange={(e) => updateForm("email", e.target.value)}
          className="h-11"
          placeholder="name@example.com"
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <PhoneField
          label="Phone"
          value={form.phone || ""}
          extValue={form.phone_ext || ""}
          onChangePhoneAction={(v) => updateForm("phone", v)}
          onChangeExtAction={(v) => updateForm("phone_ext", v)}
        />
      </div>
      <div className="md:col-span-2 space-y-2">
        <Label className="text-sm font-medium">Notes</Label>
        <Textarea
          value={form.notes}
          onChange={(e) => updateForm("notes", e.target.value)}
          placeholder="Internal notes..."
          className="min-h-[80px]"
        />
      </div>
      <p className="text-xs text-gray-500 md:col-span-2">
        Provide at least a company or first/last name. Email validated if
        present.
      </p>
    </div>
  );
}
