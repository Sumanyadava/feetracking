import { useState } from "react";
import { Save, RefreshCw, Shield, School, Calendar, Download, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { useStore } from "../../store/useStore";
import { exportData } from "../../store/dataExport";
import type { Settings } from "../../types";

export default function SettingsPage() {
  const { state, updateSettings, resetToDemo, importData } = useStore();

  const [form, setForm] = useState<Settings>({ ...state.settings });

  const handleChange = (field: keyof Settings, value: Settings[keyof Settings]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(form);
    toast.success("Settings updated successfully!");
  };

  const handleResetData = () => {
    if (
      window.confirm(
        "Are you sure you want to clear all application data? This will remove all records and keep only the admin login credentials.",
      )
    ) {
      resetToDemo();
      setForm({ ...state.settings });
      toast.success("Application data cleared. Login credentials preserved.");
    }
  };

  const handleExport = () => {
    const dataStr = exportData(state);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const dateStr = new Date().toISOString().split("T")[0];
    a.download = "feetracking-backup-" + dateStr + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Data exported to JSON file.");
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const raw = event.target?.result as string;
        if (importData(raw)) {
          toast.success("Data imported successfully! Please re-login.");
          setTimeout(() => (window.location.href = "/login"), 1000);
        } else {
          toast.error("Invalid backup file. Import failed.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">System Settings</h1>
          <p className="page-subtitle">
            Configure institute credentials, billing cycle terms, and default
            policies
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSave}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 24,
          maxWidth: 800,
        }}
      >
        {/* Institute Info Card */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <School size={18} style={{ color: "var(--accent)" }} />
              <div className="card-title">
                Institute Identity & Receipt Header
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Institute / Academy Name *</label>
              <input
                type="text"
                className="form-input"
                value={form.instituteName}
                onChange={(e) => handleChange("instituteName", e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Address Line (Appears on Official Receipts) *
              </label>
              <input
                type="text"
                className="form-input"
                value={form.instituteAddress}
                onChange={(e) =>
                  handleChange("instituteAddress", e.target.value)
                }
                required
              />
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Contact Phone Number</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.institutePhone}
                  onChange={(e) =>
                    handleChange("institutePhone", e.target.value)
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label">Official Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={form.instituteEmail}
                  onChange={(e) =>
                    handleChange("instituteEmail", e.target.value)
                  }
                />
              </div>
            </div>
          </div>
        </div>

        {/* Fee Schedule & Billing Policy Card */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Calendar size={18} style={{ color: "var(--accent)" }} />
              <div className="card-title">Fee Schedule & Dues Policy</div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">
                  Default Fee Due Day of the Month (1 - 28) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="28"
                  className="form-input"
                  value={form.feeDueDayOfMonth}
                  onChange={(e) =>
                    handleChange("feeDueDayOfMonth", Number(e.target.value))
                  }
                  required
                />
                <span style={{ fontSize: "0.75rem", color: "var(--text-3)" }}>
                  e.g., Setting 5 means fees become overdue on the 6th of each
                  month.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Currency Symbol / Display</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.currency}
                  disabled
                />
                <span style={{ fontSize: "0.75rem", color: "var(--text-3)" }}>
                  Standard Indian Rupee (INR ₹)
                </span>
              </div>
            </div>

            <div className="divider" />

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <input
                type="checkbox"
                id="lateFeeToggle"
                checked={form.lateFeeEnabled}
                onChange={(e) =>
                  handleChange("lateFeeEnabled", e.target.checked)
                }
                style={{ width: 16, height: 16, accentColor: "var(--accent)" }}
              />
              <label
                htmlFor="lateFeeToggle"
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Enable Automatic Late Fee Surcharge on Overdue Terms
              </label>
            </div>

            {form.lateFeeEnabled && (
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Late Fee Amount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={form.lateFeeAmount}
                    onChange={(e) =>
                      handleChange("lateFeeAmount", Number(e.target.value))
                    }
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Security & Access Credentials */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Shield size={18} style={{ color: "var(--accent)" }} />
              <div className="card-title">
                Security & Administrative Login Credentials
              </div>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Administrator Username *</label>
              <input
                type="text"
                className="form-input"
                value={form.adminUsername}
                onChange={(e) => handleChange("adminUsername", e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Administrator Password *</label>
              <input
                type="text"
                className="form-input"
                value={form.adminPassword}
                onChange={(e) => handleChange("adminPassword", e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        {/* Data Portability Card */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Download size={18} style={{ color: "var(--accent)" }} />
              <div className="card-title">Data Portability</div>
            </div>
          </div>

          <p style={{ fontSize: "0.85rem", color: "var(--text-2)", marginBottom: 16 }}>
            Export your complete ledger data to a JSON file for backup or transfer to another machine.
            You can also import a previously exported backup file.
          </p>

          <div style={{ display: "flex", gap: 12 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExport}
            >
              <Download size={14} />
              Export Data
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleImport}
            >
              <Upload size={14} />
              Import Data
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleResetData}
            style={{ color: "var(--danger)" }}
          >
            <RefreshCw size={14} /> Delete all Data 
          </button>

          <button type="submit" className="btn btn-primary btn-lg">
            <Save size={16} /> Save Configuration
          </button>
        </div>
      </form>
    </div>
  );
}
