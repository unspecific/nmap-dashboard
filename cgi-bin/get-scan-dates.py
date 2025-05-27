#!/usr/bin/env python3

import os
import json

SCAN_ROOT = "/var/log/nmap/scans"

def get_scan_dates():
    try:
        return sorted(
            [d for d in os.listdir(SCAN_ROOT)
             if os.path.isdir(os.path.join(SCAN_ROOT, d)) and d.isdigit()],
            reverse=True
        )
    except Exception:
        return []

print("Content-Type: application/json\n")
print(json.dumps(get_scan_dates()))
