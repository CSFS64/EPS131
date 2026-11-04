"""Optional provenance helper; the released site uses bundled verified static data.
Requires an internet connection. No third-party packages required.
"""
import json
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / 'data' / 'ridgecrest-usgs-raw.geojson'
URL = 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&eventid=ci38457511'
request = Request(URL, headers={'User-Agent': 'EEW-Lab-educational/0.1'})
with urlopen(request, timeout=30) as r:
    data = json.load(r)
assert data['id'] == 'ci38457511', 'Unexpected event response'
TARGET.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'Saved raw USGS record to {TARGET}')
print('Coordinates (longitude, latitude, depth km):', data['geometry']['coordinates'])
