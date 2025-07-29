# SmartTask 

## 📝 Descrizione

SmartTask è un'applicazione web progettata per facilitare la gestione personale delle attività quotidiane. Offre un'interfaccia semplice e intuitiva per creare, visualizzare, modificare ed eliminare task, con funzionalità avanzate come ordinamento per priorità, modalità chiara/scura e notifiche per le scadenze imminenti. L'app è pensata per utenti singoli che desiderano organizzare il proprio tempo in modo efficace.

## ✨ Funzionalità

* Gestire attività personali o lavorative
* Tenere traccia di scadenze e priorità
* Aumentare la produttività con suggerimenti e notifiche
* Personalizzare l'esperienza utente tramite la Dark/Light mode

## 🔄 Flussi principali

1.  **Visualizzazione dei task**: L'utente apre l'app e i task vengono caricati dal backend.
2.  **Creazione di un task**: L'utente inserisce titolo, descrizione, data/ora di scadenza e priorità. Clicca "Aggiungi Task" e il task viene salvato e mostrato nella lista.
3.  **Eliminazione di un task**: L'utente clicca "Elimina" accanto a un task e questo viene rimosso dopo conferma.
4.  **Ordinamento dei task**: L'utente può alternare tra visualizzazione normale e ordinata per priorità/scadenza.

## ⚙️ Setup dell'ambiente di sviluppo
### 1. Clona la repository

```bash
git clone https://github.com/mcesari01/SmartTask.git
cd SmartTask/backend
```

### 2. Create un ambiente virtuale per il backend

```bash
python -m venv venv
source venv/bin/activate     # macOS/Linux
venv\Scripts\activate        # Windows
``` 

### 3. Installazione dipendenze

```bash
pip install -r requirements.txt
```

### 4. Avvio del server FastAPI
```bash
uvicorn main:app --reload
```

### 5. Installazione dipendenze
```bash
cd frontend
npm install
```

### 6. Avvio frontend
```bash
npm run dev
```

## 👥 Team

* Cesari Matteo \[Mat. 1073570]
* Girolamo Davide \[Mat. 1073645]
