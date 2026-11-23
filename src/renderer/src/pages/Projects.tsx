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
import type { ProjectEntry } from "../lib/types";

type SortKey = keyof ProjectEntry;
type SortDir = "asc" | "desc";

interface FormState {
  projectCode: string;
  subject: string;
  submitDate: string;
  receiveDate: string;
  chequeNumber: string;
  chequeDate: string;
  bank: string;
  amount: string;
}

export default function ProjectsPage() {
  const [rows, setRows] = useState<ProjectEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [sortKey, setSortKey] = useState<SortKey>("serialNumber");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const [grouped, setGrouped] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [editRow, setEditRow] = useState<ProjectEntry | null>(null);
  const [deleteRow, setDeleteRow] = useState<ProjectEntry | null>(null);
  const [showArchive, setShowArchive] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<FormState>({
    projectCode: "",
    subject: "",
    submitDate: "",
    receiveDate: "",
    chequeNumber: "",
    chequeDate: "",
    bank: "",
    amount: "",
  });

  async function load() {
    setLoading(true);
    try {
      setRows(await ipc.project.getAll());
    } catch {
      toast.error("Failed to load projects");
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent).detail?.type === "project") load();
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
        r.projectCode,
        r.subject,
        r.submitDate.split("T")[0],
        r.bank,
        String(r.amount),
        String(r.receivedAmount),
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

  // Group by subject
  const groupedRows = useMemo(
    () => (grouped ? rows.filter((r) => r.subject === grouped) : []),
    [rows, grouped],
  );
  const groupedTotal = useMemo(
    () => groupedRows.reduce((s, r) => s + r.receivedAmount, 0),
    [groupedRows],
  );

  function openAdd() {
    setForm({
      projectCode: "",
      subject: "",
      submitDate: new Date().toISOString().split("T")[0],
      receiveDate: "",
      chequeNumber: "",
      chequeDate: "",
      bank: "",
      amount: "",
    });
    setShowAdd(true);
  }
  function openEdit(row: ProjectEntry) {
    setForm({
      projectCode: row.projectCode,
      subject: row.subject,
      submitDate: toInputDate(row.submitDate),
      receiveDate: row.receiveDate ? toInputDate(row.receiveDate) : "",
      chequeNumber: row.chequeNumber != null ? String(row.chequeNumber) : "",
      chequeDate: row.chequeDate ? toInputDate(row.chequeDate) : "",
      bank: row.bank,
      amount: String(row.amount),
    });
    setEditRow(row);
  }
  function toggleGroup(val: string) {
    setGrouped((prev) => (prev === val ? null : val));
  }

  async function handleAdd() {
    if (
      !form.projectCode ||
      !form.subject ||
      !form.submitDate ||
      !form.bank ||
      !form.amount
    )
      return toast.error("Required fields missing");
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0)
      return toast.error("Enter a valid amount");
    setSubmitting(true);
    try {
      await ipc.project.add({
        projectCode: form.projectCode,
        subject: form.subject,
        submitDate: form.submitDate,
        receiveDate: form.receiveDate || undefined,
        chequeNumber: form.chequeNumber
          ? parseInt(form.chequeNumber)
          : undefined,
        chequeDate: form.chequeDate || undefined,
        bank: form.bank,
        amount,
      });
      toast.success("Project added — credit entry auto-created (90%)");
      setShowAdd(false);
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to add");
    }
    setSubmitting(false);
  }

  async function handleEdit() {
    if (
      !editRow ||
      !form.projectCode ||
      !form.subject ||
      !form.submitDate ||
      !form.bank ||
      !form.amount
    )
      return toast.error("Required fields missing");
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0)
      return toast.error("Enter a valid amount");
    setSubmitting(true);
    try {
      await ipc.project.update(editRow.id, {
        projectCode: form.projectCode,
        subject: form.subject,
        submitDate: form.submitDate,
        receiveDate: form.receiveDate || null,
        chequeNumber: form.chequeNumber ? parseInt(form.chequeNumber) : null,
        chequeDate: form.chequeDate || null,
        bank: form.bank,
        amount,
      });
      toast.success("Project updated");
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
      await ipc.project.delete(deleteRow.id);
      toast.success("Project deleted");
      setDeleteRow(null);
      if (grouped === deleteRow.subject && groupedRows.length <= 1)
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
      await ipc.project.archive();
      toast.success("Projects archived successfully");
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

  const previewReceived = form.amount
    ? (parseFloat(form.amount) * 0.9).toFixed(2)
    : "0.00";

  const FormFields = (
    <>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Project Code" required>
          <input
            type="text"
            value={form.projectCode}
            onChange={(e) =>
              setForm((f) => ({ ...f, projectCode: e.target.value }))
            }
            className={inputCls}
            placeholder="e.g. PRJ-001"
          />
        </Field>
        <Field label="Bank" required>
          <input
            type="text"
            value={form.bank}
            onChange={(e) => setForm((f) => ({ ...f, bank: e.target.value }))}
            className={inputCls}
            placeholder="Bank name"
          />
        </Field>
      </div>
      <Field label="Subject" required>
        <input
          type="text"
          value={form.subject}
          onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
          className={inputCls}
          placeholder="Project subject / description"
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Submit Date" required>
          <input
            type="date"
            value={form.submitDate}
            onChange={(e) =>
              setForm((f) => ({ ...f, submitDate: e.target.value }))
            }
            className={inputCls}
          />
        </Field>
        <Field label="Receive Date">
          <input
            type="date"
            value={form.receiveDate}
            onChange={(e) =>
              setForm((f) => ({ ...f, receiveDate: e.target.value }))
            }
            className={inputCls}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Cheque Number">
          <input
            type="number"
            value={form.chequeNumber}
            onChange={(e) =>
              setForm((f) => ({ ...f, chequeNumber: e.target.value }))
            }
            className={inputCls}
            placeholder="Optional"
          />
        </Field>
        <Field label="Cheque Date">
          <input
            type="date"
            value={form.chequeDate}
            onChange={(e) =>
              setForm((f) => ({ ...f, chequeDate: e.target.value }))
            }
            className={inputCls}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
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
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Received Amount (90%)
          </label>
          <div
            className={`${inputCls} bg-slate-50 text-green-700 font-semibold cursor-not-allowed`}
          >
            {previewReceived} Tk
          </div>
        </div>
      </div>
      <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
        A Credit (জমা) entry will be automatically created for the 90% received
        amount when you save.
      </p>
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
      label: "Code",
      render: (r) => (
        <span className="text-blue-600 font-mono text-xs">{r.projectCode}</span>
      ),
    },
    {
      label: "Subject",
      render: (r) => (
        <span className="text-slate-800 font-medium max-w-[160px] truncate block">
          {r.subject}
        </span>
      ),
    },
    {
      label: "Submit Date",
      render: (r) => (
        <span className="whitespace-nowrap text-slate-600">
          {formatDate(r.submitDate)}
        </span>
      ),
    },
    {
      label: "Bank",
      render: (r) => (
        <span className="text-slate-500 text-xs">{r.bank || "-"}</span>
      ),
    },
    {
      label: "Amount",
      render: (r) => (
        <span className="text-slate-800 font-semibold">
          {formatAmount(r.amount)}
        </span>
      ),
    },
    {
      label: "Received (90%)",
      render: (r) => (
        <span className="text-green-600 font-semibold">
          {formatAmount(r.receivedAmount)}
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
            placeholder="Search projects..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <span className="text-sm text-slate-400 hidden sm:block">
          {filtered.length} of {rows.length} projects
        </span>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => setShowArchive(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
          >
            <Archive size={15} /> Archive Month
          </button>
          {/* <button onClick={openAdd} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
            <Plus size={15} /> Add Project
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
                    ["projectCode", "Code"],
                    ["subject", "Subject"],
                    ["submitDate", "Submit Date"],
                    ["receiveDate", "Receive Date"],
                    ["chequeNumber", "Cheque #"],
                    ["bank", "Bank"],
                    ["amount", "Amount"],
                    ["receivedAmount", "Received (90%)"],
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
                    colSpan={10}
                    className="px-4 py-10 text-center text-slate-400"
                  >
                    Loading...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-10 text-center text-slate-400"
                  >
                    {search
                      ? "No projects match your search."
                      : 'No projects yet. Click "Add Project" to get started.'}
                  </td>
                </tr>
              ) : (
                paginated.map((row, i) => (
                  <tr
                    key={row.id}
                    className={`${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"} ${grouped === row.subject ? "ring-1 ring-inset ring-blue-200 bg-blue-50/40" : ""}`}
                  >
                    <td className="px-4 py-3 font-mono text-slate-500 text-xs">
                      {row.serialNumber}
                    </td>
                    <td className="px-4 py-3 text-blue-600 font-medium text-xs font-mono">
                      {row.projectCode}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleGroup(row.subject)}
                        className={`text-left font-medium max-w-[160px] truncate flex items-center gap-1 group transition-colors ${grouped === row.subject ? "text-blue-700" : "text-slate-800 hover:text-blue-600"}`}
                        title={`Click to group by subject "${row.subject}"`}
                      >
                        <span className="truncate">{row.subject}</span>
                        <ChevronDown
                          size={12}
                          className={`flex-shrink-0 transition-transform ${grouped === row.subject ? "rotate-180 text-blue-600" : "text-slate-400 group-hover:text-blue-500"}`}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {formatDate(row.submitDate)}
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {row.receiveDate ? formatDate(row.receiveDate) : "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                      {row.chequeNumber ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {row.bank || "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-800 font-semibold">
                      {formatAmount(row.amount)}
                    </td>
                    <td className="px-4 py-3 text-green-600 font-semibold">
                      {formatAmount(row.receivedAmount)}
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
                    colSpan={7}
                    className="px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase"
                  >
                    Page Total
                  </td>
                  <td className="px-4 py-2.5 text-slate-700 font-bold">
                    {formatAmount(paginated.reduce((s, r) => s + r.amount, 0))}
                  </td>
                  <td className="px-4 py-2.5 text-green-700 font-bold">
                    {formatAmount(
                      paginated.reduce((s, r) => s + r.receivedAmount, 0),
                    )}
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

      {/* Grouped drill-down panel — groups by Subject, shows receivedAmount total */}
      {grouped && (
        <GroupPanel
          fieldLabel="Subject"
          value={grouped}
          rows={groupedRows}
          columns={groupColumns}
          totalAmount={groupedTotal}
          onClose={() => setGrouped(null)}
        />
      )}

      {showAdd && (
        <Modal
          title="Add Project"
          onClose={() => setShowAdd(false)}
          onSubmit={handleAdd}
          loading={submitting}
        >
          {FormFields}
        </Modal>
      )}
      {editRow && (
        <Modal
          title="Edit Project"
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
          title="Delete Project"
          message={`Delete project "${deleteRow.projectCode} — ${deleteRow.subject}"?`}
          confirmLabel="Delete"
          onCancel={() => setDeleteRow(null)}
          onConfirm={handleDelete}
          loading={submitting}
        />
      )}
      {showArchive && (
        <ConfirmDialog
          title="Archive Month"
          message="This will archive all projects and create a monthly summary entry. This action cannot be undone."
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
