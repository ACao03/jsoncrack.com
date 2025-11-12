import React from "react";
import styled from "styled-components";
import type { CustomNodeProps } from ".";
import useConfig from "../../../../../store/useConfig";
import { isContentImage } from "../lib/utils/calculateNodeSize";
import { TextRenderer } from "./TextRenderer";
import * as Styled from "./styles";
import useGraph from "../stores/useGraph";

const StyledTextNodeWrapper = styled.span<{ $isParent: boolean }>`
  display: flex;
  justify-content: ${({ $isParent }) => ($isParent ? "center" : "flex-start")};
  align-items: center;
  height: 100%;
  width: 100%;
  overflow: hidden;
  padding: 0 10px;
`;

const StyledImageWrapper = styled.div`
  padding: 5px;
`;

const StyledImage = styled.img`
  border-radius: 2px;
  object-fit: contain;
  background: ${({ theme }) => theme.BACKGROUND_MODIFIER_ACCENT};
`;

const Node = ({ node, x, y, selected }: CustomNodeProps) => {
  const { text, width, height } = node;
  const imagePreviewEnabled = useConfig(state => state.imagePreviewEnabled);
  const isImage = imagePreviewEnabled && isContentImage(JSON.stringify(text[0].value));
  const value = text[0].value;
  const updateNodeValue = useGraph(state => state.updateNodeValue);
  const editingEnabled = useGraph(state => state.editingEnabled);

  const [editing, setEditing] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(() => (value == null ? "" : String(value)));

  React.useEffect(() => {
    setInputValue(value == null ? "" : String(value));
  }, [value]);

  return (
    <Styled.StyledForeignObject
      data-id={`node-${node.id}`}
      width={width}
      height={height}
      x={0}
      y={0}
    >
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {isImage ? (
        <StyledImageWrapper>
          <StyledImage src={JSON.stringify(text[0].value)} width="70" height="70" loading="lazy" />
        </StyledImageWrapper>
      ) : (
        <StyledTextNodeWrapper
          data-x={x}
          data-y={y}
          data-key={JSON.stringify(text)}
          $isParent={false}
        >
          <Styled.StyledKey
            $value={value}
            $type={typeof text[0].value}
            onDoubleClick={() => editingEnabled && setEditing(true)}
          >
            {editing ? (
              <div style={{ display: "flex", gap: 6, alignItems: "center", width: "100%" }}>
                <input
                  autoFocus
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      // commit
                      updateNodeValue(node.path, null, inputValue);
                      setEditing(false);
                    }
                    if (e.key === "Escape") {
                      setEditing(false);
                      setInputValue(value == null ? "" : String(value));
                    }
                  }}
                  style={{ width: "100%", boxSizing: "border-box" }}
                />
                <button
                  onClick={() => {
                    updateNodeValue(node.path, null, inputValue);
                    setEditing(false);
                  }}
                  aria-label="Save"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setInputValue(value == null ? "" : String(value));
                  }}
                  aria-label="Cancel"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <TextRenderer>{value}</TextRenderer>
            )}
          </Styled.StyledKey>
        </StyledTextNodeWrapper>
      )}
      {/* Edit button intentionally removed from node UI — use Node modal to edit */}
      </div>
    </Styled.StyledForeignObject>
  );
};

function propsAreEqual(prev: CustomNodeProps, next: CustomNodeProps) {
  return prev.node.text === next.node.text && prev.node.width === next.node.width;
}

export const TextNode = React.memo(Node, propsAreEqual);
