import { useEffect, useState } from "react";
import axios from "axios";

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState("Medium");

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    const res = await axios.get("http://localhost:8000/tasks");
    setTasks(res.data);
  };


  const createTask = async () => {
    if (!title || !deadline) return;

    const adjustedDeadline = new Date(deadline).toISOString();

    await axios.post("http://localhost:8000/tasks", {
      title,
      description: description || "",
      deadline: adjustedDeadline,
      priority,
    });
    setTitle("");
    setDescription("");
    setDeadline("");
    setPriority("Medium");
    fetchTasks();
  };

  const deleteTask = async (id) => {
    await axios.delete(`http://localhost:8000/tasks/${id}`);
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
              onClick={createTask}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Aggiungi Task
          </button>
        </div>

        <ul className="space-y-2">
          {tasks.map((task) => (
              <li
                  key={task.id}
                  className={`border p-3 rounded shadow flex justify-between items-center ${
                      task.priority === "High"
                          ? "bg-red-100"
                          : task.priority === "Medium"
                              ? "bg-yellow-100"
                              : "bg-green-100"
                  }`}
              >
                <div>
                  <p className="font-semibold">
                    {task.title} (
                    {task.priority === "High"
                        ? "Alta"
                        : task.priority === "Medium"
                            ? "Media"
                            : "Bassa"}
                    )
                  </p>
                  <p className="text-sm text-gray-500">{task.description}</p>
                  <p className="text-sm text-gray-500">
                    Scadenza: {new Date(task.deadline).toLocaleString()}
                  </p>
                </div>
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
