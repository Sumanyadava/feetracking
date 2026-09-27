import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Edit2, Trash2, Users, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store/useStore';
import type { Batch, BatchStatus } from '../../types';
import { formatCurrency, formatDate, toISODateString } from '../../utils/formatters';

export default function BatchesPage() {
  const { state, addBatch, updateBatch, deleteBatch } = useStore();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [startDate, setStartDate] = useState(toISODateString(new Date()));
  const [endDate, setEndDate] = useState(toISODateString(new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)));
  const [monthlyFee, setMonthlyFee] = useState<number>(3000);
  const [admissionFee, setAdmissionFee] = useState<number>(2000);
  const [status, setStatus] = useState<BatchStatus>('Active');

  const openCreateModal = () => {
    setEditingBatch(null);
    setName('');
    setCode('');
    setCourseName('');
    setStartDate(toISODateString(new Date()));
    setEndDate(toISODateString(new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)));
    setMonthlyFee(3000);
    setAdmissionFee(2000);
    setStatus('Active');
    setModalOpen(true);
  };

  const openEditModal = (batch: Batch) => {
    setEditingBatch(batch);
    setName(batch.name);
    setCode(batch.code);
    setCourseName(batch.courseName);
    setStartDate(batch.startDate);
    setEndDate(batch.endDate);
    setMonthlyFee(batch.monthlyFee);
    setAdmissionFee(batch.admissionFee);
    setStatus(batch.status);
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !courseName.trim()) {
      toast.error('Please fill in required fields');
      return;
    }

    if (editingBatch) {
      updateBatch({
        ...editingBatch,
        name: name.trim(),
        code: code.trim() || name.slice(0, 4).toUpperCase(),
        courseName: courseName.trim(),
        startDate,
        endDate,
        monthlyFee: Number(monthlyFee),
        admissionFee: Number(admissionFee),
        status,
      });
      toast.success('Batch updated successfully!');
    } else {
      addBatch({
        name: name.trim(),
        code: code.trim() || name.slice(0, 4).toUpperCase(),
        courseName: courseName.trim(),
        startDate,
        endDate,
        monthlyFee: Number(monthlyFee),
        admissionFee: Number(admissionFee),
        status,
      });
      toast.success('New batch created successfully!');
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    const studentCount = state.students.filter(s => s.batchId === id).length;
    if (studentCount > 0) {
      toast.error(`Cannot delete batch with ${studentCount} assigned students. Reassign or remove students first.`);
      return;
    }
    if (window.confirm(`Are you sure you want to delete batch "${name}"?`)) {
      deleteBatch(id);
      toast.success('Batch deleted.');
    }
  };

  // Filtered Batches
  const filteredBatches = state.batches.filter(b => {
    const matchesSearch =
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.courseName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Batch Management</h1>
          <p className="page-subtitle">Organize cohorts, configure monthly tuition fees & monitor enrollment</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <Plus size={16} />
          Create New Batch
        </button>
      </div>

      {/* Filters Bar */}
      <div className="filters-bar">
        <div className="search-wrap" style={{ width: 280 }}>
          <Search size={15} style={{ color: 'var(--text-3)' }} />
          <input
            type="text"
            placeholder="Search by batch name, code, course..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          className="filter-select"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="ALL">All Statuses</option>
          <option value="Active">Active Batches</option>
          <option value="Completed">Completed</option>
          <option value="Archived">Archived</option>
        </select>
      </div>

      {/* Batches Table / Cards */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Batch Code & Name</th>
              <th>Course</th>
              <th>Timeline</th>
              <th>Enrolled</th>
              <th>Monthly Fee</th>
              <th>Admission Fee</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredBatches.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>
                  No batches match the current filter.
                </td>
              </tr>
            ) : (
              filteredBatches.map(batch => {
                const studentCount = state.students.filter(s => s.batchId === batch.id).length;
                return (
                  <tr key={batch.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          padding: '4px 8px',
                          background: 'var(--accent-dim)',
                          color: 'var(--accent)',
                          borderRadius: 'var(--radius-xs)',
                          fontWeight: 700,
                          fontSize: '0.75rem'
                        }}>
                          {batch.code}
                        </div>
                        <div>
                          <div
                            style={{ fontWeight: 600, color: 'var(--text)', cursor: 'pointer' }}
                            onClick={() => navigate(`/batches/${batch.id}`)}
                          >
                            {batch.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{batch.courseName}</td>
                    <td>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>
                        {formatDate(batch.startDate)} → {formatDate(batch.endDate)}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Users size={12} />
                        {studentCount} Students
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text)' }}>
                      {formatCurrency(batch.monthlyFee)}
                    </td>
                    <td style={{ color: 'var(--text-2)' }}>
                      {formatCurrency(batch.admissionFee)}
                    </td>
                    <td>
                      <span className={`badge ${
                        batch.status === 'Active' ? 'badge-success' :
                        batch.status === 'Completed' ? 'badge-cyan' : 'badge-neutral'
                      }`}>
                        {batch.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => navigate(`/batches/${batch.id}`)}
                          title="View Details & Students"
                        >
                          View
                        </button>
                        <button
                          className="btn btn-ghost btn-icon-sm"
                          onClick={() => openEditModal(batch)}
                          title="Edit Batch"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          className="btn btn-danger btn-icon-sm"
                          onClick={() => handleDelete(batch.id, batch.name)}
                          title="Delete Batch"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="modal modal-md">
            <div className="modal-header">
              <span className="modal-title">
                {editingBatch ? 'Edit Batch Details' : 'Create New Batch'}
              </span>
              <button className="btn btn-ghost btn-icon-sm" onClick={() => setModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Batch Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Web Dev - Batch A"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Batch Code / Identifier</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. WD-A"
                      value={code}
                      onChange={e => setCode(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Course Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Full Stack Web Development"
                    value={courseName}
                    onChange={e => setCourseName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Start Date *</label>
                    <input
                      type="date"
                      className="form-input"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date *</label>
                    <input
                      type="date"
                      className="form-input"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-grid-3">
                  <div className="form-group">
                    <label className="form-label">Monthly Fee (₹) *</label>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      value={monthlyFee || ''}
                      onChange={e => setMonthlyFee(Number(e.target.value))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">One-Time Admission Fee (₹)</label>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      value={admissionFee || ''}
                      onChange={e => setAdmissionFee(Number(e.target.value))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status *</label>
                    <select
                      className="form-select"
                      value={status}
                      onChange={e => setStatus(e.target.value as BatchStatus)}
                    >
                      <option value="Active">Active</option>
                      <option value="Completed">Completed</option>
                      <option value="Archived">Archived</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingBatch ? 'Save Changes' : 'Create Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
