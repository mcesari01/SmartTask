// src/App.jsx
import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ExportModal from './ExportModal';

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  // deadline is split into a required date and an optional time
  const [deadlineDate, setDeadlineDate] = useState(''); // YYYY-MM-DD
  const [deadlineTime, setDeadlineTime] = useState(''); // HH:MM (optional)
  const [priority, setPriority] = useState('Medium');
  const [sortBy, setSortBy] = useState('insertion'); // insertion | deadline | priority
  const [sortOrder, setSortOrder] = useState('asc'); // asc | desc
  const [completedFilter, setCompletedFilter] = useState('all'); // all | completed | active
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const navigate = useNavigate();
  const sortMenuRef = useRef(null);

  // close sort menu on outside click or escape
  useEffect(() => {
    function onDocClick(e) {
      if (!sortMenuRef.current) return;
      if (!sortMenuRef.current.contains(e.target)) setShowSortMenu(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setShowSortMenu(false);
    }
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [sortMenuRef]);

  const resetForm = () => {
    setEditingTaskId(null);
    setTitle('');
    setDescription('');
    setDeadlineDate('');
    setDeadlineTime('');
    setPriority('Medium');
  };

  const hasChanges = () => {
    if (!editingTaskId) return false;
    const original = tasks.find((t) => t.id === editingTaskId);
    if (!original) return false;
    const origDate = original.deadline ? new Date(original.deadline).toISOString().slice(0, 10) : '';
    const origTime = original.deadline ? new Date(original.deadline).toISOString().slice(11, 16) : '';
    return (
      original.title !== title ||
      (original.description || '') !== (description || '') ||
      origDate !== deadlineDate ||
      origTime !== (deadlineTime || '') ||
      original.priority !== priority
    );
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) navigate('/login');
    else fetchTasks();
  }, []);

  useEffect(() => {
    if ('Notification' in window) Notification.requestPermission();
  }, []);

  useEffect(() => {
    const notifiedIds = new Set();
    const interval = setInterval(() => {
      const now = new Date();
      tasks.forEach((task) => {
        if (!task.deadline) return;
        const deadline = new Date(task.deadline);
        const diff = deadline - now;
        if (diff > 0 && diff <= 60 * 60 * 1000 && !notifiedIds.has(task.id)) {
          new Notification("⏰ Task in scadenza", {
            body: `${task.title} scade alle ${deadline.toLocaleTimeString()}`,
          });
          toast.warning(`⏰ "${task.title}" scade entro 1 ora!`);
          notifiedIds.add(task.id);
        }
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [tasks]);

  useEffect(() => {
    fetchTasks();
  }, [sortBy, sortOrder, completedFilter]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (sortBy) params.append('sort_by', sortBy);
      if (sortOrder) params.append('sort_order', sortOrder);
      if (completedFilter === 'completed') params.append('completed', 'true');
      if (completedFilter === 'active') params.append('completed', 'false');
      const url = `http://localhost:8000/tasks${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTasks(res.data);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        toast.error('Errore nel recupero dei task.');
      }
    }
  };

  const createTask = async () => {
    if (!title) return;
    try {
      const token = localStorage.getItem('token');
      // Require a date to create a task. Time is optional and defaults to 23:59
      if (!deadlineDate) return;
      const timePart = deadlineTime || '23:59';
      const combined = new Date(`${deadlineDate}T${timePart}`);
      const body = { title, description, priority, deadline: combined.toISOString() };
      await axios.post('http://localhost:8000/tasks', body, { headers: { Authorization: `Bearer ${token}` } });
      resetForm();
      fetchTasks();
    } catch (err) {
      handleAuthError(err);
    }
  };

  const updateTask = async () => {
    if (!editingTaskId) return;
    try {
      const token = localStorage.getItem('token');
      if (!deadlineDate) return; // date required
      const timePart = deadlineTime || '23:59';
      const combined = new Date(`${deadlineDate}T${timePart}`);
      const body = { title, description, priority, deadline: combined.toISOString() };
      await axios.put(`http://localhost:8000/tasks/${editingTaskId}`, body, { headers: { Authorization: `Bearer ${token}` } });
      resetForm();
      fetchTasks();
    } catch (err) {
      handleAuthError(err);
    }
  };

  const deleteTask = async (id) => {
    const confirmed = window.confirm('Sei sicuro di voler eliminare questo task?');
    if (!confirmed) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:8000/tasks/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (editingTaskId === id) resetForm();
      fetchTasks();
    } catch (err) {
      handleAuthError(err);
    }
  };

  const handleAuthError = (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      navigate('/login');
    } else {
      toast.error('Errore durante la richiesta.');
    }
  };

  const isUrgent = (deadline) => {
    const now = new Date();
    const taskDate = new Date(deadline);
    return taskDate - now > 0 && taskDate - now <= 24 * 60 * 60 * 1000;
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const startEditing = (task) => {
    setEditingTaskId(task.id);
    setTitle(task.title);
    setDescription(task.description || '');
    if (task.deadline) {
      const dt = new Date(task.deadline);
      setDeadlineDate(dt.toISOString().slice(0, 10));
      setDeadlineTime(dt.toISOString().slice(11, 16));
    } else {
      setDeadlineDate('');
      setDeadlineTime('');
    }
    setPriority(task.priority);
  };

  const toggleCompleted = async (task) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `http://localhost:8000/tasks/${task.id}/completed`,
        { completed: !task.completed },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchTasks();
    } catch (err) {
      handleAuthError(err);
    }
  };

  return (
    <div className="page-container">
      <div className="topbar">
        <div className="app-title">📋 SmartTask Dashboard</div>
        <div className="topbar-actions">
          <button className="btn btn-ghost" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label="Toggle dark mode">
            {theme === 'light' ? '🌙 Dark mode' : '☀️ Light mode'}
          </button>
          <button className="btn btn-ghost" onClick={() => setShowExportModal(true)} aria-label="Export tasks">
            📤 Esporta
          </button>
          <button onClick={handleLogout} className="btn btn-danger"><svg width="12" height="12" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h7v2H5v14h7v2zm11-4l-1.375-1.45l2.55-2.55H9v-2h8.175l-2.55-2.55L16 7l5 5z"/></svg> Esci</button>
        </div>
      </div>

      <div className="grid two">
        <section className="card section">
          <div className="section-title">{editingTaskId ? 'Modifica Task' : 'Crea nuovo Task'}</div>
          <div className="field">
            <label htmlFor="title">Titolo</label>
            <input id="title" type="text" placeholder="Titolo task" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label htmlFor="desc">Descrizione</label>
            <input id="desc" type="text" placeholder="Descrizione" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label htmlFor="deadlineDate">Data scadenza</label>
            <input
              id="deadlineDate"
              type="date"
              value={deadlineDate}
              onChange={(e) => setDeadlineDate(e.target.value)}
            />
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label htmlFor="deadlineTime">Orario (opzionale)</label>
            <input
              id="deadlineTime"
              type="time"
              value={deadlineTime}
              onChange={(e) => setDeadlineTime(e.target.value)}
            />
          </div>
          {/* Hidden legacy input for tests/compatibility: keeps the old data-testid and accepts datetime-local ISO value */}
          <input
            data-testid="deadline-input"
            type="datetime-local"
            value={deadlineDate ? `${deadlineDate}T${deadlineTime || '23:59'}` : ''}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) {
                setDeadlineDate('');
                setDeadlineTime('');
                return;
              }
              const [d, t] = v.split('T');
              setDeadlineDate(d || '');
              setDeadlineTime(t ? t.slice(0,5) : '');
            }}
            style={{ display: 'none' }}
          />
          <div className="field" style={{ marginTop: 12 }}>
            <label htmlFor="priority">Priorità</label>
            <select className="form-select" id="priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="High">Alta</option>
              <option value="Medium">Media</option>
              <option value="Low">Bassa</option>
            </select>
          </div>
          <div className="form-actions" style={{ marginTop: 16 }}>
            <button
              onClick={editingTaskId ? updateTask : createTask}
              disabled={!title || !deadlineDate || (editingTaskId && !hasChanges())}
              className="btn"
            >
              {editingTaskId ? '💾 Salva modifiche' : 'Aggiungi task'}
            </button>
            {editingTaskId && (
              <button onClick={resetForm} className="btn btn-ghost">Annulla</button>
            )}
          </div>
        </section>

        <section className="card section">
          <div className="section-title">Ordinamento</div>
          <div className="form-actions" style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative' }} ref={sortMenuRef}>
              <button
                className="btn btn-ghost"
                onClick={() => setShowSortMenu((s) => !s)}
                aria-haspopup="menu"
                aria-expanded={showSortMenu}
                style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 12px' }}
              >
                <span>
                  {sortBy === 'deadline' ? 'Per scadenza' : sortBy === 'insertion' ? 'Per inserimento' : sortBy === 'priority' ? 'Per priorità' : 'Ordina'}
                </span>
                {sortBy && (
                  <span style={{ width: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    {sortOrder === 'asc' ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 14l5-5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    )}
                  </span>
                )}
              </button>

              {showSortMenu && (
                <div role="menu" style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  left: 0,
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  boxShadow: 'var(--shadow)',
                  minWidth: 180,
                  zIndex: 40,
                  padding: 6,
                }}>
                  {[['deadline','Per scadenza'], ['insertion','Per inserimento'], ['priority','Per priorità']].map(([key,label]) => {
                    const active = sortBy === key;
                    return (
                      <button
                        key={key}
                        role="menuitem"
                        className={`btn ${active ? '' : 'btn-ghost'}`}
                        onClick={() => {
                          if (active) setSortOrder((s) => (s === 'asc' ? 'desc' : 'asc'));
                          else { setSortBy(key); setSortOrder('desc'); }
                          setShowSortMenu(false);
                        }}
                        style={{
                          justifyContent: 'space-between',
                          width: '100%',
                          padding: '8px 10px',
                          marginBottom: 6,
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <span>{label}</span>
                        <span style={{ opacity: 0.9, width: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                          {active ? (
                            sortOrder === 'asc' ? (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 14l5-5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            ) : (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            )
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div>
              <button
                className="btn btn-ghost"
                onClick={() => setCompletedFilter((prev) => prev === 'all' ? 'completed' : prev === 'completed' ? 'active' : 'all')}
                aria-label="Filtro completamento"
              >
                {completedFilter === 'all' ? 'Tutti' : completedFilter === 'completed' ? 'Completati' : 'Attivi'}
              </button>
            </div>
          </div>

          <div className="section-title">Task</div>
            {tasks.length === 0 ? (
              <div className="card no-tasks-message" style={{
                padding: '32px',
                textAlign: 'center',
                color: 'var(--color-muted)',
                fontSize: '1.2rem',
                border: '2px dashed var(--color-border)',
                marginTop: '24px',
                borderRadius: '12px',
                background: 'var(--color-bg-secondary)'
              }}>
                <span role="img" aria-label="empty">🗒️</span>
                <div style={{ marginTop: '12px' }}>Nessun task presente,<br/>creane uno per iniziare!</div>
              </div>
            ) : (
              <ul className="task-list">
                {tasks.map((task) => (
                  <li key={task.id} className={`task-item ${task.completed ? 'completed' : ''}`}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <strong>{task.title}</strong>
                        <span className={`badge ${task.priority.toLowerCase()}`}>{task.priority}</span>
                        {isUrgent(task.deadline) && <span className="badge" style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}>In scadenza</span>}
                      </div>
                      {task.description && <div className="task-meta" style={{ marginTop: 6 }}>{task.description}</div>}
                      <div className="task-meta" style={{ marginTop: 4 }}>Scadenza: {new Date(task.deadline).toLocaleString()}</div>
                    </div>
                    <div className="actions">
                      <button onClick={() => toggleCompleted(task)} className="btn btn-success">{task.completed ? '✓ Completato' : 'Segna come completato'}</button>
                      <button onClick={() => startEditing(task)} className="btn btn-ghost">✏️ Modifica</button>
                      <button onClick={() => deleteTask(task.id)} className="btn btn-danger">Elimina</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
        </section>
      </div>
      <ToastContainer />
      <ExportModal 
        isOpen={showExportModal} 
        onClose={() => setShowExportModal(false)} 
      />
    </div>
  );
}
