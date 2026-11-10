"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, StatCard } from "@/components/layout/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Card, CardContent } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/Button";
import { MapPin, Plus, Loader2, ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/formatters";

export default function CitiesSettingsPage() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");

  const fetchCities = async () => {
    try {
      const res = await fetch("/api/settings/cities");
      const data = await res.json();
      if (res.ok) setCities(data.cities || []);
      else showToast(data.error || "Failed to load cities", "error");
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCities();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setName("");
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setName(row.name);
    setModalOpen(true);
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete city "${row.name}"?`)) return;
    try {
      const res = await fetch(`/api/settings/cities/${row.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showToast("City deleted", "success");
        fetchCities();
      } else showToast(data.error || "Failed to delete city", "error");
    } catch {
      showToast("Error processing request", "error");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast("City name is required", "warning");
      return;
    }
    setSubmitting(true);
    try {
      const url = editingId ? `/api/settings/cities/${editingId}` : "/api/settings/cities";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(editingId ? "City updated!" : `City "${name}" added!`, "success");
        setModalOpen(false);
        setName("");
        setEditingId(null);
        fetchCities();
      } else showToast(data.error || "Failed to save city", "error");
    } catch {
      showToast("Error processing request", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      header: "City",
      accessor: "name",
      cell: (row) => (
        <span className="font-semibold text-slate-900 flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-acc-settings" />
          {row.name}
        </span>
      ),
    },
    {
      header: "Added",
      accessor: "createdAt",
      cell: (row) => (
        <span className="text-xs text-slate-500">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      header: "",
      accessor: "id",
      sortable: false,
      cell: (row) => (
        <div className="flex items-center gap-1 justify-end">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); openEdit(row); }}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-acc-settings transition-colors cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {user?.role === "admin" && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleDelete(row); }}
              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8 page-enter">
      <PageHeader
        module="settings"
        title="Cities"
        description="Manage cities used in routes, addresses, and records."
        icon={MapPin}
        breadcrumbs={[
          { label: "Settings", href: "/settings" },
          { label: "Cities" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/settings">
              <Button variant="outline" className="border-slate-200 text-slate-600">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
            </Link>
            <Button
              onClick={openCreate}
              className="bg-acc-settings hover:bg-slate-700 border-0 text-white"
            >
              <Plus className="w-4 h-4" /> Add City
            </Button>
          </div>
        }
      />

      <StatCard module="settings" label="Total Cities" value={cities.length} icon={MapPin} />

      <Card>
        <CardContent>
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-acc-settings animate-spin" />
            </div>
          ) : (
            <DataTable columns={columns} data={cities} searchKey="name" placeholder="Search cities..." />
          )}
        </CardContent>
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Edit City" : "Add City"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              City Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="input-field"
              placeholder="e.g. Columbus"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900 border border-slate-200 cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <Button type="submit" disabled={submitting} className="bg-acc-settings hover:bg-slate-700 border-0 text-white">
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                </>
              ) : editingId ? "Save Changes" : "Add City"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
