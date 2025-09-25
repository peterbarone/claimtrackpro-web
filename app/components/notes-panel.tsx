import { Badge } from "@/components/ui/badge";

export type NoteItem = {
  id: string;
  note: string;
  visibility?: string | null;
  date_created?: string | null;
};

export function NotesPanel({ notes }: { notes: NoteItem[] }) {
  const sorted = [...notes].sort((a, b) => {
    const da = a.date_created ? new Date(a.date_created).getTime() : 0;
    const db = b.date_created ? new Date(b.date_created).getTime() : 0;
    return db - da; // newest first
  });

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Notes</h3>
        <p className="text-sm text-gray-500 mt-1">
          {sorted.length} note{sorted.length !== 1 ? "s" : ""}
        </p>
      </div>
      <div className="p-4 space-y-3">
        {sorted.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No notes yet</p>
          </div>
        ) : (
          sorted.map((n) => (
            <div key={n.id} className="border rounded-lg p-3 bg-white">
              <div className="flex items-center justify-between mb-2">
                <Badge className="text-xs">{n.visibility || "unknown"}</Badge>
                {n.date_created && (
                  <span className="text-xs text-gray-500">
                    {new Date(n.date_created).toLocaleString()}
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-800 whitespace-pre-wrap">
                {n.note}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
