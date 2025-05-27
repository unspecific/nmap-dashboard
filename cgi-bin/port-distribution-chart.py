#!/usr/bin/env python3

import cgi
import os
import urllib.request
import json

CGI_API = "/cgi-bin/get-port-distribution.py"
MAX_WIDTH = 400
BAR_HEIGHT = 18
GAP = 6
FONT_SIZE = 10
CHART_MARGIN = 50

def render_chart(data):
    sorted_ports = sorted(data.items(), key=lambda x: int(x[1]), reverse=True)[:10]
    max_count = max([int(v) for _, v in sorted_ports]) if sorted_ports else 1

    height = (BAR_HEIGHT + GAP) * len(sorted_ports) + 40
    svg_width = MAX_WIDTH + CHART_MARGIN + 40
    svg = [f'<svg viewBox="0 0 {svg_width} {height}" preserveAspectRatio="xMinYMin meet" xmlns="http://www.w3.org/2000/svg">']

    y = 20
    for port, count in sorted_ports:
        width = int((int(count) / max_count) * MAX_WIDTH)
        svg.append(f'<rect x="{CHART_MARGIN}" y="{y}" width="{width}" height="{BAR_HEIGHT}" fill="#4fc3f7">')
        svg.append(f'<title>Port {port}: {count} hosts</title></rect>')
        svg.append(f'<text x="{CHART_MARGIN - 10}" y="{y + BAR_HEIGHT - 4}" text-anchor="end" font-size="{FONT_SIZE}" fill="#4fc3f7">{port}</text>')
        label_x = min(CHART_MARGIN + width + 5, MAX_WIDTH + CHART_MARGIN - 10)
        svg.append(f'<text x="{CHART_MARGIN + width + 5}" y="{y + BAR_HEIGHT - 4}" font-size="{FONT_SIZE}" fill="#999">{count}</text>')
        y += BAR_HEIGHT + GAP

    svg.append('</svg>')
    return "\n".join(svg)

def main():
    print("Content-Type: image/svg+xml\n")
    form = cgi.FieldStorage()
    date = form.getfirst("date")
    if not date or not date.isdigit():
        print('<svg><text x="10" y="20">Invalid date</text></svg>')
        return

    try:
        with urllib.request.urlopen(f"http://localhost:8080{CGI_API}?date={date}") as res:
            data = json.loads(res.read().decode())
    except Exception as e:
        print(f'<svg><text x="10" y="20">Error loading data: {str(e)}</text></svg>')
        return

    print(render_chart(data))

if __name__ == "__main__":
    main()
