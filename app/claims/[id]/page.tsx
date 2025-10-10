"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ClaimInfoHeader } from "@/components/claim-info-header";
import { ProgressBar } from "@/components/progress-bar";
import {
  ClaimTimeline,
  TimelineItem as UITimelineItem,
} from "@/components/claim-timeline";
import { QuickActions } from "@/components/quick-actions";
import { ActiveTasksPanel } from "@/components/active-tasks-panel";
import AppShell from "@/components/AppShell";
// Modal and ClaimTaskForm imports (deduplicated)
import { Modal } from "@/components/ui/modal";
import { ClaimTaskForm } from "@/components/claim-task-form";
import { ClaimNoteForm } from "@/components/claim-note-form";
import { NotesPanel, NoteItem } from "@/components/notes-panel";
import { FilesPanel, ClaimFile } from "@/components/files-panel";
import { FileUploadForm } from "@/components/file-upload-form";
import { ClaimEditForm } from "@/components/claim-edit-form";
import { ClaimMessagesPanel } from "@/components/claim-messages-panel";

/* ========= Inline shared types (no server import needed) ========= */
type HeaderProps = {
  claimNumber: string;
  insuredName: string;
  daysOpen: number;
  status: "open" | "in-review" | "closed" | "pending";
  claimContacts: Array<{ name: string; role: string }>;
  lossAddress: string;
  mailingAddress: string;
  dateOfLoss: string;
  dateReceived: string;
  clientCompany: string;
  clientContact: string;
  description?: string;
  claimType?: string;
  participants: Array<{ id: string; name: string; role: string }>;
};

type Milestone = {
  id: string;
  label: string;
  date: string;
  completed: boolean;
};

type ActiveTask = {
  id: string;
  title: string;
  priority: "low" | "medium" | "high";
  dueDate: string;
  assignedPerson: string;
  description?: string;
};

async function fetchClaimTasks(
  claimId: string | number
): Promise<ActiveTask[]> {
  // You likely have this; otherwise create /api/claims/[id]/tasks returning { data: ActiveTask[] }
  const r = await fetch(`/api/claims/${claimId}/tasks`, { cache: "no-store" });
  if (!r.ok) throw new Error(`Failed to load tasks (${r.status})`);
  const json = await r.json();
  return (json?.data || []) as ActiveTask[];
}

export default function ClaimDetailsClient() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const claimId = params?.id as string | undefined;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [header, setHeader] = useState<HeaderProps | null>(null);
  // Store full claim response for edit modal initial values
  const [claimData, setClaimData] = useState<any | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [timeline, setTimeline] = useState<UITimelineItem[]>([]);
  const [tasks, setTasks] = useState<ActiveTask[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [files, setFiles] = useState<ClaimFile[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTasks, setActiveTasks] = useState<ActiveTask[]>([]);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [addNoteOpen, setAddNoteOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  async function refreshTasks() {
    if (!claimId) return;
    try {
      const r = await fetch(
        `/api/claims/${encodeURIComponent(claimId)}/tasks`,
        {
          cache: "no-store",
        }
      );
      if (!r.ok) return;
      const json = await r.json();
      const list = Array.isArray(json?.data) ? json.data : [];
      // Only include tasks that appear active; map to panel shape
      const inactive = new Set([
        "done",
        "completed",
        "closed",
        "canceled",
        "cancelled",
      ]);
      const mapped: ActiveTask[] = list
        .filter(
          (t: any) => !inactive.has(String(t?.status || "").toLowerCase())
        )
        .map((t: any) => ({
          id: String(t.id),
          title: t.title ?? "",
          priority:
            t.priority === "urgent"
              ? "high"
              : ["low", "medium", "high"].includes(String(t.priority))
              ? (t.priority as "low" | "medium" | "high")
              : "medium",
          // Fallback to date_created when due_date is missing so sorting remains stable
          dueDate:
            t.due_date || t.date_created
              ? new Date(t.due_date || t.date_created)
                  .toISOString()
                  .slice(0, 10)
              : new Date().toISOString().slice(0, 10),
          assignedPerson: t?.assignee?.name || "Unassigned",
          description: t.details || "",
        }));
      setTasks(mapped);
      setActiveTasks(mapped);
    } catch {
      // swallow for now; could show toast
    }
  }

  useEffect(() => {
    setActiveTasks(tasks);
  }, [tasks]);
  async function refreshNotes() {
    if (!claimId) return;
    try {
      const r = await fetch(
        `/api/claims/${encodeURIComponent(claimId)}/notes`,
        {
          cache: "no-store",
        }
      );
      if (!r.ok) return;
      const json = await r.json();
      const list = Array.isArray(json?.data) ? json.data : [];
      const mapped: NoteItem[] = list.map((n: any) => ({
        id: String(n.id),
        note: n.note ?? "",
        visibility: n.visibility ?? null,
        date_created: n.date_created ?? null,
      }));
      setNotes(mapped);
    } catch {
      // swallow
    }
  }

  async function refreshFiles() {
    if (!claimId) return;
    try {
      const r = await fetch(
        `/api/claims/${encodeURIComponent(claimId)}/files`,
        { cache: "no-store" }
      );
      if (!r.ok) return;
      const json = await r.json();
      const list = Array.isArray(json?.data) ? json.data : [];
      setFiles(list as ClaimFile[]);
    } catch {}
  }

  // initial load of notes
  useEffect(() => {
    refreshNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimId]);

  // initial load of tasks
  useEffect(() => {
    refreshTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimId]);

  // initial load of files
  useEffect(() => {
    refreshFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimId]);

  const loadClaimAndHeader = useCallback(async () => {
    if (!claimId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/claims/${encodeURIComponent(claimId)}`, {
        method: "GET",
        cache: "no-store",
      });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) {
        if (res.status === 404) setError("Claim not found");
        else {
          const body = await res.json().catch(() => ({} as any));
          setError(body?.detail || body?.error || `Failed (${res.status})`);
        }
        return;
      }
      const body = await res.json();
      const claim = body?.data;
      if (!claim) {
        setError("Missing claim data");
        return;
      }
      // Keep raw claim for edit form initial values (description, status, etc.)
      setClaimData(claim);
      const personToName = (
        p?: { first_name?: string; last_name?: string } | null
      ) => {
        const first = (p?.first_name || "").trim();
        const last = (p?.last_name || "").trim();
        const full = `${first} ${last}`.trim();
        return full || "Unknown";
      };
      const fmtDate = (d?: string | null) => {
        if (!d) return "";
        const date = new Date(d);
        return isNaN(date.getTime())
          ? ""
          : date.toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            });
      };
      const daysBetween = (start?: string | null, end: Date = new Date()) => {
        if (!start) return 0;
        const s = new Date(start);
        if (isNaN(s.getTime())) return 0;
        return Math.max(
          0,
          Math.floor((end.getTime() - s.getTime()) / (1000 * 60 * 60 * 24))
        );
      };
      const toHeaderStatus = (
        s?: string | null
      ): "open" | "in-review" | "closed" | "pending" => {
        const v = (s || "").toLowerCase();
        if (v.includes("clos")) return "closed";
        if (v.includes("review") || v.includes("approv")) return "in-review";
        if (v.includes("hold") || v.includes("pend")) return "pending";
        return "open";
      };
      const lossLocationToString = (loc?: any) => {
        if (!loc) return "";
        const line = [loc.street_1, loc.street_2].filter(Boolean).join(" ");
        const cityStateZip = [loc.city, loc.state, loc.postal_code]
          .filter(Boolean)
          .join(", ")
          .replace(/,\s+,/g, ", ");
        return [line, cityStateZip].filter(Boolean).join(", ");
      };
      // Compute days open from date_received (preferred) else fallback to reported/created
      const sourceDateForDays =
        claim.date_received || claim.reported_date || claim.date_created;
      const mappedHeader: HeaderProps = {
        claimNumber: claim.claim_number || claim.id || "",
        insuredName: personToName(claim.primary_insured),
        daysOpen: daysBetween(sourceDateForDays),
        status: toHeaderStatus(
          claim?.status?.name || claim?.status?.status || claim?.status?.code
        ),
        claimContacts: [
          { name: personToName(claim.primary_insured), role: "Insured" },
          claim.assigned_to_user
            ? {
                name: personToName(claim.assigned_to_user),
                role: "Assigned Adjuster",
              }
            : null,
          claim.carrier_contact_id
            ? {
                name: personToName(claim.carrier_contact_id),
                role: "Client Contact",
              }
            : null,
        ].filter(Boolean) as Array<{ name: string; role: string }>,
        lossAddress: lossLocationToString(claim.loss_location),
        mailingAddress: lossLocationToString(claim.loss_location),
        dateOfLoss: fmtDate(claim.date_of_loss),
        // Prefer explicit date_received if present, fallback to reported_date then creation date
        dateReceived: fmtDate(
          claim.date_received || claim.reported_date || claim.date_created
        ),
        clientCompany: claim?.carrier?.name || "",
        clientContact: claim?.carrier_contact_id
          ? personToName(claim.carrier_contact_id)
          : "",
        description: claim?.description || undefined,
        claimType:
          claim?.claim_type?.name || claim?.claim_type?.code || undefined,
        participants: [
          {
            id: "insured",
            name: personToName(claim.primary_insured),
            role: "Insured",
          },
          claim.assigned_to_user
            ? {
                id: String(claim.assigned_to_user.id ?? "assignee"),
                name: personToName(claim.assigned_to_user),
                role: "Assigned Adjuster",
              }
            : null,
          claim.carrier_contact_id
            ? {
                id: String(claim.carrier_contact_id.id ?? "carrier_contact"),
                name: personToName(claim.carrier_contact_id),
                role: "Client Contact",
              }
            : null,
        ].filter(Boolean) as Array<{ id: string; name: string; role: string }>,
      };
      const mappedMilestones: Milestone[] = [
        {
          id: "reported",
          label: "Reported",
          date: fmtDate(claim.reported_date || claim.date_created),
          completed: true,
        },
        {
          id: "assigned",
          label: "Assigned",
          date: fmtDate(claim.date_created),
          completed: !!claim.assigned_to_user,
        },
        { id: "inspection", label: "Inspection", date: "", completed: false },
        { id: "estimate", label: "Estimate", date: "", completed: false },
        {
          id: "closed",
          label: "Closed",
          date: "",
          completed: mappedHeader.status === "closed",
        },
      ];
      setHeader(mappedHeader);
      setMilestones(mappedMilestones);
    } catch (e) {
      setError(e?.message || "Failed to load claim");
    } finally {
      setLoading(false);
    }
  }, [claimId, router]);

  const loadTimeline = useCallback(async () => {
    if (!claimId) return;
    try {
      const r = await fetch(
        `/api/claims/${encodeURIComponent(claimId)}/timeline`,
        { cache: "no-store" }
      );
      if (!r.ok) return;
      const json = await r.json();
      const list = Array.isArray(json?.data) ? json.data : [];
      setTimeline(list as UITimelineItem[]);
    } catch {}
  }, [claimId]);

  useEffect(() => {
    loadClaimAndHeader();
    loadTimeline();
  }, [loadClaimAndHeader, loadTimeline]);

  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return timeline;
    const q = searchQuery.toLowerCase();
    return timeline.filter(
      (e) =>
        e.action.toLowerCase().includes(q) ||
        (e.description ?? "").toLowerCase().includes(q) ||
        (e.user ?? "").toLowerCase().includes(q)
    );
  }, [timeline, searchQuery]);

  function handleQuickAction(action: string) {
    // Wire these to real flows when ready
    alert(`${action} — coming soon`);
  }

  function handleTaskAction(
    action: "complete" | "cancel" | "edit",
    id: string
  ) {
    if (action === "complete" || action === "cancel") {
      setActiveTasks((prev) => prev.filter((t) => t.id !== id));
    }
    alert(`${action} task ${id}`);
  }

  if (loading) {
    return (
      <AppShell>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Loading…</h1>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            Loading claim details…
          </div>
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Error</h1>
          </div>
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
            {error}
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Title */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">
            {header?.claimNumber || ""}
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setEditOpen(true)}
              className="px-4 py-2 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50"
            >
              Edit Claim
            </button>
          </div>
        </div>

        {/* Polymet Header */}
        {header && <ClaimInfoHeader {...header} />}

        {/* Milestones */}
        <ProgressBar milestones={milestones} />

        {/* Content */}
        <div className="flex flex-col lg:flex-row gap-6 min-h-[600px]">
          {/* Left column */}
          <div className="lg:w-1/3 flex flex-col space-y-6">
            <QuickActions
              onAddNote={() => setAddNoteOpen(true)}
              onUploadDocument={() => setUploadOpen(true)}
              onCreateTask={() => setAddTaskOpen(true)}
              onPhoneCall={() => handleQuickAction("Phone Call")}
              onEmail={() => handleQuickAction("Email")}
            />

            <div className="flex-1">
              <ActiveTasksPanel
                tasks={activeTasks}
                onMarkComplete={(taskId) =>
                  handleTaskAction("complete", taskId)
                }
                onEditTask={(taskId) => handleTaskAction("edit", taskId)}
                onCancelTask={(taskId) => handleTaskAction("cancel", taskId)}
              />
            </div>

            {/* NEW: Messages */}
              {claimId && <ClaimMessagesPanel claimId={String(claimId)} />}

            <div className="flex-1">
              <ActiveTasksPanel
                tasks={activeTasks}
                onMarkComplete={(taskId) => handleTaskAction("complete", taskId)}
                onEditTask={(taskId) => handleTaskAction("edit", taskId)}
                onCancelTask={(taskId) => handleTaskAction("cancel", taskId)}
              />
            </div>

            {/* Notes below the task panel */}
            <NotesPanel notes={notes} />

            {/* Files below notes */}
            <FilesPanel files={files} />
          </div>

          {/* Right column */}
          <div className="lg:w-2/3 flex flex-col space-y-4">
            {/* Search */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search timeline events..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Claim Timeline
                </h2>
                <span className="text-sm text-gray-500">
                  {filteredEvents.length} event
                  {filteredEvents.length !== 1 ? "s" : ""}
                </span>
              </div>

              {filteredEvents.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
                  <p className="text-gray-500">
                    No events match your current search.
                  </p>
                </div>
              ) : (
                <ClaimTimeline items={filteredEvents} />
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Add Task Modal */}
      <Modal
        open={addTaskOpen}
        onClose={() => setAddTaskOpen(false)}
        title="Add Task to Claim"
      >
        <ClaimTaskForm
          claimId={String(claimId)}
          onCreated={async () => {
            await refreshTasks();
            await loadTimeline(); // reflect new task in timeline
            setAddTaskOpen(false);
          }}
        />
      </Modal>

      {/* Add Note Modal */}
      <Modal
        open={addNoteOpen}
        onClose={() => setAddNoteOpen(false)}
        title="Add Note to Claim"
      >
        <ClaimNoteForm
          claimId={String(claimId)}
          onCreatedAction={async () => {
            await refreshNotes();
            await loadTimeline(); // reflect new note
            setAddNoteOpen(false);
          }}
        />
      </Modal>

      {/* Upload File Modal */}
      <Modal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Upload File"
      >
        <FileUploadForm
          claimId={String(claimId)}
          onUploadedAction={async () => {
            await refreshFiles();
            await loadTimeline(); // reflect new document
            setUploadOpen(false);
          }}
        />
      </Modal>

      {/* Edit Claim Modal */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Claim"
      >
        {header && claimData && (
          <ClaimEditForm
            claimId={String(claimId)}
            initial={{
              description: claimData.description ?? "",
              statusId: claimData?.status?.id ?? null,
              assignedToUserId: claimData?.assigned_to_user?.id ?? null,
              assignedManagerId: claimData?.assigned_manager?.id ?? null,
              dateOfLoss: claimData?.date_of_loss ?? null,
              claimTypeId: claimData?.claim_type?.id ?? null,
              participants: Array.isArray(claimData?.claims_contacts)
                ? claimData.claims_contacts.map((cc: any) => ({
                    id: String(cc.id), // junction id used for remove
                    role: cc.role || "",
                    contactId: cc?.contacts_id?.id
                      ? String(cc.contacts_id.id)
                      : "",
                    name:
                      [cc?.contacts_id?.first_name, cc?.contacts_id?.last_name]
                        .filter(Boolean)
                        .join(" ") || "Unknown",
                  }))
                : [],
            }}
            onSavedAction={async () => {
              await loadClaimAndHeader();
              await loadTimeline();
              setEditOpen(false);
            }}
            onCancelAction={() => setEditOpen(false)}
          />
        )}
      </Modal>
    </AppShell>
  );
}
