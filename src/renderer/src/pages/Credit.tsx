import { useEffect, useState, useMemo } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Archive,
  Search,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { ipc, formatDate, formatAmount, toInputDate } from "../lib/ipc";
import Modal, { Field, inputCls } from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import Pagination from "../components/Pagination";
import GroupPanel, { type GColumn } from "../components/GroupPanel";
import type { CreditEntry } from "../lib/types";

type SortKey = keyof CreditEntry;
type SortDir = "asc" | "desc";

interface FormState {
  date: string;
  reference: string;
  purpose: string;
  particulars: string;
  amount: string;
}

export default function CreditPage() {
  const [rows, setRows] = useState<CreditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [sortKey, setSortKey] = useState<SortKey>("serialNumber");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const [grouped, setGrouped] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [editRow, setEditRow] = useState<CreditEntry | null>(null);
  const [deleteRow, setDeleteRow] = useState<CreditEntry | null>(null);
  const [showArchive, setShowArchive] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<FormState>({
    date: "",
    reference: "",
    purpose: "",
    particulars: "",
    amount: "",
  });

  async function load() {
    setLoading(true);
    try {
      setRows(await ipc.credit.getAll());
    } catch {
      toast.error("Failed to load entries");
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const t = (e as CustomEvent).detail?.type;
      if (t === "credit" || t === "project") load();
    };
    window.addEventListener("quick-add-success", handler);
    return () => window.removeEventListener("quick-add-success", handler);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, sortKey, sortDir, perPage]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [
        r.serialNumber.toString(),
        r.date.split("T")[0],
        r.particulars,
        r.reference ?? "",
        r.purpose ?? "",
        String(r.amount),
        String(r.total),
      ].some((f) => f.toLowerCase().includes(q)),
    );
  }, [rows, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? "",
        bv = b[sortKey] ?? "";
      const cmp =
        typeof av === "number"
          ? (av as number) - (bv as number)
          : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
  const paginated = sorted.slice((page - 1) * perPage, page * perPage);

  const groupedRows = useMemo(
    () => (grouped ? rows.filter((r) => r.particulars === grouped) : []),
    [rows, grouped],
  );
  const groupedTotal = useMemo(
    () => groupedRows.reduce((s, r) => s + r.amount, 0),
    [groupedRows],
  );

  function openAdd() {
    setForm({
      date: new Date().toISOString().split("T")[0],
      reference: "",
      purpose: "",
      particulars: "",
      amount: "",
    });
    setShowAdd(true);
  }
  function openEdit(row: CreditEntry) {
    setForm({
      date: toInputDate(row.date),
      reference: row.reference ?? "",
      purpose: row.purpose ?? "",
      particulars: row.particulars,
      amount: String(row.amount),
    });
    setEditRow(row);
  }
  function toggleGroup(val: string) {
    setGrouped((prev) => (prev === val ? null : val));
  }

  async function handleAdd() {
    if (!form.date || !form.particulars || !form.amount)
      return toast.error("Date, Particulars and Amount are required");
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0)
      return toast.error("Enter a valid amount");
    setSubmitting(true);
    try {
      await ipc.credit.add({
        date: form.date,
        reference: form.reference || undefined,
        purpose: form.purpose || undefined,
        particulars: form.particulars,
        amount,
      });
      toast.success("Credit entry added");
      setShowAdd(false);
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to add");
    }
    setSubmitting(false);
  }

  async function handleEdit() {
    if (!editRow || !form.date || !form.particulars || !form.amount)
      return toast.error("Required fields missing");
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0)
      return toast.error("Enter a valid amount");
    setSubmitting(true);
    try {
      await ipc.credit.update(editRow.id, {
        date: form.date,
        reference: form.reference || undefined,
        purpose: form.purpose || undefined,
        particulars: form.particulars,
        amount,
      });
      toast.success("Entry updated");
      setEditRow(null);
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to update");
    }
    setSubmitting(false);
  }

  async function handleDelete() {
    if (!deleteRow) return;
    setSubmitting(true);
    try {
      await ipc.credit.delete(deleteRow.id);
      toast.success("Entry deleted");
      setDeleteRow(null);
      if (grouped === deleteRow.particulars && groupedRows.length <= 1)
        setGrouped(null);
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to delete");
    }
    setSubmitting(false);
  }

  async function handleArchive() {
    setSubmitting(true);
    try {
      await ipc.credit.archive();
      toast.success("Month archived successfully");
      setShowArchive(false);
      setGrouped(null);
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to archive");
    }
    setSubmitting(false);
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (
      <span className="ml-1 text-blue-500 text-xs">
        {sortDir === "asc" ? "▲" : "▼"}
      </span>
    ) : (
      <span className="ml-1 text-slate-300 text-xs">▲</span>
    );

  const FormFields = (
    <>
      <Field label="Date" required>
        <input
          type="date"
          value={form.date}
          onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          className={inputCls}
        />
      </Field>
      <Field label="Reference">
        <input
          type="text"
          value={form.reference}
          onChange={(e) =>
            setForm((f) => ({ ...f, reference: e.target.value }))
          }
          className={inputCls}
          placeholder="Optional"
        />
      </Field>
      <Field label="Purpose">
        <input
          type="text"
          value={form.purpose}
          onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
          className={inputCls}
          placeholder="Optional"
        />
      </Field>
      <Field label="Particulars" required>
        <input
          type="text"
          value={form.particulars}
          onChange={(e) =>
            setForm((f) => ({ ...f, particulars: e.target.value }))
          }
          className={inputCls}
          placeholder="Description"
        />
      </Field>
      <Field label="Amount (Tk)" required>
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={form.amount}
          onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          className={inputCls}
          placeholder="0.00"
        />
      </Field>
    </>
  );

  const groupColumns: GColumn[] = [
    {
      label: "S/N",
      render: (r) => (
        <span className="font-mono text-slate-500 text-xs">
          {r.serialNumber}
        </span>
      ),
    },
    {
      label: "Date",
      render: (r) => (
        <span className="text-slate-600 whitespace-nowrap">
          {formatDate(r.date)}
        </span>
      ),
    },
    {
      label: "Reference",
      render: (r) => (
        <span className="text-slate-500 text-xs">{r.reference ?? "-"}</span>
      ),
    },
    {
      label: "Purpose",
      render: (r) => (
        <span className="text-slate-500 text-xs">{r.purpose ?? "-"}</span>
      ),
    },
    {
      label: "Particulars",
      render: (r) => (
        <span className="text-slate-800 font-medium">{r.particulars}</span>
      ),
    },
    {
      label: "Amount (Tk)",
      render: (r) => (
        <span className="text-green-600 font-semibold">
          {formatAmount(r.amount)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center gap-3 bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search entries..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <span className="text-sm text-slate-400 hidden sm:block">
          {filtered.length} of {rows.length} entries
        </span>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => setShowArchive(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
          >
            <Archive size={15} /> Archive Month
          </button>
          {/* <button onClick={openAdd} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
            <Plus size={15} /> Add Entry
          </button> */}
        </div>
      </div>

      {/* Main table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {(
                  [
                    ["serialNumber", "S/N"],
                    ["date", "Date"],
                    ["reference", "Reference"],
                    ["purpose", "Purpose"],
                    ["particulars", "Particulars"],
                    ["amount", "Amount (Tk)"],
                    ["total", "Running Total"],
                  ] as [SortKey, string][]
                ).map(([k, label]) => (
                  <th
                    key={k}
                    onClick={() => handleSort(k)}
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide cursor-pointer hover:bg-slate-100 select-none whitespace-nowrap"
                  >
                    {label}
                    <SortIcon k={k} />
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-slate-400"
                  >
                    Loading...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-slate-400"
                  >
                    {search
                      ? "No entries match your search."
                      : 'No entries yet. Click "Add Entry" to get started.'}
                  </td>
                </tr>
              ) : (
                paginated.map((row, i) => (
                  <tr
                    key={row.id}
                    className={`${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"} ${grouped === row.particulars ? "ring-1 ring-inset ring-blue-200 bg-blue-50/40" : ""}`}
                  >
                    <td className="px-4 py-3 font-mono text-slate-500 text-xs">
                      {row.serialNumber}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {formatDate(row.date)}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {row.reference ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs max-w-[90px] truncate">
                      {row.purpose ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleGroup(row.particulars)}
                        className={`text-left font-medium max-w-[200px] truncate flex items-center gap-1 group transition-colors ${grouped === row.particulars ? "text-blue-700" : "text-slate-800 hover:text-blue-600"}`}
                        title={`Click to group by "${row.particulars}"`}
                      >
                        <span className="truncate">{row.particulars}</span>
                        <ChevronDown
                          size={12}
                          className={`flex-shrink-0 transition-transform ${grouped === row.particulars ? "rotate-180 text-blue-600" : "text-slate-400 group-hover:text-blue-500"}`}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-green-600 font-semibold">
                      {formatAmount(row.amount)}
                    </td>
                    <td className="px-4 py-3 text-blue-600 font-semibold">
                      {formatAmount(row.total)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(row)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteRow(row)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {paginated.length > 0 && (
              <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase"
                  >
                    Page Total
                  </td>
                  <td className="px-4 py-2.5 text-green-700 font-bold">
                    {formatAmount(paginated.reduce((s, r) => s + r.amount, 0))}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500 text-xs">
                    Grand:{" "}
                    <span className="font-bold text-green-700">
                      {formatAmount(rows.reduce((s, r) => s + r.amount, 0))}
                    </span>
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <Pagination
          page={page}
          totalPages={totalPages}
          perPage={perPage}
          total={sorted.length}
          onPage={setPage}
          onPerPage={(n) => {
            setPerPage(n);
            setPage(1);
          }}
        />
      </div>

      {/* Grouped drill-down panel */}
      {grouped && (
        <GroupPanel
          fieldLabel="Particulars"
          value={grouped}
          rows={groupedRows}
          columns={groupColumns}
          totalAmount={groupedTotal}
          onClose={() => setGrouped(null)}
        />
      )}

      {showAdd && (
        <Modal
          title="Add Credit Entry"
          onClose={() => setShowAdd(false)}
          onSubmit={handleAdd}
          loading={submitting}
        >
          {FormFields}
        </Modal>
      )}
      {editRow && (
        <Modal
          title="Edit Credit Entry"
          onClose={() => setEditRow(null)}
          onSubmit={handleEdit}
          submitLabel="Update"
          loading={submitting}
        >
          {FormFields}
        </Modal>
      )}
      {deleteRow && (
        <ConfirmDialog
          title="Delete Entry"
          message={`Delete entry #${deleteRow.serialNumber} — "${deleteRow.particulars}"? All subsequent totals will be recalculated.`}
          confirmLabel="Delete"
          onCancel={() => setDeleteRow(null)}
          onConfirm={handleDelete}
          loading={submitting}
        />
      )}
      {showArchive && (
        <ConfirmDialog
          title="Archive Month"
          message="This will archive all credit entries dated before today and create a summary carry-forward entry. This action cannot be undone."
          confirmLabel="Archive"
          confirmClass="bg-amber-600 hover:bg-amber-700"
          onCancel={() => setShowArchive(false)}
          onConfirm={handleArchive}
          loading={submitting}
        />
      )}
    </div>
  );
}
