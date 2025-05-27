#!/usr/bin/env python3

import os
import json
import cgi
import xml.etree.ElementTree as ET
from collections import defaultdict

SCAN_ROOT = "/var/log/nmap/scans"

def parse_port_distribution(scan_dir):
    port_counts = defaultdict(int)

    for fname in os.listdir(scan_dir):
        if not fname.endswith(".xml"):
            continue

        try:
            tree = ET.parse(os.path.join(scan_dir, fname))
            root = tree.getroot()
            host = root.find("host")
            if host is None:
                continue

            if host.find("status[@state='up']") is None:
                continue

            for port in host.findall(".//port"):
                portid = port.attrib.get("portid")
                if portid:
                    port_counts[portid] += 1

        except Exception:
            continue

    return port_counts

def main():
    print("Content-Type: application/json\n")
    form = cgi.FieldStorage()
    date = form.getfirst("date")

    if not date or not date.isdigit():
        print(json.dumps({"error": "Missing or invalid date"}))
        return

    scan_dir = os.path.join(SCAN_ROOT, date)
    if not os.path.isdir(scan_dir):
        print(json.dumps({"error": f"Scan directory not found: {scan_dir}"}))
        return

    result = parse_port_distribution(scan_dir)
    print(json.dumps(result))

if __name__ == "__main__":
    main()
