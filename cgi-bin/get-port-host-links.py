#!/usr/bin/env python3

import os
import json
import cgi
import xml.etree.ElementTree as ET

SCAN_ROOT = "/var/log/nmap/scans"

def extract_links(scan_dir):
    links = []

    for fname in os.listdir(scan_dir):
        if not fname.endswith(".xml"):
            continue

        path = os.path.join(scan_dir, fname)
        try:
            tree = ET.parse(path)
            root = tree.getroot()

            host_elem = root.find("host")
            if host_elem is None:
                continue

            status = host_elem.find("status")
            if status is None or status.attrib.get("state") != "up":
                continue

            address = host_elem.find("address")
            if address is None or address.attrib.get("addr") is None:
                continue

            ip = address.attrib["addr"]

            for port in host_elem.findall(".//port"):
                portid = port.attrib.get("portid")
                if portid:
                    links.append({
                        "source": portid,
                        "target": ip
                    })

        except Exception:
            continue

    return links

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

    links = extract_links(scan_dir)
    print(json.dumps(links))

if __name__ == "__main__":
    main()
