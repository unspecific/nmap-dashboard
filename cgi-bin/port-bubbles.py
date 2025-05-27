#!/usr/bin/env python3

import os
import cgi
import xml.etree.ElementTree as ET
from collections import defaultdict
import math
import random


SCAN_ROOT = "/var/log/nmap/scans"
MAX_RADIUS = 30
MIN_RADIUS = 10
CHART_WIDTH = 720
CHART_HEIGHT = 160


def get_top_ports(scan_dir):
    port_counts = defaultdict(int)

    for fname in os.listdir(scan_dir):
        if not fname.endswith(".xml"):
            continue

        try:
            tree = ET.parse(os.path.join(scan_dir, fname))
            root = tree.getroot()
            host = root.find("host")
            if host is None or host.find("status[@state='up']") is None:
                continue

            for port in host.findall(".//port"):
                portid = port.attrib.get("portid")
                if portid:
                    port_counts[portid] += 1
        except Exception:
            continue

    return sorted(port_counts.items(), key=lambda x: x[1], reverse=True)[:10]

def generate_svg(top_ports):
    if not top_ports:
        return '<svg width="100" height="50"><text x="10" y="25">No data</text></svg>'

    max_count = top_ports[0][1]
    svg = [f'<svg width="{CHART_WIDTH}" height="{CHART_HEIGHT}" xmlns="http://www.w3.org/2000/svg">']

    x = 0  # Start at the far left
    cx = 40  # initial center x
    cy_base = CHART_HEIGHT // 2

    for port, count in top_ports:
        # More aggressive scaling
        radius = MIN_RADIUS + ((MAX_RADIUS - MIN_RADIUS) * (count / max_count))

        # Random vertical wobble
        cy = cy_base + random.choice([-8, -4, 0, 4, 8])

        # Draw the bubble
        svg.append(f'<circle cx="{cx}" cy="{cy}" r="{radius:.1f}" fill="#4fc3f7">')
        svg.append(f'  <title>Port {port}: {count} hosts</title>')
        svg.append('</circle>')

        # Label inside bubble
        svg.append(f'<text x="{cx}" y="{cy + 4}" text-anchor="middle" font-size="9" fill="#000">{port}</text>')

        # Move x to the right, allowing for slight overlap (85% of width)
        cx += radius * 1.7

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

    top_ports = get_top_ports(scan_dir)
    print(generate_svg(top_ports))

if __name__ == "__main__":
    main()
