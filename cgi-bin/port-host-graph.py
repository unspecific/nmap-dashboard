#!/usr/bin/env python3

import os
import cgi
import xml.etree.ElementTree as ET
import json

SCAN_ROOT = "/var/log/nmap/scans"
SVG_WIDTH = 800
SVG_HEIGHT = 500
MARGIN = 80
PORT_X = MARGIN
HOST_X = SVG_WIDTH - MARGIN

def extract_links(scan_dir):
    links = []
    ports = set()
    hosts = set()

    for fname in os.listdir(scan_dir):
        if not fname.endswith(".xml"):
            continue

        try:
            tree = ET.parse(os.path.join(scan_dir, fname))
            root = tree.getroot()

            host_elem = root.find("host")
            if host_elem is None or host_elem.find("status[@state='up']") is None:
                continue

            addr = host_elem.find("address")
            if addr is None or "addr" not in addr.attrib:
                continue

            ip = addr.attrib["addr"]
            hosts.add(ip)

            for port in host_elem.findall(".//port"):
                portid = port.attrib.get("portid")
                if portid:
                    ports.add(portid)
                    links.append((portid, ip))

        except Exception:
            continue

    return sorted(list(ports)), sorted(list(hosts)), links

def render_svg(ports, hosts, links):
    spacing_ports = SVG_HEIGHT // max(1, len(ports))
    spacing_hosts = SVG_HEIGHT // max(1, len(hosts))

    svg = [f'<svg width="{SVG_WIDTH}" height="{SVG_HEIGHT}" xmlns="http://www.w3.org/2000/svg">']

    port_pos = {}
    host_pos = {}

    for i, port in enumerate(ports):
        y = spacing_ports * i + spacing_ports // 2
        port_pos[port] = y
        svg.append(f'<text x="{PORT_X - 10}" y="{y}" text-anchor="end" font-size="10" fill="#4fc3f7">{port}</text>')
        svg.append(f'<circle cx="{PORT_X}" cy="{y}" r="4" fill="#4fc3f7" />')

    for i, host in enumerate(hosts):
        y = spacing_hosts * i + spacing_hosts // 2
        host_pos[host] = y
        svg.append(f'<text x="{HOST_X + 10}" y="{y}" text-anchor="start" font-size="10" fill="#e53935">{host}</text>')
        svg.append(f'<circle cx="{HOST_X}" cy="{y}" r="4" fill="#e53935" />')

    for port, host in links:
        y1 = port_pos.get(port)
        y2 = host_pos.get(host)
        if y1 is not None and y2 is not None:
            svg.append(f'<line x1="{PORT_X}" y1="{y1}" x2="{HOST_X}" y2="{y2}" stroke="#aaa" stroke-width="1" />')

    svg.append('</svg>')
    return '\n'.join(svg)

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

    ports, hosts, links = extract_links(scan_dir)
    print(render_svg(ports, hosts, links))

if __name__ == "__main__":
    main()
