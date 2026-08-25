import re

with open('src/project/ConnectionService.ts', 'r') as f:
    service_content = f.read()

# Make sure unknown medium is actively rejected
if "import { getMediaDefinition" not in service_content:
    service_content = service_content.replace("import { getSymbolDefinition } from '../symbols/SymbolRegistry';", "import { getSymbolDefinition } from '../symbols/SymbolRegistry';\nimport { getMediaDefinition } from '../symbols/registry/MediaRegistry';")

    new_validation = """
    // Media and Domain compatibility
    if (fromPort.domain !== toPort.domain) {
      return { valid: false, code: "DOMAIN_MISMATCH", message: `Cannot connect ${fromPort.domain} to ${toPort.domain}` };
    }

    if (fromPort.medium && toPort.medium && fromPort.medium !== toPort.medium) {
      return { valid: false, code: "MEDIUM_MISMATCH", message: `Cannot connect ${fromPort.medium} to ${toPort.medium}` };
    }

    // Infer connection type
    let inferredType = 'electrical_ac';
    if (fromPort.medium) inferredType = fromPort.medium;
    else if (toPort.medium) inferredType = toPort.medium;
    else if (fromPort.domain === 'water') inferredType = 'water';
    else if (fromPort.domain === 'hvac') inferredType = 'hvac_air';
    else if (fromPort.domain === 'data' || fromPort.domain === 'control') inferredType = 'data'; // fallback

    if (!getMediaDefinition(inferredType) && inferredType !== 'data') {
        return { valid: false, code: "UNKNOWN_MEDIUM", message: `Medium ${inferredType} is unknown or unsupported.` };
    }
"""
    service_content = re.sub(r'// Media and Domain compatibility.*?return \{ valid: true, inferredType \};', new_validation.strip() + "\n\n    return { valid: true, inferredType };", service_content, flags=re.DOTALL)

    with open('src/project/ConnectionService.ts', 'w') as f:
        f.write(service_content)
