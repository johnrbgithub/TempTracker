from flask import Flask, jsonify, send_from_directory
import sqlite3
import os

app = Flask(__name__, static_folder='static')
DB_FILE = 'tempstick_data.db'

@app.route('/data')
def get_data():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('SELECT * FROM readings')
    col_names = [description[0] for description in c.description]
    rows = c.fetchall()
    conn.close()
    data = [dict(zip(col_names, row)) for row in rows]
    return jsonify(data)

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def static_proxy(path):
    return send_from_directory(app.static_folder, path)

if __name__ == '__main__':
    # Listen on all interfaces for LAN access
    app.run(host='0.0.0.0', port=5000, debug=True) 