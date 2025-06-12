# TempTracker

A project to fetch, store, and visualize Temp Stick sensor data.

## Features
- Fetches data from Temp Stick API and stores in SQLite
- Exports data to CSV
- Serves data via Flask API for web frontend

## Development Setup (Mac/Linux)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/johnrbgithub/TempTracker.git
   cd TempTracker
   ```
2. **Create and activate a virtual environment:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
4. **Fetch and store data:**
   ```bash
   python fetch_and_store.py
   ```
5. **Export to CSV (optional):**
   ```bash
   python export_to_csv.py > output.csv
   ```
6. **Run the Flask server:**
   ```bash
   python server.py
   ```

## Deployment on Another Machine (Linux VM)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/johnrbgithub/TempTracker.git
   cd TempTracker
   ```
2. **Set up Python and virtual environment:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```
3. **Copy your SQLite database if you want to preserve data:**
   ```bash
   scp user@devmachine:/path/to/TempTracker/tempstick_data.db ./
   ```
4. **Run the Flask server (LAN-ready):**
   ```bash
   python server.py
   ```
   - The server will be accessible at `http://<linux-vm-ip>:5000/` from any device on your LAN.

## Configuration
- API keys and other secrets should be set as environment variables or in a `.env` file (future-proofing).
- Flask server is set to listen on `0.0.0.0` for LAN access.

## Notes
- For production, consider using a process manager (e.g., systemd, gunicorn) and a reverse proxy (e.g., Nginx).
- The frontend will be served from the same Flask server for simplicity. 