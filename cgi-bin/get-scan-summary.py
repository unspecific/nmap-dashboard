#!/usr/bin/env python3

import os
import json
import cgi
import xml.etree.ElementTree as ET

# Base directory for Nmap scan output
SCAN_ROOT = "/var/log/nmap/scans"

def parse_scan_data(scan_dir):
    total_hosts = 0
    live_hosts = 0
    total_ports = 0
    unique_ports = set()

    for fname in os.listdir(scan_dir):
        if not fname.endswith(".xml"):
            continue

        file_path = os.path.join(scan_dir, fname)
        try:
            tree = ET.parse(file_path)
            root = tree.getroot()

            hosts = root.findall("host")
            if not hosts:
                continue

            total_hosts += 1
            host_status = hosts[0].find("status")
            is_up = host_status is not None and host_status.attrib.get("state") == "up"

            if is_up:
                live_hosts += 1
                for port in hosts[0].findall(".//port"):
                    portid = port.attrib.get("portid")
                    if portid:
                        total_ports += 1
                        unique_ports.add(portid)

        except Exception as e:
            # Skip malformed files
            continue

    return {
        "total_hosts": total_hosts,
        "live_hosts": live_hosts,
        "total_ports": total_ports,
        "unique_ports": len(unique_ports)
    }

def main():
    print("Content-Type: application/json\n")

    form = cgi.FieldStorage()
    date = form.getfirst("date")

    if not date or not date.isdigit():
        print(json.dumps({"error": "Missing or invalid date parameter"}))
        return

    scan_dir = os.path.join(SCAN_ROOT, date)
    if not os.path.isdir(scan_dir):
        print(json.dumps({"error": f"Scan directory not found: {scan_dir}"}))
        return

    summary = parse_scan_data(scan_dir)
    print(json.dumps(summary))

if __name__ == "__main__":
    main()
