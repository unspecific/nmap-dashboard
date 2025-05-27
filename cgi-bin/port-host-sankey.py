#!/usr/bin/env python3

import os
import cgi
import xml.etree.ElementTree as ET
import json
from collections import defaultdict, Counter

SCAN_ROOT = "/var/log/nmap/scans"
SVG_WIDTH = 800
SVG_HEIGHT = 500
MARGIN_X = 100
PORT_X = MARGIN_X
HOST_X = SVG_WIDTH - MARGIN_X

def extract_connections(scan_dir):
    port_to_hosts = defaultdict(set)
    host_to_ports = defaultdict(set)

    for fname in os.listdir(scan_dir):
        if not fname.endswith(".xml"):
            continue

        try:
            tree = ET.parse(os.path.join(scan_dir, fname))
            root = tree.getroot()

            host_elem = root.find("host")
            if host_elem is None or host_elem.find("status[@state='up']") is None:
                continue

            address = host_elem.find("address")
            if address is None or "addr" not in address.attrib:
                continue

            ip = address.attrib["addr"]

            for port in host_elem.findall(".//port"):
                portid = port.attrib.get("portid")
                if portid:
                    port_to_hosts[portid].add(ip)
                    host_to_ports[ip].add(portid)

        except Exception:
            continue

    # Sort and limit to top 10 by count
    top_ports = [p for p, _ in Counter({k: len(v) for k, v in port_to_hosts.items()}).most_common(10)]
    top_hosts = [h for h, _ in Counter({k: len(v) for k, v in host_to_ports.items()}).most_common(10)]

    # Filter links to top 10 x top 10 only
    links = [(p, h) for p in top_ports for h in port_to_hosts[p] if h in top_hosts]

    return top_ports, top_hosts, links

def generate_svg(ports, hosts, links):
    svg = [f'<svg width="{SVG_WIDTH}" height="{SVG_HEIGHT}" xmlns="http://www.w3.org/2000/svg">']

    spacing_ports = SVG_HEIGHT // (len(ports) + 1)
    spacing_hosts = SVG_HEIGHT // (len(hosts) + 1)

    port_pos = {}
    host_pos = {}

    # Draw ports on the left
    for i, port in enumerate(ports):
        y = (i + 1) * spacing_ports
        port_pos[port] = y
        svg.append(f'<circle cx="{PORT_X}" cy="{y}" r="4" fill="#4fc3f7" />')
        svg.append(f'<text x="{PORT_X - 10}" y="{y + 4}" text-anchor="end" font-size="10" fill="#4fc3f7">{port}</text>')

    # Draw hosts on the right
    for i, host in enumerate(hosts):
        y = (i + 1) * spacing_hosts
        host_pos[host] = y
        svg.append(f'<circle cx="{HOST_X}" cy="{y}" r="4" fill="#e53935" />')
        svg.append(f'<text x="{HOST_X + 10}" y="{y + 4}" text-anchor="start" font-size="10" fill="#e53935">{host}</text>')

    # Draw curved lines
    for port, host in links:
        y1 = port_pos[port]
        y2 = host_pos[host]
        svg.append(
            f'<path d="M {PORT_X},{y1} C {(PORT_X + HOST_X)//2},{y1} {(PORT_X + HOST_X)//2},{y2} {HOST_X},{y2}" '
            f'stroke="#999" stroke-width="1" fill="none" />'
        )

    svg.append('</svg>')
    return "\n".join(svg)

def main():
    print("Content-Type: image/svg+xml\n")

    form = cgi.FieldStorage()
    date = form.getfirst("date")
    if not date or not date.isdigit():
        print('<svg><text x="10" y="20">Invalid date</text></svg>')
        return

    scan_dir = os.path.join(SCAN_ROOT, date)
    if not os.path.isdir(scan_dir):
        print('<svg><text x="10" y="20">Scan directory not found</text></svg>')
        return

    ports, hosts, links = extract_connections(scan_dir)
    print(generate_svg(ports, hosts, links))

if __name__ == "__main__":
    main()
