// src/App.jsx
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ExportModal from './ExportModal';

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [sortBy, setSortBy] = useState('insertion'); // insertion | deadline | priority
  const [sortOrder, setSortOrder] = useState('asc'); // asc | desc
  const [completedFilter, setCompletedFilter] = useState('all'); // all | completed | active
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [showExportModal, setShowExportModal] = useState(false);
  const navigate = useNavigate();

  const resetForm = () => {
    setEditingTaskId(null);
    setTitle('');
    setDescription('');
    setDeadline('');
    setPriority('Medium');
  };

  const hasChanges = () => {
    if (!editingTaskId) return false;
    const original = tasks.find((t) => t.id === editingTaskId);
    return (
      original &&
      (original.title !== title ||
        original.description !== description ||
        new Date(original.deadline).toISOString().slice(0, 16) !== deadline ||
        original.priority !== priority)
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
    if (!title || !deadline) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        'http://localhost:8000/tasks',
        { title, description, deadline, priority },
        { headers: { Authorization: `Bearer ${token}` } }
      );
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
      await axios.put(
        `http://localhost:8000/tasks/${editingTaskId}`,
        { title, description, deadline, priority },
        { headers: { Authorization: `Bearer ${token}` } }
      );
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
    setDeadline(new Date(task.deadline).toISOString().slice(0, 16));
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
            <label htmlFor="deadline">Scadenza</label>
            <input data-testid="deadline-input" id="deadline" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
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
              disabled={!title || !deadline || (editingTaskId && !hasChanges())}
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
          <div className="form-actions" style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
  <button
    className="btn btn-ghost"
    onClick={() => {
      const options = ['deadline', 'insertion', 'priority'];
      /*
      const labels = {
        deadline: 'Per scadenza',
        insertion: 'Per inserimento',
        priority: 'Per priorità',
      };*/

      // prendo l'indice corrente
      const currentIndex = options.indexOf(sortBy);
      // calcolo il prossimo
      const nextIndex = (currentIndex + 1) % options.length;
      // aggiorno lo stato
      setSortBy(options[nextIndex]);
    }}
    aria-label="Ordina"
  >
    {sortBy === 'deadline'
      ? 'Per scadenza'
      : sortBy === 'insertion'
      ? 'Per inserimento'
      : 'Per priorità'}
  </button>
</div>
            </div>
            <div>
              <button className="btn btn-ghost" onClick={() => setSortOrder((prev) => prev === 'asc' ? 'desc' : 'asc')} aria-label="Direzione">
                {sortOrder === 'asc' ? 'Ascendente' : 'Discendente'}
              </button>
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
