#!/usr/bin/env python3

import os
import json
import cgi
import cgitb
from pathlib import Path
import xml.etree.ElementTree as ET
from collections import defaultdict, Counter

cgitb.enable()

SCAN_ROOT = Path("/var/log/nmap/scans")
CACHE_DIR = Path("scan-cache")

def parse_xml_file(file_path):
    try:
        tree = ET.parse(file_path)
        root = tree.getroot()

        host_elem = root.find('host')
        if host_elem is None or host_elem.find('status') is None:
            return None

        status = host_elem.find('status').attrib.get('state')
        if status != 'up':
            return None

        ip = host_elem.find('address[@addrtype="ipv4"]').attrib.get('addr')
        hostname_elem = host_elem.find('hostnames/hostname')
        hostname = hostname_elem.attrib.get('name') if hostname_elem is not None else ""

        os_elem = host_elem.find('os/osmatch')
        os_name = os_elem.attrib.get('name') if os_elem is not None else "Unknown"

        ports_elem = host_elem.find('ports')
        ports = {}
        if ports_elem:
            for port_elem in ports_elem.findall('port'):
                port_id = port_elem.attrib['portid']
                protocol = port_elem.attrib['protocol']
                state = port_elem.find('state').attrib.get('state')
                reason = port_elem.find('state').attrib.get('reason', '')
                service_elem = port_elem.find('service')
                service = service_elem.attrib.get('name', '') if service_elem is not None else ''
                product = service_elem.attrib.get('product', '') if service_elem is not None else ''
                version = service_elem.attrib.get('version', '') if service_elem is not None else ''
                tls = None
                script_output = ""
                for script in port_elem.findall('script'):
                    if 'tls' in script.attrib.get('id', ''):
                        tls = script.attrib.get('output')
                        script_output += script.attrib.get('output', '')

                ports[port_id] = {
                    "protocol": protocol,
                    "state": state,
                    "reason": reason,
                    "service": service,
                    "product": product,
                    "version": version,
                    "tls_cert": tls,
                    "script_output": script_output
                }

        mac_elem = host_elem.find('address[@addrtype="mac"]')
        mac = mac_elem.attrib.get('addr') if mac_elem is not None else ""
        vendor = mac_elem.attrib.get('vendor') if mac_elem is not None else ""

        return ip, {
            "hostname": hostname,
            "os": os_name,
            "mac": mac,
            "vendor": vendor,
            "ports": ports,
            "open_ports": sum(1 for p in ports.values() if p["state"] == "open"),
            "closed_ports": sum(1 for p in ports.values() if p["state"] == "closed"),
            "filtered_ports": sum(1 for p in ports.values() if p["state"] == "filtered"),
            "state": status
        }

    except Exception as e:
        return None


def main():
    print("Content-Type: application/json\n")
    form = cgi.FieldStorage()
    date = form.getfirst("date")
    force = form.getfirst("rebuild") == "true"

    if not date:
        print(json.dumps({"error": "Missing date"}))
        return

    scan_dir = SCAN_ROOT / date
    if not scan_dir.exists():
        print(json.dumps({"error": f"Scan directory {scan_dir} not found"}))
        return

    cache_file = CACHE_DIR / f"{date}.json"
    if cache_file.exists() and not force:
        with open(cache_file) as f:
            print(f.read())
            return

    hosts = {}
    port_counter = Counter()
    os_counter = Counter()
    tls_info = {"valid": 0, "expired": 0, "self_signed": 0}
    total_hosts = 0
    live_hosts = 0

    for xml_file in scan_dir.glob("*.xml"):
        result = parse_xml_file(xml_file)
        if result is None:
            continue

        ip, data = result
        if not ip:
            continue

        hosts[ip] = data
        live_hosts += 1
        os_counter[data["os"]] += 1

        for port, pdata in data["ports"].items():
            port_counter[port] += 1
            if pdata["tls_cert"]:
                if "self-signed" in pdata["tls_cert"].lower():
                    tls_info["self_signed"] += 1
                elif "expired" in pdata["tls_cert"].lower():
                    tls_info["expired"] += 1
                else:
                    tls_info["valid"] += 1

    total_hosts = len(list(scan_dir.glob("*.xml")))
    unique_ports = len(port_counter)

    output = {
        "scan_date": date,
        "summary": {
            "total_hosts": total_hosts,
            "live_hosts": live_hosts,
            "total_ports": sum(port_counter.values()),
            "unique_ports": unique_ports
        },
        "os_distribution": dict(os_counter.most_common()),
        "port_distribution": dict(port_counter.most_common(10)),
        "tls_info": tls_info,
        "hosts": hosts
    }

    CACHE_DIR.mkdir(exist_ok=True)
    with open(cache_file, "w") as f:
        json.dump(output, f, indent=2)

    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
