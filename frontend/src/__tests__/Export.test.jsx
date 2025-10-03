// src/__tests__/Export.test.jsx
import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import ExportModal from "../ExportModal";

// Mock di axios
vi.mock("axios");

// Mock di alert
global.alert = vi.fn();

describe("exportFile standalone function", () => {
  async function exportFile(exportType, onClose) {
    if (!exportType) return;

    try {
      const response = await axios.get(
        `http://localhost:8000/tasks/export/${exportType}`,
        { headers: {}, responseType: "blob" }
      );

      const blob = new Blob([response.data], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = { href: "", download: "", click: vi.fn() };
      a.href = url;
      a.download = `tasks.${exportType}`;
      a.click();
      URL.revokeObjectURL(url);
      onClose?.();
    } catch (err) {
      console.error("Export error", err);
    }
  }

  let mockBlob, mockURL, onClose;

  beforeEach(() => {
    vi.resetAllMocks();
    onClose = vi.fn();
    mockBlob = vi.fn();
    global.Blob = mockBlob;

    mockURL = {
      createObjectURL: vi.fn().mockReturnValue("blob:http://mocked-url"),
      revokeObjectURL: vi.fn(),
    };
    global.URL = mockURL;
  });

  it("chiama axios e genera link con exportType csv", async () => {
    axios.get.mockResolvedValue({ data: "mocked csv data" });

    await exportFile("csv", onClose);

    expect(axios.get).toHaveBeenCalledWith(
      "http://localhost:8000/tasks/export/csv",
      { headers: {}, responseType: "blob" }
    );
    expect(mockBlob).toHaveBeenCalledWith(["mocked csv data"], { type: "application/octet-stream" });
    expect(onClose).toHaveBeenCalled();
  });

  it("gestisce errore di export senza crash", async () => {
    axios.get.mockRejectedValue(new Error("Server error"));

    await exportFile("csv", onClose);

    expect(axios.get).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("non fa nulla se exportType è vuoto", async () => {
    await exportFile("", onClose);

    expect(axios.get).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("ExportModal component", () => {
  let onClose;

  beforeEach(() => {
    vi.resetAllMocks();
    onClose = vi.fn();
    axios.get.mockResolvedValue({ data: "fake-binary" });
    global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
    global.URL.revokeObjectURL = vi.fn();
  });

  it("non renderizza nulla se isOpen=false", () => {
    const { container } = render(<ExportModal isOpen={false} onClose={onClose} />);
    expect(container.firstChild).toBeNull();
  });

  it("renderizza correttamente quando isOpen=true", () => {
    render(<ExportModal isOpen={true} onClose={onClose} />);
    expect(screen.getByText("📤 Esporta Task")).toBeInTheDocument();
    expect(screen.getByText("CSV")).toBeInTheDocument();
    expect(screen.getByText("Excel")).toBeInTheDocument();
    expect(screen.getByText("PDF")).toBeInTheDocument();
  });

  it("permette di selezionare il tipo CSV e abilita il pulsante scarica", () => {
    render(<ExportModal isOpen={true} onClose={onClose} />);
    const csvButton = screen.getByText("CSV").closest("button");
    fireEvent.click(csvButton);
    expect(csvButton.className).toContain("selected");

    const downloadBtn = screen.getByText("📥 Scarica");
    expect(downloadBtn).not.toBeDisabled();
  });

  it("usa il nome file speciale per excel", async () => {
    render(<ExportModal isOpen={true} onClose={onClose} />);
    const excelButton = screen.getByText("Excel").closest("button");
    fireEvent.click(excelButton);
    fireEvent.click(screen.getByText("📥 Scarica"));

    await waitFor(() => expect(axios.get).toHaveBeenCalled());

    const callArgs = axios.get.mock.calls[0][0];
    expect(callArgs).toContain("/tasks/export/excel");
  });

  it("chiama onClose dopo export riuscito", async () => {
    render(<ExportModal isOpen={true} onClose={onClose} />);
    const csvButton = screen.getByText("CSV").closest("button");
    fireEvent.click(csvButton);
    fireEvent.click(screen.getByText("📥 Scarica"));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("gestisce errore durante export e mostra alert", async () => {
    axios.get.mockRejectedValue(new Error("Errore export"));
    render(<ExportModal isOpen={true} onClose={onClose} />);
    const pdfButton = screen.getByText("PDF").closest("button");
    fireEvent.click(pdfButton);
    fireEvent.click(screen.getByText("📥 Scarica"));

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith(
        "Errore durante l'esportazione. Riprova."
      );
    });
  });

  it("chiude la modale cliccando su overlay", () => {
    const { container } = render(<ExportModal isOpen={true} onClose={onClose} />);
    const overlay = container.querySelector(".modal-overlay");
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalled();
  });

  it("chiude la modale cliccando sulla X", () => {
    render(<ExportModal isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByText("✕"));
    expect(onClose).toHaveBeenCalled();
  });
});