# SmartTask 

## 📝 Descrizione

SmartTask è un'applicazione web progettata per facilitare la gestione personale delle attività quotidiane. Offre un'interfaccia semplice e intuitiva per creare, visualizzare, modificare ed eliminare task, con funzionalità avanzate come ordinamento per priorità, modalità chiara/scura e notifiche per le scadenze imminenti. L'app è pensata per utenti singoli che desiderano organizzare il proprio tempo in modo efficace 🚀.

## ✨ Funzionalità

* Gestire attività personali o lavorative 💼
* Tenere traccia di scadenze e priorità 📅
* Aumentare la produttività con suggerimenti e notifiche 💡
* Personalizzare l'esperienza utente tramite la Dark/Light mode 🎨

## 🚀 Installazione

1.  Clona il repository: `git clone https://IL_TUO_REPOSITORY_GITHUB/SmartTask.git`
2.  Entra nella directory del progetto: `cd SmartTask`
3.  Installa le dipendenze del frontend:
    ```bash
    cd frontend
    npm install
    cd ..
    ```
4.  Installa le dipendenze del backend (assicurati di avere Python e pip installati):
    ```bash
    cd backend
    pip install -r requirements.txt
    cd ..
    ```
5.  Avvia il backend (dalla directory `backend`):
    ```bash
    uvicorn main:app --reload
    ```
    (Assumendo che il tuo file principale FastAPI sia `main.py` e l'istanza dell'app sia `app`)
6.  Avvia il frontend (dalla directory `frontend`):
    ```bash
    npm start
    ```

## 🔄 Flussi principali

1.  **Visualizzazione dei task**: L'utente apre l'app e i task vengono caricati dal backend.
2.  **Creazione di un task**: L'utente inserisce titolo, descrizione, data/ora di scadenza e priorità. Clicca "Aggiungi Task" e il task viene salvato e mostrato nella lista.
3.  **Eliminazione di un task**: L'utente clicca "Elimina" accanto a un task e questo viene rimosso dopo conferma.
4.  **Ordinamento dei task**: L'utente può alternare tra visualizzazione normale e ordinata per priorità/scadenza.

## 👥 Team

* Cesari Matteo \[Mat. 1073570]
* Girolamo Davide \[Mat. 1073645]
