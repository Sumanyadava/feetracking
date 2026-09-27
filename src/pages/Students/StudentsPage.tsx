import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store/useStore';
import type { Student, StudentStatus } from '../../types';
import { formatCurrency, formatDate, getInitials, toISODateString } from '../../utils/formatters';

export default function StudentsPage() {
  const { state, addStudent, updateStudent, deleteStudent } = useStore();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [batchFilter, setBatchFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [feeStatusFilter, setFeeStatusFilter] = useState<string>('ALL');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [address, setAddress] = useState('');
  const [batchId, setBatchId] = useState(state.batches[0]?.id || '');
  const [course, setCourse] = useState(state.batches[0]?.courseName || '');
  const [joiningDate, setJoiningDate] = useState(toISODateString(new Date()));
  const [status, setStatus] = useState<StudentStatus>('Active');
  const [notes, setNotes] = useState('');

  const openCreateModal = () => {
    setEditingStudent(null);
    setName('');
    const nextNum = String(state.students.length + 1).padStart(3, '0');
    const defaultBatch = state.batches[0];
    setRollNumber(defaultBatch ? `${defaultBatch.code}-${nextNum}` : `STU-${nextNum}`);
    setPhone('');
    setEmail('');
    setGuardianName('');
    setGuardianPhone('');
    setAddress('');
    setBatchId(defaultBatch?.id || '');
    setCourse(defaultBatch?.courseName || '');
    setJoiningDate(toISODateString(new Date()));
    setStatus('Active');
    setNotes('');
    setModalOpen(true);
  };

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setName(student.name);
    setRollNumber(student.rollNumber);
    setPhone(student.phone);
    setEmail(student.email);
    setGuardianName(student.guardianName);
    setGuardianPhone(student.guardianPhone);
    setAddress(student.address);
    setBatchId(student.batchId);
    setCourse(student.course);
    setJoiningDate(student.joiningDate);
    setStatus(student.status);
    setNotes(student.notes || '');
    setModalOpen(true);
  };

  const handleBatchChange = (selectedBatchId: string) => {
    setBatchId(selectedBatchId);
    const b = state.batches.find(batch => batch.id === selectedBatchId);
    if (b) {
      setCourse(b.courseName);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !rollNumber.trim() || !phone.trim() || !batchId) {
      toast.error('Please fill in required fields (Name, Roll No, Phone, Batch)');
      return;
    }

    if (editingStudent) {
      updateStudent({
        ...editingStudent,
        name: name.trim(),
        rollNumber: rollNumber.trim(),
        phone: phone.trim(),
        email: email.trim(),
        guardianName: guardianName.trim(),
        guardianPhone: guardianPhone.trim(),
        address: address.trim(),
        batchId,
        course,
        joiningDate,
        status,
        notes: notes.trim(),
      });
      toast.success('Student profile updated!');
    } else {
      addStudent({
        name: name.trim(),
        rollNumber: rollNumber.trim(),
        phone: phone.trim(),
        email: email.trim(),
        guardianName: guardianName.trim(),
        guardianPhone: guardianPhone.trim(),
        address: address.trim(),
        batchId,
        course,
        joiningDate,
        status,
        notes: notes.trim(),
      });
      toast.success('Student enrolled and monthly fee records automatically generated!');
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove student "${name}" and all associated fee records?`)) {
      deleteStudent(id);
      toast.success('Student removed.');
    }
  };

  // Filter students
  const filteredStudents = state.students.filter(student => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.rollNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.phone.includes(searchTerm) ||
      student.guardianName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesBatch = batchFilter === 'ALL' || student.batchId === batchFilter;
    const matchesStatus = statusFilter === 'ALL' || student.status === statusFilter;

    // Fee status filter
    if (feeStatusFilter !== 'ALL') {
      const records = state.feeRecords.filter(r => r.studentId === student.id);
      const totalDue = records.reduce((sum, r) => sum + r.dueAmount, 0);
      const hasOverdue = records.some(
        r => r.status !== 'Paid' && r.status !== 'Waived' && new Date(r.dueDate) < new Date()
      );

      if (feeStatusFilter === 'OVERDUE' && !hasOverdue) return false;
      if (feeStatusFilter === 'PAID' && totalDue > 0) return false;
      if (feeStatusFilter === 'DUE' && totalDue === 0) return false;
    }

    return matchesSearch && matchesBatch && matchesStatus;
  });

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Student Directory</h1>
          <p className="page-subtitle">Manage student enrollment, batch assignments & individual fee balances</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <Plus size={16} />
          Enroll New Student
        </button>
      </div>

      {/* Filters Bar */}
      <div className="filters-bar">
        <div className="search-wrap" style={{ width: 280 }}>
          <Search size={15} style={{ color: 'var(--text-3)' }} />
          <input
            type="text"
            placeholder="Search by name, roll no, phone..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          className="filter-select"
          value={batchFilter}
          onChange={e => setBatchFilter(e.target.value)}
        >
          <option value="ALL">All Batches</option>
          {state.batches.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>

        <select
          className="filter-select"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="ALL">All Student Statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="Completed">Completed</option>
          <option value="Dropped">Dropped</option>
        </select>

        <select
          className="filter-select"
          value={feeStatusFilter}
          onChange={e => setFeeStatusFilter(e.target.value)}
        >
          <option value="ALL">All Payment Statuses</option>
          <option value="OVERDUE">Overdue Only</option>
          <option value="DUE">Outstanding Due</option>
          <option value="PAID">Fully Paid</option>
        </select>
      </div>

      {/* Students Table */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Student Details</th>
              <th>Roll Number</th>
              <th>Batch & Course</th>
              <th>Joining Date</th>
              <th>Outstanding Due</th>
              <th>Enrollment Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>
                  No students found matching current filters.
                </td>
              </tr>
            ) : (
              filteredStudents.map(student => {
                const batch = state.batches.find(b => b.id === student.batchId);
                const records = state.feeRecords.filter(r => r.studentId === student.id);
                const totalDue = records.reduce((sum, r) => sum + r.dueAmount, 0);
                const isOverdue = records.some(
                  r => r.status !== 'Paid' && r.status !== 'Waived' && new Date(r.dueDate) < new Date()
                );

                return (
                  <tr key={student.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="avatar avatar-sm">
                          {getInitials(student.name)}
                        </div>
                        <div>
                          <div
                            style={{ fontWeight: 600, color: 'var(--text)', cursor: 'pointer' }}
                            onClick={() => navigate(`/students/${student.id}`)}
                          >
                            {student.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>
                            {student.phone} {student.email ? `• ${student.email}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-neutral">{student.rollNumber}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{batch?.name || 'No Batch'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{student.course}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>
                        {formatDate(student.joiningDate)}
                      </span>
                    </td>
                    <td>
                      {totalDue === 0 ? (
                        <span className="badge badge-success">Fully Paid</span>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 700, color: isOverdue ? 'var(--danger)' : 'var(--warning)' }}>
                            {formatCurrency(totalDue)}
                          </span>
                          {isOverdue && <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>Overdue</span>}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${
                        student.status === 'Active' ? 'badge-success' :
                        student.status === 'Completed' ? 'badge-cyan' :
                        student.status === 'Dropped' ? 'badge-danger' : 'badge-neutral'
                      }`}>
                        {student.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => navigate(`/students/${student.id}`)}
                          title="Open Fee Dashboard"
                        >
                          Fee Dashboard
                        </button>
                        <button
                          className="btn btn-ghost btn-icon-sm"
                          onClick={() => openEditModal(student)}
                          title="Edit Student Profile"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          className="btn btn-danger btn-icon-sm"
                          onClick={() => handleDelete(student.id, student.name)}
                          title="Delete Student"
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

      {/* Modal: Enroll / Edit Student */}
      {modalOpen && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <span className="modal-title">
                {editingStudent ? 'Edit Student Profile' : 'Enroll New Student'}
              </span>
              <button className="btn btn-ghost btn-icon-sm" onClick={() => setModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Rahul Kumar"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Roll Number / Student ID *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. WD-A-005"
                      value={rollNumber}
                      onChange={e => setRollNumber(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Phone Number *</label>
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="e.g. 9876543210"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="e.g. rahul@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Guardian / Parent Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Ramesh Kumar"
                      value={guardianName}
                      onChange={e => setGuardianName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Guardian Contact Number</label>
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="e.g. 9876500001"
                      value={guardianPhone}
                      onChange={e => setGuardianPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Assign Batch *</label>
                    <select
                      className="form-select"
                      value={batchId}
                      onChange={e => handleBatchChange(e.target.value)}
                      required
                    >
                      {state.batches.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.courseName}) — {formatCurrency(b.monthlyFee)}/mo
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Joining Date *</label>
                    <input
                      type="date"
                      className="form-input"
                      value={joiningDate}
                      onChange={e => setJoiningDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Course</label>
                    <input
                      type="text"
                      className="form-input"
                      value={course}
                      onChange={e => setCourse(e.target.value)}
                      placeholder="e.g. Full Stack Web Development"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Student Status *</label>
                    <select
                      className="form-select"
                      value={status}
                      onChange={e => setStatus(e.target.value as StudentStatus)}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Completed">Completed</option>
                      <option value="Dropped">Dropped</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Residential Address</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 12, Koramangala, Bangalore"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Notes & Remarks</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Additional notes about academic performance or fee agreements"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingStudent ? 'Update Student' : 'Enroll & Auto-Generate Fee Records'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
