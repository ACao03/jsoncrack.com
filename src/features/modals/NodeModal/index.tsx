import React from "react";
import type { ModalProps } from "@mantine/core";
import { Modal, Stack, Text, ScrollArea, Flex, CloseButton, Button, Textarea } from "@mantine/core";
import { CodeHighlight } from "@mantine/code-highlight";
import type { NodeData } from "../../../types/graph";
import useGraph from "../../editor/views/GraphView/stores/useGraph";
import useJson from "../../../store/useJson";

// Helper: extract actual value from JSON at a given path
const getValueAtPath = (json: any, path?: Array<string | number> | null): any => {
  if (!path || path.length === 0) return json;
  let current = json;
  for (const key of path) {
    if (current == null) return undefined;
    current = current[key];
  }
  return current;
};

// Display the actual JSON value at the node's path (including nested objects)
const getNodeContent = (json: any, nodeData: NodeData | null): string => {
  if (!nodeData) return "{}";
  const value = getValueAtPath(json, nodeData.path);
  try {
    return typeof value === "string" ? value : JSON.stringify(value, null, 2);
  } catch (e) {
    return `${value}`;
  }
};

// return json path in the format $["customer"]
const jsonPathToString = (path?: NodeData["path"]) => {
  if (!path || path.length === 0) return "$";
  const segments = path.map(seg => (typeof seg === "number" ? seg : `"${seg}"`));
  return `$[${segments.join("][")}]`;
};

export const NodeModal = ({ opened, onClose }: ModalProps) => {
  const nodeData = useGraph(state => state.selectedNode);
  const updateNodeValue = useGraph(state => state.updateNodeValue);
  const json = useJson(state => state.json);
  const parsedJson = React.useMemo(() => {
    try {
      return JSON.parse(json);
    } catch {
      return {};
    }
  }, [json]);

  const [editing, setEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(() => getNodeContent(parsedJson, nodeData));

  React.useEffect(() => {
    setEditValue(getNodeContent(parsedJson, nodeData));
    setEditing(false);
  }, [nodeData?.id, parsedJson]);

  const handleSave = () => {
    if (!nodeData) return;

    // Try to parse the edited text as JSON; fallback to string
    let parsed: any = editValue;
    try {
      parsed = JSON.parse(editValue);
    } catch (e) {
      // keep as string
      parsed = editValue;
    }

    // If nodeData.path is undefined or empty, update whole document
    updateNodeValue(nodeData.path, undefined, parsed);
    setEditing(false);
  };

  return (
    <Modal size="auto" opened={opened} onClose={onClose} centered withCloseButton={false}>
      <Stack pb="sm" gap="sm">
        <Stack gap="xs">
          <Flex justify="space-between" align="center">
            <Text fz="xs" fw={500}>
              Content
            </Text>
            <Flex gap="xs" align="center">
              {editing ? (
                <>
                  <Button size="xs" onClick={handleSave} color="green">
                    Save
                  </Button>
                  <Button
                    size="xs"
                    variant="default"
                    onClick={() => {
                      setEditing(false);
                      setEditValue(getNodeContent(parsedJson, nodeData));
                    }}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button size="xs" onClick={() => setEditing(true)}>
                  Edit
                </Button>
              )}
              <CloseButton onClick={onClose} />
            </Flex>
          </Flex>
          <ScrollArea.Autosize mah={250} maw={600}>
            {editing ? (
              <Textarea
                value={editValue}
                onChange={e => setEditValue(e.currentTarget.value)}
                minRows={6}
                maw={600}
                miw={350}
                styles={{ input: { fontFamily: "monospace" } }}
              />
            ) : (
              <CodeHighlight
                code={getNodeContent(parsedJson, nodeData)}
                miw={350}
                maw={600}
                language="json"
                withCopyButton
              />
            )}
          </ScrollArea.Autosize>
        </Stack>
        <Text fz="xs" fw={500}>
          JSON Path
        </Text>
        <ScrollArea.Autosize maw={600}>
          <CodeHighlight
            code={jsonPathToString(nodeData?.path)}
            miw={350}
            mah={250}
            language="json"
            copyLabel="Copy to clipboard"
            copiedLabel="Copied to clipboard"
            withCopyButton
          />
        </ScrollArea.Autosize>
      </Stack>
    </Modal>
  );
};
