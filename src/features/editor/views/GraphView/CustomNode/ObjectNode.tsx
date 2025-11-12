import React from "react";
import type { CustomNodeProps } from ".";
import { NODE_DIMENSIONS } from "../../../../../constants/graph";
import type { NodeData } from "../../../../../types/graph";
import { TextRenderer } from "./TextRenderer";
import * as Styled from "./styles";
import useGraph from "../stores/useGraph";

type RowProps = {
  row: NodeData["text"][number];
  x: number;
  y: number;
  index: number;
  nodePath?: NodeData["path"];
};

const Row = ({ row, x, y, index, nodePath }: RowProps) => {
  const rowPosition = index * NODE_DIMENSIONS.ROW_HEIGHT;

  const getRowText = () => {
    if (row.type === "object") return `{${row.childrenCount ?? 0} keys}`;
    if (row.type === "array") return `[${row.childrenCount ?? 0} items]`;
    return row.value;
  };

  const updateNodeValue = useGraph(state => state.updateNodeValue);
  const editingEnabled = useGraph(state => state.editingEnabled);
  const [editing, setEditing] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(() => (row.value == null ? "" : String(row.value)));

  React.useEffect(() => {
    setInputValue(row.value == null ? "" : String(row.value));
  }, [row.value]);

  const isEditable = row.type !== "array" && row.type !== "object" && editingEnabled;

  return (
    <Styled.StyledRow
      $value={row.value}
      data-key={`${row.key}: ${row.value}`}
      data-x={x}
      data-y={y + rowPosition}
      onDoubleClick={() => isEditable && setEditing(true)}
    >
      <Styled.StyledKey $type="object">{row.key}: </Styled.StyledKey>
      {editing ? (
        <div style={{ display: "flex", gap: 6, alignItems: "center", width: "100%" }}>
          <input
            autoFocus
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") {
                updateNodeValue(nodePath, row.key, inputValue);
                setEditing(false);
              }
              if (e.key === "Escape") {
                setEditing(false);
                setInputValue(row.value == null ? "" : String(row.value));
              }
            }}
            style={{ width: "100%", boxSizing: "border-box" }}
          />
          <button
            onClick={() => {
              updateNodeValue(nodePath, row.key, inputValue);
              setEditing(false);
            }}
            aria-label="Save"
          >
            Save
          </button>
          <button
            onClick={() => {
              setEditing(false);
              setInputValue(row.value == null ? "" : String(row.value));
            }}
            aria-label="Cancel"
          >
            Cancel
          </button>
        </div>
      ) : (
        <TextRenderer>{getRowText()}</TextRenderer>
      )}
    </Styled.StyledRow>
  );
};

const Node = ({ node, x, y, selected }: CustomNodeProps) => (
  <Styled.StyledForeignObject
    data-id={`node-${node.id}`}
    width={node.width}
    height={node.height}
    x={0}
    y={0}
    $isObject
  >
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {node.text.map((row, index) => (
        <Row
          key={`${node.id}-${index}`}
          row={row}
          x={x}
          y={y}
          index={index}
          nodePath={node.path}
        />
      ))}

      {/* Edit button intentionally removed from node UI — use Node modal to edit */}
    </div>
  </Styled.StyledForeignObject>
);

function propsAreEqual(prev: CustomNodeProps, next: CustomNodeProps) {
  return (
    JSON.stringify(prev.node.text) === JSON.stringify(next.node.text) &&
    prev.node.width === next.node.width
  );
}

export const ObjectNode = React.memo(Node, propsAreEqual);
