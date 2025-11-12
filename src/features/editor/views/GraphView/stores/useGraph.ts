import type { ViewPort } from "react-zoomable-ui/dist/ViewPort";
import type { CanvasDirection } from "reaflow/dist/layout/elkLayout";
import { create } from "zustand";
import { modify, applyEdits } from "jsonc-parser";
import { SUPPORTED_LIMIT } from "../../../../../constants/graph";
import useJson from "../../../../../store/useJson";
import useFile from "../../../../../store/useFile";
import type { EdgeData, NodeData } from "../../../../../types/graph";
import { parser } from "../lib/jsonParser";

export interface Graph {
  viewPort: ViewPort | null;
  direction: CanvasDirection;
  loading: boolean;
  fullscreen: boolean;
  nodes: NodeData[];
  edges: EdgeData[];
  selectedNode: NodeData | null;
  path: string;
  aboveSupportedLimit: boolean;
  editingEnabled?: boolean;
}

const initialStates: Graph = {
  viewPort: null,
  direction: "RIGHT",
  loading: true,
  fullscreen: false,
  nodes: [],
  edges: [],
  selectedNode: null,
  path: "",
  aboveSupportedLimit: false,
  editingEnabled: false,
};

interface GraphActions {
  setGraph: (json?: string, options?: Partial<Graph>[]) => void;
  setLoading: (loading: boolean) => void;
  setDirection: (direction: CanvasDirection) => void;
  setViewPort: (ref: ViewPort) => void;
  setSelectedNode: (nodeData: NodeData) => void;
  /**
   * Update a node's value in the underlying JSON and persist it back to the editor.
   * - path: jsonc-parser style path to the node
   * - key: if provided, the row key to target (for object properties)
   * - newValue: the new value to set (will attempt JSON.parse, otherwise treated as string)
   */
  updateNodeValue: (path: Array<string | number> | undefined, key: string | null | undefined, newValue: any) => void;
  toggleEditing: (value?: boolean) => void;
  focusFirstNode: () => void;
  toggleFullscreen: (value: boolean) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  centerView: () => void;
  clearGraph: () => void;
  setZoomFactor: (zoomFactor: number) => void;
}

const useGraph = create<Graph & GraphActions>((set, get) => ({
  ...initialStates,
  clearGraph: () => set({ nodes: [], edges: [], loading: false }),
  setSelectedNode: nodeData => set({ selectedNode: nodeData }),
  setGraph: (data, options) => {
    const { nodes, edges } = parser(data ?? useJson.getState().json);

    if (nodes.length > SUPPORTED_LIMIT) {
      return set({
        aboveSupportedLimit: true,
        ...options,
        loading: false,
      });
    }

    set({
      nodes,
      edges,
      aboveSupportedLimit: false,
      ...options,
    });
  },
  setDirection: (direction = "RIGHT") => {
    set({ direction });
    setTimeout(() => get().centerView(), 200);
  },
  setLoading: loading => set({ loading }),
  focusFirstNode: () => {
    const rootNode = document.querySelector("g[id$='node-1']");
    get().viewPort?.camera?.centerFitElementIntoView(rootNode as HTMLElement, {
      elementExtraMarginForZoom: 100,
    });
  },
  setZoomFactor: zoomFactor => {
    const viewPort = get().viewPort;
    viewPort?.camera?.recenter(viewPort.centerX, viewPort.centerY, zoomFactor);
  },
  zoomIn: () => {
    const viewPort = get().viewPort;
    viewPort?.camera?.recenter(viewPort.centerX, viewPort.centerY, viewPort.zoomFactor + 0.1);
  },
  zoomOut: () => {
    const viewPort = get().viewPort;
    viewPort?.camera?.recenter(viewPort.centerX, viewPort.centerY, viewPort.zoomFactor - 0.1);
  },
  centerView: () => {
    const viewPort = get().viewPort;
    viewPort?.updateContainerSize();

    const canvas = document.querySelector(".jsoncrack-canvas") as HTMLElement | null;
    if (canvas) {
      viewPort?.camera?.centerFitElementIntoView(canvas);
    }
  },
  toggleFullscreen: fullscreen => set({ fullscreen }),
  setViewPort: viewPort => set({ viewPort }),
  toggleEditing: (value = undefined) => {
    const current = get().editingEnabled;
    if (typeof value === "boolean") set({ editingEnabled: value });
    else set({ editingEnabled: !current });
  },
  updateNodeValue: (path, key, newValue) => {
    try {
      const currentJson = useJson.getState().getJson ? useJson.getState().getJson() : useJson.getState().json;

      // If no path provided, and no key, assume replacing whole document
      const targetPath: Array<string | number> = Array.isArray(path) ? [...path] : [];
      if (typeof key !== "undefined" && key !== null) targetPath.push(key as any);

      // Try parse the new value to preserve types (number, boolean, null, objects)
      let parsedNewValue: any = newValue;
      if (typeof newValue === "string") {
        try {
          parsedNewValue = JSON.parse(newValue);
        } catch (e) {
          // fallback to string
          parsedNewValue = newValue;
        }
      }

      if (targetPath.length === 0) {
        // Replacing whole document
        const final = typeof parsedNewValue === "string" ? parsedNewValue : JSON.stringify(parsedNewValue, null, 2);
        useJson.getState().setJson(final);
        return;
      }

      const edits = modify(currentJson, targetPath as any, parsedNewValue, {
        formattingOptions: { insertSpaces: true, tabSize: 2 },
      });

      const newText = applyEdits(currentJson, edits);
      useJson.getState().setJson(newText);
      // Also update the file store contents so left-hand editor updates
      useFile.getState().setContents({ contents: newText, hasChanges: true, skipUpdate: false });

      // After applying edits, refresh selectedNode to the updated node (if path provided)
      try {
        const { nodes: newNodes } = parser(newText);
        const targetPathStr = JSON.stringify(targetPath);
        const found = newNodes.find(n => JSON.stringify(n.path ?? []) === targetPathStr);
        if (found) set({ selectedNode: found });
        else if (targetPath.length === 0 && newNodes.length > 0) set({ selectedNode: newNodes[0] });
      } catch (e) {
        // ignore parser errors here
      }
    } catch (err) {
      // silently ignore for now; could surface to UI
      // console.error(err);
    }
  },
}));

export default useGraph;
