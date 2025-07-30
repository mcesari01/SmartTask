import { useEffect, useState } from "react";
import axios from "axios";

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [sortBy] = useState(null);
  const [sortOrder] = useState("asc");
  const [sortedView, setSortedView] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);

  const hasChanges = () => {
    if (!editingTaskId) return false;
    const original = tasks.find((t) => t.id === editingTaskId);
    return original && (
      original.title !== title ||
      original.description !== description ||
      new Date(original.deadline).toISOString().slice(0, 16) !== deadline ||
      original.priority !== priority
    );
  };

  useEffect(() => {
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    Notification.requestPermission();
  }, []);

  useEffect(() => {
    const notifiedIds = new Set();

    const interval = setInterval(() => {
      const now = new Date();
      tasks.forEach((task) => {
        const deadline = new Date(task.deadline);
        const diff = deadline - now;

        if (
          diff > 0 &&
          diff <= 60 * 60 * 1000 && // entro 1 ora
          !notifiedIds.has(task.id)
        ) {
          // Mostra notifica
          new Notification("⏰ Task in scadenza", {
            body: `${task.title} scade alle ${deadline.toLocaleTimeString()}`,
          });
          console.log("Notifica inviata per:", task.title);

          // Registra che abbiamo già notificato questo task
          notifiedIds.add(task.id);
        }
      });
    }, 5000); // ogni 30 secondi

    return () => clearInterval(interval);
  }, [tasks]);

  const fetchTasks = async () => {
    let url = "http://localhost:8000/tasks";
    if (!sortedView) {
      url += "?sort_by=priority&sort_order=asc";
    }
    const res = await axios.get(url);
    setTasks(res.data);
  };

  const handleSortToggle = () => {
    setSortedView(!sortedView);
    fetchTasks(); // Re-fetch tasks with the new sorting state
  };

  const createTask = async () => {
    if (!title || !deadline) return;
    await axios.post("http://localhost:8000/tasks", {
      title,
      description,
      deadline,
      priority,
    });
    setTitle("");
    setDescription("");
    setDeadline("");
    setPriority("Medium");
    fetchTasks(sortBy, sortOrder);
  };

  const deleteTask = async (id) => {
    const confirmed = window.confirm("Sei sicuro di voler eliminare questo task?");
    if (!confirmed) return;

    await axios.delete(`http://localhost:8000/tasks/${id}`);
    if (editingTaskId === id) {
      setEditingTaskId(null);
      setTitle("");
      setDescription("");
      setDeadline("");
      setPriority("Medium");
    }
    fetchTasks(sortBy, sortOrder);
  };

  const isUrgent = (deadline) => {
    const now = new Date();
    const taskDate = new Date(deadline);
    const diff = taskDate - now;
    return diff > 0 && diff <= 24 * 60 * 60 * 1000; // entro 24 ore
  };

  const startEditing = (task) => {
    setEditingTaskId(task.id);
    setTitle(task.title);
    setDescription(task.description || "");
    setDeadline(new Date(task.deadline).toISOString().slice(0, 16)); // per input datetime-local
    setPriority(task.priority);
  };

  const updateTask = async () => {
    if (!editingTaskId) return;

    await axios.put(`http://localhost:8000/tasks/${editingTaskId}`, {
      title,
      description,
      deadline,
      priority,
    });

    setEditingTaskId(null);
    setTitle("");
    setDescription("");
    setDeadline("");
    setPriority("Medium");
    fetchTasks();
  };

  return (
      <div className="max-w-xl mx-auto mt-10 p-4">
        <h1 className="text-2xl font-bold mb-4">📋 SmartTask Dashboard</h1>
        <div className="flex flex-col gap-2 mb-6">
          <input
              type="text"
              placeholder="Titolo task"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border p-2 rounded"
          />
          <input
              type="text"
              placeholder="Descrizione"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="border p-2 rounded"
          />
          <input
              data-testid="deadline-input"
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="border p-2 rounded"
            />
          <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="border p-2 rounded"
          >
            <option value="High">Alta</option>
            <option value="Medium">Media</option>
            <option value="Low">Bassa</option>
          </select>
          <button
              onClick={editingTaskId ? updateTask : createTask}
              disabled={!title || !deadline || (editingTaskId && !hasChanges())}
              className={`${editingTaskId ? "bg-orange-500 hover:bg-orange-600" : "bg-blue-500 hover:bg-blue-600"} text-white px-4 py-2 rounded ${
                (!title || !deadline || (editingTaskId && !hasChanges())) && "opacity-50 cursor-not-allowed"
              }`}
          >
            {editingTaskId ? "💾 Salva Modifiche" : "Aggiungi Task"}
          </button>
          {editingTaskId && (
            <button
              onClick={() => {
                setEditingTaskId(null);
                setTitle("");
                setDescription("");
                setDeadline("");
                setPriority("Medium");
              }}
              className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
            >
              ❌ Annulla Modifica
            </button>
          )}
          <button
              onClick={handleSortToggle}
              className="mb-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            {sortedView ? "🔄 Vista Normale" : "📊 Ordina per Priorità/Scadenza"}
          </button>
        </div>
        <ul className="space-y-2">
          {tasks.map((task) => (
              <li
                  key={task.id}
                  className={`border p-3 rounded shadow flex justify-between items-center ${
                      isUrgent(task.deadline)
                          ? 'bg-red-200 border-red-500'
                          : task.priority === "High"
                              ? "bg-red-100"
                              : task.priority === "Medium"
                                  ? "bg-yellow-100"
                                  : "bg-green-100"
                  }`}
              >
                <div>
                  <p className="font-semibold">{task.title} ({task.priority})</p>
                  <p className="text-sm text-gray-500">{task.description}</p>
                  <p className="text-sm text-gray-500">
                    Scadenza: {new Date(task.deadline).toLocaleString()}
                  </p>
                  {isUrgent(task.deadline) && (
                      <p className="text-sm font-bold text-red-700">🔔 In scadenza!</p>
                  )}
                </div>
                <button
                    onClick={() => startEditing(task)}
                    className="bg-yellow-400 text-white px-3 py-1 rounded hover:bg-yellow-500 mr-2"
                >
                  ✏️ Modifica
                </button>
                <button
                    onClick={() => deleteTask(task.id)}
                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                >
                  Elimina
                </button>
              </li>
          ))}
        </ul>
      </div>
  );
}