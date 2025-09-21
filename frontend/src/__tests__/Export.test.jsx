// src/__tests__/Export.test.jsx
import { vi, describe, it, expect, beforeEach } from "vitest";
import axios from "axios";

// Mock di axios
vi.mock("axios");

// Funzione exportFile da testare (senza usare React/Hook)
async function exportFile(exportType, onClose) {
  if (!exportType) return; // <<< ritorno immediato se exportType non specificato

  try {
    const response = await axios.get(
      `http://localhost:8000/tasks/export/${exportType}`,
      { headers: {}, responseType: "blob" }
    );

    const blob = new Blob([response.data], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = { href: "", download: "", click: vi.fn() }; // Mock del link
    a.href = url;
    a.download = `tasks.${exportType}`;
    a.click();
    URL.revokeObjectURL(url);
    onClose?.();
  } catch (err) {
    console.error("Export error", err);
  }
}

describe("exportFile function", () => {
  let mockBlob, mockURL, onClose;

  beforeEach(() => {
    vi.resetAllMocks();
    onClose = vi.fn();

    // Mock globali
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
    expect(onClose).not.toHaveBeenCalled(); // Non chiude se c'è errore
  });

  it("non fa nulla se exportType è vuoto", async () => {
    await exportFile("", onClose);

    expect(axios.get).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
