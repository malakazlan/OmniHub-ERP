"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import { PageHeader, StatCard } from "@/components/layout/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/Button";
import { DirectoryRegisterBanner } from "@/components/accounts/DirectoryShell";
import {
  Users,
  Loader2,
  Phone,
  DollarSign,
  CalendarCheck,
  Wallet,
  UserPlus,
  Plus,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";

export default function HRPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/hr/employees");
      const data = await res.json();
      if (res.ok) setEmployees(data.employees || []);
      else showToast(data.error || "Failed to load employees", "error");
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const activeCount = employees.filter((e) => e.isActive).length;
  const totalPayroll = employees.reduce((s, e) => s + (e.salary || 0), 0);

  const columns = [
    {
      header: "Name",
      accessor: "name",
      cell: (row) => (
        <div>
          <p className="font-semibold text-slate-900">{row.name}</p>
          {row.fatherName && (
            <p className="text-[10px] text-slate-500">S/o: {row.fatherName}</p>
          )}
        </div>
      ),
    },
    {
      header: "Role",
      accessor: "role",
      cell: (row) => (
        <div className="text-xs">
          <p className="capitalize text-slate-900">{row.role || "—"}</p>
          {row.designation && <p className="text-slate-500">{row.designation}</p>}
        </div>
      ),
    },
    {
      header: "Department",
      accessor: "department",
      cell: (row) => (
        <span className="text-xs text-slate-600">{row.department || "—"}</span>
      ),
    },
    {
      header: "Contact",
      accessor: "phone",
      cell: (row) => (
        <span className="text-xs flex items-center gap-1 text-slate-600">
          {row.phone ? (
            <>
              <Phone className="w-3 h-3 text-slate-400" />
              {row.phone}
            </>
          ) : (
            "—"
          )}
        </span>
      ),
    },
    {
      header: "Salary",
      accessor: "salary",
      cell: (row) => (
        <span className="font-mono text-xs font-bold text-acc-hr">
          {formatCurrency(row.salary)}
        </span>
      ),
    },
    {
      header: "Joined",
      accessor: "joiningDate",
      cell: (row) => (
        <span className="text-xs text-slate-500">{formatDate(row.joiningDate)}</span>
      ),
    },
    {
      header: "Status",
      accessor: "isActive",
      cell: (row) => (
        <Badge variant={row.isActive ? "success" : "neutral"}>
          {row.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-8 page-enter">
      <PageHeader
        module="hr"
        title="HR & Employees"
        description="Attendance and payroll. Register staff and drivers in All Accounts."
        icon={Users}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/hr/attendance">
              <Button variant="outline" className="border-pink-200 text-acc-hr hover:bg-pink-50">
                <CalendarCheck className="w-4 h-4" /> Attendance
              </Button>
            </Link>
            <Link href="/hr/salary">
              <Button variant="outline" className="border-pink-200 text-acc-hr hover:bg-pink-50">
                <Wallet className="w-4 h-4" /> Salary
              </Button>
            </Link>
            <Link href="/accounts?category=salary&create=1">
              <Button variant="outline" className="border-pink-200 text-acc-hr hover:bg-pink-50">
                <Plus className="w-4 h-4" /> Add Employee
              </Button>
            </Link>
            <Link href="/accounts?category=transport&mode=driver&create=1">
              <Button variant="outline" className="border-cyan-200 text-acc-transport hover:bg-cyan-50">
                <Plus className="w-4 h-4" /> Add Driver
              </Button>
            </Link>
          </div>
        }
      />

      <DirectoryRegisterBanner category="salary" label="employee or driver" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard module="hr" label="Total Employees" value={employees.length} icon={UserPlus} />
        <StatCard module="hr" label="Active Staff" value={activeCount} icon={Users} />
        <StatCard
          module="hr"
          label="Monthly Payroll"
          value={formatCurrency(totalPayroll)}
          icon={DollarSign}
        />
      </div>

      <Card>
        <CardContent>
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-acc-hr animate-spin" />
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={employees}
              searchKey="name"
              placeholder="Search employees..."
              onRowClick={(row) => router.push(`/hr/${row.id}`)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
