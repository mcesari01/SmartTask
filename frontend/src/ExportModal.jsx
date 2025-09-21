import { useState } from 'react';
import axios from 'axios';

export default function ExportModal({ isOpen, onClose }) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState('');

  const handleExport = async (type) => {
    if (!type) return;
    
    setIsExporting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:8000/tasks/export/${type}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const filename = `tasks.${type}`;
      if (type === 'excel') {
        link.download = 'tasks.xlsx';
      } else {
        link.download = filename;
      }
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      onClose();
    } catch (error) {
      console.error('Export error:', error);
      alert('Errore durante l\'esportazione. Riprova.');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📤 Esporta Task</h2>
          <button className="btn btn-ghost" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-body">
          <p>Seleziona il formato in cui esportare i tuoi task:</p>
          
          <div className="export-options">
            <button
              className={`export-option ${exportType === 'csv' ? 'selected' : ''}`}
              onClick={() => setExportType('csv')}
              disabled={isExporting}
            >
              <div className="export-icon">📊</div>
              <div className="export-info">
                <div className="export-title">CSV</div>
                <div className="export-desc">Formato tabellare per Excel e altri fogli di calcolo</div>
              </div>
            </button>
            
            <button
              className={`export-option ${exportType === 'excel' ? 'selected' : ''}`}
              onClick={() => setExportType('excel')}
              disabled={isExporting}
            >
              <div className="export-icon">📈</div>
              <div className="export-info">
                <div className="export-title">Excel</div>
                <div className="export-desc">File Excel con formattazione avanzata</div>
              </div>
            </button>
            
            <button
              className={`export-option ${exportType === 'pdf' ? 'selected' : ''}`}
              onClick={() => setExportType('pdf')}
              disabled={isExporting}
            >
              <div className="export-icon">📄</div>
              <div className="export-info">
                <div className="export-title">PDF</div>
                <div className="export-desc">Documento PDF per stampa e condivisione</div>
              </div>
            </button>
          </div>
        </div>
        
        <div className="modal-footer">
          <button
            className="btn btn-ghost"
            onClick={onClose}
            disabled={isExporting}
          >
            Annulla
          </button>
          <button
            className="btn"
            onClick={() => handleExport(exportType)}
            disabled={!exportType || isExporting}
          >
            {isExporting ? '⏳ Esportazione...' : '📥 Scarica'}
          </button>
        </div>
      </div>
    </div>
  );
}
