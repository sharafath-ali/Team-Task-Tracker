import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { createTask, updateTask } from '../api/tasks.api';
import { listUsers } from '../api/users.api';
import useAuthStore from '../store/authStore';

export default function TaskModal({ task, projects, onClose, onSaved }) {
  const { user } = useAuthStore();
  const isEdit = !!task;
  const [form, setForm] = useState({
    title:       task?.title       || '',
    description: task?.description || '',
    priority:    task?.priority    || 'MEDIUM',
    assignee_id: task?.assignee_id || '',
    project_id:  task?.project_id  || (projects[0]?.id || ''),
    due_date:    task?.due_date    ? task.due_date.split('T')[0] : '',
  });
  const [members, setMembers] = useState([]);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (['ADMIN', 'MANAGER'].includes(user?.role)) {
      listUsers({ limit: 100 })
        .then(r => setMembers(r.data.data.users || []))
        .catch(() => {});
    }
  }, [user]);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        ...form,
        assignee_id: form.assignee_id || null,
        due_date:    form.due_date    || null,
      };
      if (isEdit) await updateTask(task.id, payload);
      else        await createTask(payload);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  const canEdit = isEdit
    ? (['ADMIN', 'MANAGER'].includes(user?.role) || task.assignee_id === user?.id)
    : true;

  const STATUS_DISPLAY = {
    TODO:        'To Do',
    IN_PROGRESS: 'In Progress',
    IN_REVIEW:   'In Review',
    DONE:        'Done',
    BLOCKED:     'Blocked',
  };

  return (
    <div
      className="modal-overlay"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="modal">
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit Task' : 'Create Task'}</h2>
          <button
            className="btn btn-ghost btn-icon"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Task metadata chips (edit mode) */}
        {isEdit && (
          <div className="modal-meta-row">
            {task.project_name && (
              <span className="modal-meta-chip">
                Project: <strong>{task.project_name}</strong>
              </span>
            )}
            {task.creator_name && (
              <span className="modal-meta-chip">
                Created by: <strong>{task.creator_name}</strong>
              </span>
            )}
            {task.status && (
              <span className="modal-meta-chip">
                Status: <strong>{STATUS_DISPLAY[task.status] || task.status}</strong>
              </span>
            )}
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="task-title">Title *</label>
            <input
              id="task-title"
              className="form-input"
              value={form.title}
              onChange={set('title')}
              required
              disabled={!canEdit}
              placeholder="Enter task title"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="task-description">Description</label>
            <textarea
              id="task-description"
              className="form-textarea"
              value={form.description}
              onChange={set('description')}
              disabled={!canEdit}
              placeholder="Add a description (optional)"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="task-priority">Priority</label>
              <select
                id="task-priority"
                className="form-select"
                value={form.priority}
                onChange={set('priority')}
                disabled={!canEdit}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="task-due-date">Due Date</label>
              <input
                id="task-due-date"
                className="form-input"
                type="date"
                value={form.due_date}
                onChange={set('due_date')}
                disabled={!canEdit}
              />
            </div>
          </div>

          {!isEdit && (
            <div className="form-group">
              <label className="form-label" htmlFor="task-project">Project *</label>
              <select
                id="task-project"
                className="form-select"
                value={form.project_id}
                onChange={set('project_id')}
                required
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {['ADMIN', 'MANAGER'].includes(user?.role) && (
            <div className="form-group">
              <label className="form-label" htmlFor="task-assignee">Assignee</label>
              <select
                id="task-assignee"
                className="form-select"
                value={form.assignee_id}
                onChange={set('assignee_id')}
              >
                <option value="">Unassigned</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            {canEdit && (
              <button
                id="task-submit"
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Task'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
