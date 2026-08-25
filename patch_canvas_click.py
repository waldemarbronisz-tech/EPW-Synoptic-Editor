import re

with open('src/components/Canvas.tsx', 'r') as f:
    content = f.read()

# remove direct store call
content = content.replace("addConnection", "")

# apply tryCreateConnection on click
replacement = """
      if (drawStartPort.objId !== objId) {
        const success = ConnectionService.tryCreateConnection(
          drawStartPort.objId, drawStartPort.portId,
          objId, portId,
          drawingConnectionType
        );
        if (success) {
          useStore.getState().addMessage(`[INFO] Connection created`);
        } else {
          useStore.getState().addMessage(`[WARN] Connection failed (invalid rules)`);
        }
      }
      setDrawStartPort(null);
      setDrawingMode(false);
"""

content = re.sub(
    r'if \(drawStartPort\.objId !== objId\) \{.*?setDrawingMode\(false\);\n',
    replacement.lstrip(),
    content,
    flags=re.DOTALL
)

with open('src/components/Canvas.tsx', 'w') as f:
    f.write(content)
