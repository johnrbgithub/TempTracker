import json
import requests
import sqlite3
import os
import gzip
import io
from datetime import datetime, timedelta

API_KEY = '67b10d1f7a446a36c8346670abb1a6b3ac2185ffffbc16374e'  # Replace with your actual API key
API_READINGS_URL = 'https://tempstickapi.com/api/v1/sensor/{}/readings?setting=custom&start={}&end={}&offset={}'
SENSORS_FILE = 'sensors.json'
DB_FILE = 'tempstick_data.db'
# Phoenix, AZ is UTC-7 year-round, so offset is -25200 seconds
PHOENIX_UTC_OFFSET = -25200

def load_sensors():
    with open(SENSORS_FILE, 'r') as f:
        return json.load(f)

def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sensor_number INTEGER,
            sensor_id INTEGER,
            temp_c REAL,
            humidity REAL,
            voltage REAL,
            rssi INTEGER,
            time_to_connect INTEGER,
            sensor_time TEXT,
            last_checkin TEXT,
            fetched_at TEXT
        )
    ''')
    conn.commit()
    return conn

def fetch_sensor_readings(sensor_id, start_date, end_date, offset):
    headers = {
        'X-API-KEY': API_KEY,
        'Accept-Encoding': 'gzip'
    }
    url = API_READINGS_URL.format(sensor_id, start_date, end_date, offset)
    response = requests.get(url, headers=headers, stream=True)
    if response.status_code == 200:
        # Try plain JSON first
        try:
            raw_data = response.content.decode('utf-8')
            print('RAW API RESPONSE:', raw_data)  # Debug print
            data = json.loads(raw_data)
        except Exception as e:
            print(f"Plain JSON decode failed: {e}, trying gzip...")
            try:
                buf = io.BytesIO(response.content)
                with gzip.GzipFile(fileobj=buf) as gz:
                    raw_data = gz.read().decode('utf-8')
                    print('RAW API RESPONSE (gzipped):', raw_data)  # Debug print
                    data = json.loads(raw_data)
            except Exception as e2:
                print(f"Gzip decode also failed: {e2}")
                return []
        # Handle error responses
        if data.get('type') == 'error':
            print(f"Warning: Sensor {sensor_id} error: {data.get('message')}")
            return []
        readings = data.get('data', {}).get('readings', [])
        if readings:
            print('First reading structure:', readings[0])
        return readings
    else:
        print(f"Failed to fetch readings for sensor {sensor_id}: {response.status_code}")
        return []

def store_reading(conn, sensor_number, sensor_id, temp_c, humidity, voltage, rssi, time_to_connect, sensor_time, last_checkin):
    c = conn.cursor()
    c.execute('''
        INSERT INTO readings (sensor_number, sensor_id, temp_c, humidity, voltage, rssi, time_to_connect, sensor_time, last_checkin, fetched_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (sensor_number, sensor_id, temp_c, humidity, voltage, rssi, time_to_connect, sensor_time, last_checkin, datetime.utcnow().isoformat()))
    conn.commit()

def main():
    sensors = load_sensors()
    conn = init_db()
    end_date = datetime.utcnow().date()
    start_date = end_date - timedelta(days=5)
    for sensor in sensors:
        readings = fetch_sensor_readings(sensor['id'], start_date.isoformat(), end_date.isoformat(), PHOENIX_UTC_OFFSET)
        for reading in readings:
            if not isinstance(reading, dict):
                print('Warning: Skipping non-dict reading:', reading)
                continue
            temp_c = reading.get('temperature')
            humidity = reading.get('humidity')
            voltage = reading.get('voltage')
            rssi = reading.get('rssi')
            time_to_connect = reading.get('time_to_connect')
            sensor_time = reading.get('sensor_time')
            last_checkin = sensor_time  # For compatibility, use sensor_time as last_checkin
            if temp_c is not None and humidity is not None and sensor_time is not None:
                store_reading(conn, sensor['number'], sensor['id'], temp_c, humidity, voltage, rssi, time_to_connect, sensor_time, last_checkin)
        print(f"Stored {len(readings)} readings for sensor {sensor['number']} (ID: {sensor['id']})")
    conn.close()

if __name__ == '__main__':
    main()

# Differences between expected and actual responses:
# - The readings are under data['readings'], not directly under data or as a top-level list.
# - The field names are 'temperature', 'humidity', 'sensor_time' (not 'temp_c', 'last_temp', 'last_checkin').
# - Always check the structure of the response before processing. 