import re

with open('src/symbols/registry/automation.ts', 'r') as f:
    content = f.read()

# Update ADA/EPWCore to explicitly define RS485 and ETH mediums
content = content.replace("domain: 'data', direction: 'passive'}]", "domain: 'data', medium: 'rs485', direction: 'passive'}]")
content = content.replace("id: 'ETH', x: 0.8, y: 0, domain: 'data', direction: 'passive'", "id: 'ETH', x: 0.8, y: 0, domain: 'data', medium: 'ethernet', direction: 'passive'")
content = content.replace("id: 'ETH', x: 0.5, y: 1, domain: 'data', direction: 'passive'", "id: 'ETH', x: 0.5, y: 1, domain: 'data', medium: 'ethernet', direction: 'passive'")

with open('src/symbols/registry/automation.ts', 'w') as f:
    f.write(content)
