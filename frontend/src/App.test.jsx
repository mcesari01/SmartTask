import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "./App";
import axios from "axios";
import { vi, describe, test, expect, beforeEach } from "vitest";

// Mock axios
vi.mock("axios");

describe("SmartTask App", () => {
  beforeEach(() => {
    axios.get.mockReset();
    axios.post.mockReset();
    axios.delete.mockReset();
    axios.put.mockReset();
  });

  test("renders SmartTask Dashboard title", async () => {
    axios.get.mockResolvedValue({ data: [] });

    render(<App />);

    const title = await screen.findByText(/SmartTask Dashboard/i);
    expect(title).toBeInTheDocument();
  });

  test("fetches and displays tasks", async () => {
    axios.get.mockResolvedValueOnce({
      data: [
        {
          id: 1,
          title: "Task di prova",
          description: "Mock description",
          deadline: new Date().toISOString(),
          priority: "High",
        },
      ],
    });

    render(<App />);

    await screen.findByText(/Task di prova/i);
    expect(screen.getByText(/Mock description/i)).toBeInTheDocument();
  });

  test("creates a new task", async () => {
    axios.get.mockResolvedValue({ data: [] });
    axios.post.mockResolvedValue({});

    render(<App />);
    await screen.findByText(/SmartTask Dashboard/i); // barriera per evitare warning

    fireEvent.change(screen.getByPlaceholderText(/Titolo task/i), {
      target: { value: "Nuovo Task" },
    });

    fireEvent.change(screen.getByPlaceholderText(/Descrizione/i), {
      target: { value: "Descrizione nuova" },
    });

    const deadline = new Date().toISOString().slice(0, 16);
    fireEvent.change(screen.getByTestId("deadline-input"), {
      target: { value: deadline },
    });

    fireEvent.click(screen.getByText(/Aggiungi Task/i));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        "http://localhost:8000/tasks",
        expect.objectContaining({
          title: "Nuovo Task",
          description: "Descrizione nuova",
          deadline: expect.any(String),
          priority: "Medium",
        })
      );
    });
  });

  test("updates an existing task", async () => {
    const existingTask = {
      id: 3,
      title: "Task iniziale",
      description: "Descrizione iniziale",
      deadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // tra 2 ore
      priority: "Medium",
    };

    axios.get.mockResolvedValueOnce({ data: [existingTask] });
    axios.get.mockResolvedValue({ data: [] });
    axios.put.mockResolvedValue({});

    render(<App />);
    await screen.findByText(/Task iniziale/i);

    fireEvent.click(screen.getByText(/✏️ Modifica/i));

    fireEvent.change(screen.getByPlaceholderText(/Titolo task/i), {
      target: { value: "Task modificato" },
    });

    fireEvent.change(screen.getByPlaceholderText(/Descrizione/i), {
      target: { value: "Nuova descrizione" },
    });

    const newDeadline = new Date(Date.now() + 5 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 16);

    fireEvent.change(screen.getByTestId("deadline-input"), {
      target: { value: newDeadline },
    });

    fireEvent.click(screen.getByText(/💾 Salva Modifiche/i));

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith(
        "http://localhost:8000/tasks/3",
        expect.objectContaining({
          title: "Task modificato",
          description: "Nuova descrizione",
          deadline: expect.any(String),
          priority: "Medium",
        })
      );
    });
  });

  test("deletes a task", async () => {
    axios.get.mockResolvedValueOnce({
      data: [
        {
          id: 2,
          title: "Da eliminare",
          description: "Task da cancellare",
          deadline: new Date().toISOString(),
          priority: "Low",
        },
      ],
    });

    axios.get.mockResolvedValue({ data: [] });
    axios.delete.mockResolvedValue({ data: { detail: "Task deleted" } });

    render(<App />);
    await screen.findByText(/Da eliminare/i);

    const deleteButton = screen.getByRole("button", { name: /Elimina/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(axios.delete).toHaveBeenCalledWith(
        "http://localhost:8000/tasks/2"
      );
    });
  });
});
