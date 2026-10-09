/* ==========================================================================
   Adam Pollack | PPSC | Workmap - Main Application Logic (app.js)
   ========================================================================== */

const PALETTE_15 = [
  { key: 'red', name: 'Red', hex: '#ef4444', dotClass: 'bg-red-500' },
  { key: 'orange', name: 'Orange', hex: '#f97316', dotClass: 'bg-orange-500' },
  { key: 'amber', name: 'Amber', hex: '#f59e0b', dotClass: 'bg-amber-500' },
  { key: 'yellow', name: 'Yellow', hex: '#eab308', dotClass: 'bg-yellow-500' },
  { key: 'lime', name: 'Lime', hex: '#84cc16', dotClass: 'bg-lime-500' },
  { key: 'green', name: 'Green', hex: '#22c55e', dotClass: 'bg-green-500' },
  { key: 'emerald', name: 'Emerald', hex: '#10b981', dotClass: 'bg-emerald-500' },
  { key: 'teal', name: 'Teal', hex: '#14b8a6', dotClass: 'bg-teal-500' },
  { key: 'cyan', name: 'Cyan', hex: '#06b6d4', dotClass: 'bg-cyan-500' },
  { key: 'blue', name: 'Blue', hex: '#3b82f6', dotClass: 'bg-blue-500' },
  { key: 'indigo', name: 'Indigo', hex: '#6366f1', dotClass: 'bg-indigo-500' },
  { key: 'violet', name: 'Violet', hex: '#8b5cf6', dotClass: 'bg-violet-500' },
  { key: 'purple', name: 'Purple', hex: '#a855f7', dotClass: 'bg-purple-500' },
  { key: 'pink', name: 'Pink', hex: '#ec4899', dotClass: 'bg-pink-500' },
  { key: 'gray', name: 'Gray', hex: '#64748b', dotClass: 'bg-slate-500' }
];

const COLOR_HEX_MAP = PALETTE_15.reduce((acc, c) => {
  acc[c.key] = c.hex;
  return acc;
}, {});

const SHAPES_8 = [
  { key: 'pill', name: 'Pill', icon: 'fa-capsules' },
  { key: 'rect', name: 'Rect', icon: 'fa-square' },
  { key: 'square', name: 'Square', icon: 'fa-stop' },
  { key: 'roundrect', name: 'Round', icon: 'fa-square-full' },
  { key: 'circle', name: 'Circle', icon: 'fa-circle' },
  { key: 'diamond', name: 'Diamond', icon: 'fa-gem' },
  { key: 'hexagon', name: 'Hexagon', icon: 'fa-cube' },
  { key: 'triangle', name: 'Triangle', icon: 'fa-play fa-rotate-270' }
];

const USER_AVATAR_MAP = {
  "mrnrYxtNwuV8vgru9Gr2KkJ1HzI2": "adam.jpeg",
  "b0Ji8It6eQOt0G3pvyvqrpWUF1m2": "taylor.jpg"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();
const auth = firebase.auth();
window.boardRef = db.ref("mindmap/board");

const LOCAL_STORAGE_KEY = 'mindmap_whiteboard_state_v3';
const THEME_STORAGE_KEY = 'mindmap_whiteboard_theme';

const defaultNodes = [
  { id: "adam", label: "Adam\nPollack", x: 420, y: 460, color: "gray", shape: "pill", isHub: true },
  { id: "product", label: "Product\nTeam", x: 800, y: 220, color: "gray", shape: "pill" },
  { id: "shawn", label: "Shawn", x: 720, y: 110, color: "red", shape: "pill" },
  { id: "albert", label: "Albert", x: 890, y: 110, color: "red", shape: "pill" },
  { id: "grant", label: "Grant", x: 730, y: 320, color: "red", shape: "pill" },
  { id: "jon", label: "Jon", x: 885, y: 290, color: "red", shape: "pill" },
  { id: "se", label: "Sales\nEngineers", x: 380, y: 240, color: "gray", shape: "pill" },
  { id: "demo_shadows", label: "Demo\nShadows", x: 340, y: 110, color: "green", shape: "pill" },
  { id: "se_config", label: "Config", x: 500, y: 145, color: "green", shape: "pill" },
  { id: "ensogo", label: "ensogo\ntraining", x: 550, y: 265, color: "green", shape: "pill" },
  { id: "demo_prep", label: "Demo\nPrep", x: 215, y: 315, color: "green", shape: "pill" },
  { id: "profiles", label: "Profiles", x: 215, y: 220, color: "green", shape: "pill" },
  { id: "flex", label: "Flex", x: 740, y: 520, color: "gray", shape: "pill" },
  { id: "templates", label: "Templates", x: 730, y: 420, color: "blue", shape: "pill" },
  { id: "flex_config", label: "Config", x: 870, y: 460, color: "blue", shape: "pill" },
  { id: "learning", label: "Learning", x: 870, y: 560, color: "blue", shape: "pill" },
  { id: "demo_excl", label: "Demo!", x: 700, y: 610, color: "blue", shape: "pill" },
  { id: "rfp", label: "RFP", x: 350, y: 730, color: "purple", shape: "pill" },
  { id: "kb", label: "knowledge\nbase", x: 495, y: 730, color: "purple", shape: "pill" },
  { id: "process", label: "Process", x: 410, y: 825, color: "purple", shape: "pill" },
  { id: "inventive", label: "Inventive", x: 240, y: 800, color: "purple", shape: "pill" }
];

const defaultEdges = [
  { id: "e1", source: "adam", target: "se" },
  { id: "e2", source: "adam", target: "product" },
  { id: "e3", source: "adam", target: "flex" },
  { id: "e4", source: "adam", target: "rfp" },
  { id: "e5", source: "product", target: "shawn" },
  { id: "e6", source: "product", target: "albert" },
  { id: "e7", source: "product", target: "grant" },
  { id: "e8", source: "product", target: "jon" },
  { id: "e9", source: "se", target: "demo_shadows" },
  { id: "e10", source: "se", target: "se_config" },
  { id: "e11", source: "se", target: "ensogo" },
  { id: "e12", source: "se", target: "demo_prep" },
  { id: "e13", source: "se", target: "profiles" },
  { id: "e14", source: "flex", target: "templates" },
  { id: "e15", source: "flex", target: "flex_config" },
  { id: "e16", source: "flex", target: "learning" },
  { id: "e17", source: "flex", target: "demo_excl" },
  { id: "e18", source: "rfp", target: "kb" },
  { id: "e19", source: "rfp", target: "process" },
  { id: "e20", source: "rfp", target: "inventive" }
];

function loadInitialState() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
        return {
          nodes: parsed.nodes.map(n => ({ 
            ...n, 
            x: Number(n.x) || 0, 
            y: Number(n.y) || 0,
            width: Number(n.width) || 0,
            height: Number(n.height) || 0,
            shape: n.shape || 'pill',
            fontSize: n.fontSize || '',
            bgColor: n.bgColor || '',
            textColor: n.textColor || '',
            linkUrl: n.linkUrl || '',
            linkCaption: n.linkCaption || '',
            isBold: !!n.isBold,
            isItalic: !!n.isItalic,
            isUnderline: !!n.isUnderline
          })),
          edges: parsed.edges.map(e => ({
            ...e,
            directed: !!e.directed
          })),
          tasks: Array.isArray(parsed.tasks) ? parsed.tasks.map(t => ({
            ...t,
            completedAt: t.completedAt || '',
            completionNotes: t.completionNotes || ''
          })) : [],
          view: parsed.view || { x: 0, y: 0, zoom: 1 },
          lastModified: parsed.lastModified || 0
        };
      }
    }
  } catch (e) {
    console.error("Local state parsing error:", e);
  }
  return {
    nodes: JSON.parse(JSON.stringify(defaultNodes)),
    edges: JSON.parse(JSON.stringify(defaultEdges)),
    tasks: [],
    view: { x: 0, y: 0, zoom: 1 },
    lastModified: 0
  };
}

const initial = loadInitialState();

const state = {
  nodes: initial.nodes,
  edges: initial.edges,
  tasks: initial.tasks,
  selectedNodeIds: new Set(),
  selectedEdgeId: null,
  mode: 'pan',
  connectSourceId: null,
  view: initial.view,
  lastModified: initial.lastModified,
  isPanning: false,
  panStart: { x: 0, y: 0 },
  isMarquee: false,
  marqueeStart: { x: 0, y: 0 },
  isDraggingGroup: false,
  dragStartWorld: { x: 0, y: 0 },
  nodeInitialPositions: new Map(),
  selectedModalColor: 'red',
  selectedModalShape: 'pill',
  selectedModalFontSize: '',
  selectedModalBgColor: '',
  selectedModalTextColor: '',
  selectedModalBold: false,
  selectedModalItalic: false,
  selectedModalUnderline: false,
  selectedTaskNodeId: null,
  activeEditingTaskId: null,
  editingNodeId: null,
  inventoryEditingNodeId: null,
  currentPage: 'canvas',
  calendarDate: new Date(),
  modalParentNodeId: null,
  contextClickPos: null,
  clusterColorTargetRootId: null,
  theme: localStorage.getItem(THEME_STORAGE_KEY) || 'light',
  inventorySortColumn: 'label',
  inventorySortDirection: 'asc',
  taskSortColumn: 'date',
  taskSortDirection: 'asc',
  hideCompletedTasks: false
};

const historyStack = [];
const redoStack = [];
const MAX_HISTORY = 10;

function pushHistory() {
  const snapshot = JSON.stringify({
    nodes: state.nodes,
    edges: state.edges,
    tasks: state.tasks
  });
  if (historyStack.length > 0 && historyStack[historyStack.length - 1] === snapshot) {
    return;
  }
  historyStack.push(snapshot);
  if (historyStack.length > MAX_HISTORY) {
    historyStack.shift();
  }
  redoStack.length = 0;
  updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
  const undoBtn = document.getElementById('btn-undo');
  const redoBtn = document.getElementById('btn-redo');
  if (undoBtn) undoBtn.disabled = historyStack.length === 0;
  if (redoBtn) redoBtn.disabled = redoStack.length === 0;
}

function performUndo() {
  if (historyStack.length === 0) return;
  const currentSnapshot = JSON.stringify({
    nodes: state.nodes,
    edges: state.edges,
    tasks: state.tasks
  });
  redoStack.push(currentSnapshot);
  const prevSnapshot = historyStack.pop();
  const parsed = JSON.parse(prevSnapshot);

  state.nodes = parsed.nodes;
  state.edges = parsed.edges;
  state.tasks = parsed.tasks || [];
  state.selectedNodeIds.clear();
  state.selectedEdgeId = null;

  commitState(true, true);
  renderBoard();
  if (state.currentPage === 'hierarchy') renderHierarchyTree();
  if (state.currentPage === 'inventory') renderInventoryList();
  if (state.currentPage === 'tasks') renderTasksList();
  if (state.currentPage === 'calendar') renderCalendarView();
  updateUndoRedoButtons();
  showToast("Undone");
}

function performRedo() {
  if (redoStack.length === 0) return;
  const currentSnapshot = JSON.stringify({
    nodes: state.nodes,
    edges: state.edges,
    tasks: state.tasks
  });
  historyStack.push(currentSnapshot);
  if (historyStack.length > MAX_HISTORY) {
    historyStack.shift();
  }
  const nextSnapshot = redoStack.pop();
  const parsed = JSON.parse(nextSnapshot);

  state.nodes = parsed.nodes;
  state.edges = parsed.edges;
  state.tasks = parsed.tasks || [];
  state.selectedNodeIds.clear();
  state.selectedEdgeId = null;

  commitState(true, true);
  renderBoard();
  if (state.currentPage === 'hierarchy') renderHierarchyTree();
  if (state.currentPage === 'inventory') renderInventoryList();
  if (state.currentPage === 'tasks') renderTasksList();
  if (state.currentPage === 'calendar') renderCalendarView();
  updateUndoRedoButtons();
  showToast("Redone");
}

let isIncomingSync = false;
let toastTimeout;

function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.innerText = msg;
  toast.classList.remove('opacity-0');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.add('opacity-0');
  }, 2200);
}

let splashDismissed = false;
function hideSplashScreen() {
  if (splashDismissed) return;
  splashDismissed = true;
  const splash = document.getElementById('splash-screen');
  if (splash) {
    setTimeout(() => {
      splash.classList.add('fade-out');
    }, 350);
  }
}

function renderFormattedLabel(rawText) {
  if (!rawText) return '';
  let cleanText = rawText
    .replace(/<span style="font-size:\s*[^;]+;">(.*?)<\/span>/gi, '$1')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/<\/?u>/g, '');

  return cleanText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, '<br/>');
}

function cleanClusterLabel(rawText) {
  if (!rawText) return '';
  return rawText
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/<\/?u>/g, '')
    .replace(/<span style="font-size: [^"]+;">/g, '')
    .replace(/<\/span>/g, '')
    .replace(/\n/g, ' ')
    .trim();
}

function getLocalDateTimeString(d = new Date()) {
  const pad = num => String(num).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function applyTheme(themeName) {
  state.theme = themeName;
  localStorage.setItem(THEME_STORAGE_KEY, themeName);

  document.body.classList.remove('theme-light', 'theme-dark', 'theme-black');
  document.body.classList.add(`theme-${themeName}`);

  const themeIcon = document.getElementById('theme-toggle-icon');
  const themeText = document.getElementById('theme-toggle-text');
  const hierThemeIcon = document.getElementById('hierarchy-theme-toggle-icon');
  const hierThemeText = document.getElementById('hierarchy-theme-toggle-text');

  if (themeName === 'light') {
    if (themeIcon) themeIcon.className = "fa-solid fa-sun text-amber-500 text-sm";
    if (themeText) themeText.textContent = "Light";
    if (hierThemeIcon) hierThemeIcon.className = "fa-solid fa-sun text-amber-500 text-sm";
    if (hierThemeText) hierThemeText.textContent = "Light";
  } else if (themeName === 'dark') {
    if (themeIcon) themeIcon.className = "fa-solid fa-moon text-indigo-400 text-sm";
    if (themeText) themeText.textContent = "Dark";
    if (hierThemeIcon) hierThemeIcon.className = "fa-solid fa-moon text-indigo-400 text-sm";
    if (hierThemeText) hierThemeText.textContent = "Dark";
  } else if (themeName === 'black') {
    if (themeIcon) themeIcon.className = "fa-solid fa-circle text-slate-400 text-sm";
    if (themeText) themeText.textContent = "Black";
    if (hierThemeIcon) hierThemeIcon.className = "fa-solid fa-circle text-slate-400 text-sm";
    if (hierThemeText) hierThemeText.textContent = "Black";
  }

  if (state.currentPage === 'hierarchy') {
    renderHierarchyTree();
  }
  if (state.currentPage === 'inventory') {
    renderInventoryList();
  }
  if (state.currentPage === 'tasks') {
    renderTasksList();
  }
  if (state.currentPage === 'calendar') {
    renderCalendarView();
  }
  populateParentDropdown(state.modalParentNodeId);
  populateTaskNodeDropdown(state.selectedTaskNodeId);
  renderModalColorChoices();
  renderModalBgColorChoices();
  renderModalTextColorChoices();
  renderModalShapeChoices();
  renderColorPickers();
  renderBgColorPickers();
  renderTextColorPickers();
  renderShapePickers();
}

function cycleTheme() {
  if (state.theme === 'light') {
    applyTheme('dark');
    showToast("Switched to Dark Theme");
  } else if (state.theme === 'dark') {
    applyTheme('black');
    showToast("Switched to Absolute Black");
  } else {
    applyTheme('light');
    showToast("Switched to Light Theme");
  }
}

function formatTime(timestamp) {
  const d = timestamp ? new Date(timestamp) : new Date();
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
}

function setSaveStatus(status, timestamp = null) {
  const saveStatusDot = document.getElementById('save-status-dot');
  const saveStatusText = document.getElementById('save-status-text');
  if (!saveStatusDot || !saveStatusText) return;

  if (status === 'saving') {
    saveStatusDot.className = "w-2 h-2 rounded-full bg-amber-500 animate-pulse";
    saveStatusText.textContent = "Syncing...";
  } else if (status === 'synced') {
    saveStatusDot.className = "w-2 h-2 rounded-full bg-emerald-500";
    const timeStr = formatTime(timestamp || state.lastModified);
    saveStatusText.textContent = `Synced ${timeStr}`;
  } else if (status === 'offline') {
    saveStatusDot.className = "w-2 h-2 rounded-full bg-slate-400";
    saveStatusText.textContent = "Offline";
  } else if (status === 'error') {
    saveStatusDot.className = "w-2 h-2 rounded-full bg-rose-500";
    saveStatusText.textContent = "Sync Error";
  }
}

function commitState(immediateCloud = true, skipHistoryPush = false) {
  if (!skipHistoryPush) {
    pushHistory();
  }

  const now = Date.now();
  state.lastModified = now;

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
      nodes: state.nodes,
      edges: state.edges,
      tasks: state.tasks,
      view: state.view,
      lastModified: now
    }));
  } catch (e) {
    console.error("Failed to write to localStorage:", e);
  }

  setSaveStatus('saving');

  if (window.boardRef && !isIncomingSync && auth.currentUser) {
    window.boardRef.set({
      nodes: state.nodes,
      edges: state.edges,
      tasks: state.tasks,
      lastModified: now
    }).then(() => {
      setSaveStatus('synced', now);
    }).catch(err => {
      console.error("Firebase write error:", err);
      setSaveStatus('error');
    });
  } else {
    setTimeout(() => setSaveStatus('synced', now), 100);
  }

  updateClusterCounts();
  if (state.currentPage === 'hierarchy') renderHierarchyTree();
  if (state.currentPage === 'inventory') renderInventoryList();
  if (state.currentPage === 'tasks') renderTasksList();
  if (state.currentPage === 'calendar') renderCalendarView();
}

function applyTransform() {
  const worldLayerEl = document.getElementById('world-layer');
  const zoomTextEl = document.getElementById('zoom-level-text');
  if (!worldLayerEl || !zoomTextEl) return;
  worldLayerEl.style.transform = `translate(${state.view.x}px, ${state.view.y}px) scale(${state.view.zoom})`;
  zoomTextEl.textContent = `${Math.round(state.view.zoom * 100)}%`;
}

function screenToWorld(screenX, screenY) {
  const viewportEl = document.getElementById('board-viewport');
  if (!viewportEl) return { x: 0, y: 0 };
  const rect = viewportEl.getBoundingClientRect();
  return {
    x: (screenX - rect.left - state.view.x) / state.view.zoom,
    y: (screenY - rect.top - state.view.y) / state.view.zoom
  };
}

function worldToScreen(worldX, worldY) {
  const viewportEl = document.getElementById('board-viewport');
  if (!viewportEl) return { x: 0, y: 0 };
  const rect = viewportEl.getBoundingClientRect();
  return {
    x: (worldX * state.view.zoom) + state.view.x + rect.left,
    y: (worldY * state.view.zoom) + state.view.y + rect.top
  };
}

function createCurvedPath(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  const curvature = Math.min(30, dist * 0.12);
  const nx = -dy / (dist || 1);
  const ny = dx / (dist || 1);
  const cx = (x1 + x2) / 2 + nx * curvature;
  const cy = (y1 + y2) / 2 + ny * curvature;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}

function openInlineEditor(nodeId) {
  const node = state.nodes.find(n => n.id === nodeId);
  const inlineEditorEl = document.getElementById('node-inline-editor');
  const inlineTextareaEl = document.getElementById('node-inline-textarea');
  const selectInlineFontsize = document.getElementById('select-inline-fontsize');
  const inlineUrlEl = document.getElementById('node-inline-url');
  const inlineCaptionEl = document.getElementById('node-inline-caption');
  const btnInlineBold = document.getElementById('btn-inline-bold');
  const btnInlineItalic = document.getElementById('btn-inline-italic');
  const btnInlineUnderline = document.getElementById('btn-inline-underline');

  if (!node || !inlineEditorEl || !inlineTextareaEl) return;

  state.editingNodeId = nodeId;
  inlineTextareaEl.value = renderFormattedLabel(node.label);
  if (selectInlineFontsize) {
    selectInlineFontsize.value = node.fontSize || '';
  }
  if (inlineUrlEl) {
    inlineUrlEl.value = node.linkUrl || '';
  }
  if (inlineCaptionEl) {
    inlineCaptionEl.value = node.linkCaption || '';
  }

  if (btnInlineBold) btnInlineBold.classList.toggle('bg-indigo-600', !!node.isBold);
  if (btnInlineBold) btnInlineBold.classList.toggle('text-white', !!node.isBold);
  if (btnInlineItalic) btnInlineItalic.classList.toggle('bg-indigo-600', !!node.isItalic);
  if (btnInlineItalic) btnInlineItalic.classList.toggle('text-white', !!node.isItalic);
  if (btnInlineUnderline) btnInlineUnderline.classList.toggle('bg-indigo-600', !!node.isUnderline);
  if (btnInlineUnderline) btnInlineUnderline.classList.toggle('text-white', !!node.isUnderline);

  const screenPos = worldToScreen(node.x, node.y);
  
  inlineEditorEl.style.display = 'flex';
  inlineEditorEl.style.transform = 'none';
  inlineEditorEl.style.position = 'absolute';

  const boxWidth = 310;
  const boxHeight = 450;
  let leftPos = screenPos.x - (boxWidth / 2);
  let topPos = screenPos.y + 25;

  leftPos = Math.max(20, Math.min(window.innerWidth - boxWidth - 20, leftPos));
  topPos = Math.max(20, Math.min(window.innerHeight - boxHeight - 20, topPos));

  inlineEditorEl.style.left = `${leftPos}px`;
  inlineEditorEl.style.top = `${topPos}px`;

  const hex = COLOR_HEX_MAP[node.color] || '#3b82f6';
  inlineEditorEl.style.boxShadow = `0 18px 40px -6px rgba(0, 0, 0, 0.35), 0 0 0 2px ${hex}`;

  renderColorPickers();
  renderBgColorPickers();
  renderTextColorPickers();
  renderShapePickers();

  setTimeout(() => {
    inlineTextareaEl.focus();
    inlineTextareaEl.select();
  }, 50);
}

function closeInlineEditor(save = true) {
  const inlineEditorEl = document.getElementById('node-inline-editor');
  const inlineTextareaEl = document.getElementById('node-inline-textarea');
  const inlineUrlEl = document.getElementById('node-inline-url');
  const inlineCaptionEl = document.getElementById('node-inline-caption');
  if (!state.editingNodeId) return;

  if (save && inlineTextareaEl) {
    const node = state.nodes.find(n => n.id === state.editingNodeId);
    if (node) {
      const val = inlineTextareaEl.value.trim();
      const urlVal = inlineUrlEl ? inlineUrlEl.value.trim() : '';
      const captionVal = inlineCaptionEl ? inlineCaptionEl.value.trim() : '';
      if (val && (val !== node.label || urlVal !== node.linkUrl || captionVal !== node.linkCaption)) {
        pushHistory();
        node.label = val;
        node.linkUrl = urlVal;
        node.linkCaption = captionVal;
        commitState(true, true);
      }
    }
  }

  state.editingNodeId = null;
  if (inlineEditorEl) inlineEditorEl.style.display = 'none';
  renderBoard();
}

function renderBoard() {
  const edgesGroupEl = document.getElementById('edges-group');
  const nodesContainerEl = document.getElementById('nodes-container');
  if (!edgesGroupEl || !nodesContainerEl) return;

  edgesGroupEl.innerHTML = '';
  state.edges.forEach(edge => {
    const sourceNode = state.nodes.find(n => n.id === edge.source);
    const targetNode = state.nodes.find(n => n.id === edge.target);
    if (!sourceNode || !targetNode) return;

    const pathData = createCurvedPath(sourceNode.x, sourceNode.y, targetNode.x, targetNode.y);

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");

    const hitPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    hitPath.setAttribute("d", pathData);
    hitPath.setAttribute("class", "edge-hit-area");
    hitPath.dataset.edgeId = edge.id;

    const visualPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    visualPath.setAttribute("d", pathData);
    let edgeClass = `edge-line ${state.selectedEdgeId === edge.id ? 'selected' : ''}`;
    if (edge.directed) edgeClass += ' directed';
    visualPath.setAttribute("class", edgeClass);
    visualPath.dataset.edgeId = edge.id;

    const onEdgeClick = (e) => {
      e.stopPropagation();
      deleteEdge(edge.id);
    };

    hitPath.addEventListener("click", onEdgeClick);
    visualPath.addEventListener("click", onEdgeClick);

    g.appendChild(hitPath);
    g.appendChild(visualPath);
    edgesGroupEl.appendChild(g);
  });

  nodesContainerEl.innerHTML = '';
  state.nodes.forEach(nodeData => {
    const nodeEl = document.createElement('div');
    nodeEl.id = `node-${nodeData.id}`;
    const shape = nodeData.shape || 'pill';
    nodeEl.className = `node node-${nodeData.color} node-shape-${shape} ${nodeData.isHub ? 'node-hub' : ''}`;
    
    const isDark = state.theme === 'dark' || state.theme === 'black';
    const isPolygon = shape === 'diamond' || shape === 'hexagon' || shape === 'triangle';

    if (nodeData.bgColor && COLOR_HEX_MAP[nodeData.bgColor]) {
      const bgHex = COLOR_HEX_MAP[nodeData.bgColor];
      if (!isPolygon) {
        nodeEl.style.setProperty('--node-bg', isDark ? `${bgHex}FA` : `${bgHex}FA`);
      } else {
        nodeEl.style.removeProperty('--node-bg');
      }
    } else {
      nodeEl.style.removeProperty('--node-bg');
    }

    if (isPolygon) {
      const polyBg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      polyBg.setAttribute("class", "node-polygon-bg");
      polyBg.setAttribute("viewBox", "0 0 100 100");
      polyBg.setAttribute("preserveAspectRatio", "none");
      const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      if (shape === 'diamond') {
        poly.setAttribute("points", "50,2 98,50 50,98 2,50");
      } else if (shape === 'hexagon') {
        poly.setAttribute("points", "25,2 75,2 98,50 75,98 25,98 2,50");
      } else if (shape === 'triangle') {
        poly.setAttribute("points", "50,2 98,98 2,98");
      }
      if (nodeData.bgColor && COLOR_HEX_MAP[nodeData.bgColor]) {
        const bgHex = COLOR_HEX_MAP[nodeData.bgColor];
        poly.style.fill = isDark ? `${bgHex}FA` : `${bgHex}FA`;
      } else {
        poly.style.fill = '';
      }
      polyBg.appendChild(poly);
      nodeEl.appendChild(polyBg);
    }

    const contentSpan = document.createElement('div');
    contentSpan.style.zIndex = '2';
    if (nodeData.fontSize) {
      contentSpan.style.fontSize = nodeData.fontSize;
    }
    if (nodeData.isBold) contentSpan.style.fontWeight = 'bold';
    if (nodeData.isItalic) contentSpan.style.fontStyle = 'italic';
    if (nodeData.isUnderline) contentSpan.style.textDecoration = 'underline';

    if (nodeData.textColor === 'black') {
      contentSpan.style.color = '#000000';
    } else if (nodeData.textColor === 'white') {
      contentSpan.style.color = '#ffffff';
    }

    if (nodeData.linkUrl) {
      const displayLabel = nodeData.linkCaption ? renderFormattedLabel(nodeData.linkCaption) : renderFormattedLabel(nodeData.label);
      contentSpan.innerHTML = `<a href="${nodeData.linkUrl}" target="_blank" rel="noopener noreferrer" class="underline hover:opacity-80 flex items-center gap-1">${displayLabel} <i class="fa-solid fa-external-link-alt text-[9px]"></i></a>`;
    } else {
      contentSpan.innerHTML = renderFormattedLabel(nodeData.label);
    }
    nodeEl.appendChild(contentSpan);

    nodeEl.style.left = `${nodeData.x}px`;
    nodeEl.style.top = `${nodeData.y}px`;

    if (nodeData.width) nodeEl.style.width = `${nodeData.width}px`;
    if (nodeData.height) nodeEl.style.height = `${nodeData.height}px`;

    if (state.selectedNodeIds.has(nodeData.id)) {
      nodeEl.classList.add('selected');
    }
    if (state.connectSourceId === nodeData.id) {
      nodeEl.classList.add('connect-source');
    }

    const editBtn = document.createElement('button');
    editBtn.className = 'node-action-btn btn-edit-node';
    editBtn.title = 'Edit node properties';
    editBtn.innerHTML = '<i class="fa-solid fa-pencil"></i>';
    ['mousedown', 'touchstart'].forEach(evt => editBtn.addEventListener(evt, (e) => e.stopPropagation()));
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openInlineEditor(nodeData.id);
    });
    nodeEl.appendChild(editBtn);

    const taskBtn = document.createElement('button');
    taskBtn.className = 'node-action-btn btn-task-node-quick';
    taskBtn.title = 'Add Task for Node';
    taskBtn.innerHTML = '<i class="fa-solid fa-plus"></i>';
    ['mousedown', 'touchstart'].forEach(evt => taskBtn.addEventListener(evt, (e) => e.stopPropagation()));
    taskBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openTaskModal(nodeData.id);
    });
    nodeEl.appendChild(taskBtn);

    const delBtn = document.createElement('button');
    delBtn.className = 'node-action-btn btn-delete-node-quick';
    delBtn.title = 'Delete node';
    delBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    ['mousedown', 'touchstart'].forEach(evt => delBtn.addEventListener(evt, (e) => e.stopPropagation()));
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteNode(nodeData.id);
    });
    nodeEl.appendChild(delBtn);

    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'node-resize-handle';
    resizeHandle.title = 'Resize node';
    resizeHandle.innerHTML = '<i class="fa-solid fa-expand-alt"></i>';
    setupResizeEvents(resizeHandle, nodeData, nodeEl);
    nodeEl.appendChild(resizeHandle);

    setupNodeEvents(nodeEl, nodeData);
    nodesContainerEl.appendChild(nodeEl);
  });

  updateClusterCounts();
}

function updateEdgeCoordinates() {
  const edgesGroupEl = document.getElementById('edges-group');
  if (!edgesGroupEl) return;
  const edgePaths = edgesGroupEl.querySelectorAll('path.edge-line');
  const hitPaths = edgesGroupEl.querySelectorAll('path.edge-hit-area');

  state.edges.forEach((edge, idx) => {
    const sourceNode = state.nodes.find(n => n.id === edge.source);
    const targetNode = state.nodes.find(n => n.id === edge.target);
    if (!sourceNode || !targetNode) return;

    const d = createCurvedPath(sourceNode.x, sourceNode.y, targetNode.x, targetNode.y);
    if (edgePaths[idx]) edgePaths[idx].setAttribute("d", d);
    if (hitPaths[idx]) hitPaths[idx].setAttribute("d", d);
  });
}

function updateSelectionVisuals() {
  state.nodes.forEach(n => {
    const el = document.getElementById(`node-${n.id}`);
    if (!el) return;
    el.classList.toggle('selected', state.selectedNodeIds.has(n.id));
    el.classList.toggle('connect-source', state.connectSourceId === n.id);
  });

  const edgesGroupEl = document.getElementById('edges-group');
  if (!edgesGroupEl) return;
  const edgeElements = edgesGroupEl.querySelectorAll('path.edge-line');
  edgeElements.forEach(line => {
    line.classList.toggle('selected', line.dataset.edgeId === state.selectedEdgeId);
  });
}

function setupResizeEvents(handleEl, nodeData, nodeEl) {
  let isResizing = false;
  let startX = 0;
  let startY = 0;
  let startWidth = 0;
  let startHeight = 0;

  const onPointerDown = (clientX, clientY) => {
    isResizing = true;
    startX = clientX;
    startY = clientY;
    const rect = nodeEl.getBoundingClientRect();
    startWidth = nodeData.width || rect.width;
    startHeight = nodeData.height || rect.height;
    pushHistory();
  };

  const onPointerMove = (clientX, clientY) => {
    if (!isResizing) return;
    const dx = (clientX - startX) / state.view.zoom;
    const dy = (clientY - startY) / state.view.zoom;
    const newWidth = Math.max(90, Math.round(startWidth + dx));
    const newHeight = Math.max(52, Math.round(startHeight + dy));

    nodeData.width = newWidth;
    nodeData.height = newHeight;
    nodeEl.style.width = `${newWidth}px`;
    nodeEl.style.height = `${newHeight}px`;
    updateEdgeCoordinates();
  };

  const onPointerUp = () => {
    if (!isResizing) return;
    isResizing = false;
    commitState(true, true);
  };

  handleEl.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    onPointerDown(e.clientX, e.clientY);

    const onMouseMove = (ev) => onPointerMove(ev.clientX, ev.clientY);
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      onPointerUp();
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  });

  handleEl.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    e.stopPropagation();
    const t = e.touches[0];
    onPointerDown(t.clientX, t.clientY);

    const onTouchMove = (ev) => {
      if (ev.touches.length === 1) {
        ev.preventDefault();
        onPointerMove(ev.touches[0].clientX, ev.touches[0].clientY);
      }
    };
    const onTouchEnd = () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      onPointerUp();
    };

    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
  }, { passive: false });
}

function setupNodeEvents(nodeEl, nodeData) {
  let isMouseDown = false;
  let hasDragged = false;
  let startClientX = 0;
  let startClientY = 0;
  let lastTapTime = 0;
  const DRAG_THRESHOLD = 3;

  const handlePointerDown = (clientX, clientY, isShiftKey) => {
    if (state.editingNodeId && state.editingNodeId !== nodeData.id) {
      closeInlineEditor(true);
    }

    if (state.mode === 'connect' || state.mode === 'connect-directed') {
      handleConnectClick(nodeData.id);
      return false;
    }

    isMouseDown = true;
    hasDragged = false;
    startClientX = clientX;
    startClientY = clientY;

    if (isShiftKey) {
      state.selectedNodeIds.add(nodeData.id);
    } else if (!state.selectedNodeIds.has(nodeData.id)) {
      state.selectedNodeIds.clear();
      state.selectedNodeIds.add(nodeData.id);
    }
    state.selectedEdgeId = null;
    updateSelectionVisuals();

    const worldMouse = screenToWorld(startClientX, startClientY);
    state.dragStartWorld = { x: worldMouse.x, y: worldMouse.y };

    state.nodeInitialPositions.clear();
    state.selectedNodeIds.forEach(id => {
      const n = state.nodes.find(item => item.id === id);
      if (n) state.nodeInitialPositions.set(id, { x: Number(n.x), y: Number(n.y) });
    });
    return true;
  };

  const handlePointerMove = (clientX, clientY) => {
    if (!isMouseDown) return;

    const dist = Math.hypot(clientX - startClientX, clientY - startClientY);
    if (!hasDragged && dist > DRAG_THRESHOLD) {
      hasDragged = true;
      state.isDraggingGroup = true;
      pushHistory();
    }

    if (hasDragged && state.isDraggingGroup) {
      const currentWorld = screenToWorld(clientX, clientY);
      const dx = currentWorld.x - state.dragStartWorld.x;
      const dy = currentWorld.y - state.dragStartWorld.y;

      state.selectedNodeIds.forEach(id => {
        const initialPos = state.nodeInitialPositions.get(id);
        const n = state.nodes.find(item => item.id === id);
        if (initialPos && n) {
          n.x = Math.round(initialPos.x + dx);
          n.y = Math.round(initialPos.y + dy);
          const el = document.getElementById(`node-${n.id}`);
          if (el) {
            el.style.left = `${n.x}px`;
            el.style.top = `${n.y}px`;
          }
        }
      });

      updateEdgeCoordinates();

      if (state.editingNodeId) {
        const editingNode = state.nodes.find(n => n.id === state.editingNodeId);
        const inlineEditorEl = document.getElementById('node-inline-editor');
        if (editingNode && inlineEditorEl) {
          const screenPos = worldToScreen(editingNode.x, editingNode.y);
          const boxW = inlineEditorEl.offsetWidth || 310;
          const boxH = inlineEditorEl.offsetHeight || 450;
          inlineEditorEl.style.left = `${Math.max(20, Math.min(window.innerWidth - boxW - 20, screenPos.x - (boxW / 2)))}px`;
          inlineEditorEl.style.top = `${Math.max(20, Math.min(window.innerHeight - boxH - 20, screenPos.y + 25))}px`;
        }
      }
    }
  };

  const handlePointerUp = () => {
    if (!isMouseDown) return;
    isMouseDown = false;

    if (hasDragged) {
      state.isDraggingGroup = false;
      commitState(true, true);
    }
  };

  nodeEl.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('.node-action-btn') || e.target.closest('.node-resize-handle') || e.target.closest('a')) return;

    e.stopPropagation();
    const continueDrag = handlePointerDown(e.clientX, e.clientY, e.shiftKey || e.ctrlKey || e.metaKey);
    if (!continueDrag) return;

    const onMouseMove = (ev) => handlePointerMove(ev.clientX, ev.clientY);
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      handlePointerUp();
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  });

  nodeEl.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    e.preventDefault();
    openInlineEditor(nodeData.id);
  });

  nodeEl.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();

    state.selectedNodeIds.clear();
    state.selectedNodeIds.add(nodeData.id);
    state.selectedEdgeId = null;
    updateSelectionVisuals();

    state.contextClickPos = screenToWorld(e.clientX, e.clientY);
    openAddModal(nodeData.id);
  });

  nodeEl.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    if (e.target.closest('.node-action-btn') || e.target.closest('.node-resize-handle') || e.target.closest('a')) return;

    e.stopPropagation();
    const touch = e.touches[0];

    const currentTime = new Date().getTime();
    const tapGap = currentTime - lastTapTime;
    if (tapGap < 300 && tapGap > 0) {
      e.preventDefault();
      openInlineEditor(nodeData.id);
      lastTapTime = 0;
      return;
    }
    lastTapTime = currentTime;

    const continueDrag = handlePointerDown(touch.clientX, touch.clientY, false);
    if (!continueDrag) return;

    const onTouchMove = (ev) => {
      if (ev.touches.length === 1) {
        ev.preventDefault();
        handlePointerMove(ev.touches[0].clientX, ev.touches[0].clientY);
      }
    };

    const onTouchEnd = () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      handlePointerUp();
    };

    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
  }, { passive: false });
}

function handleConnectClick(nodeId) {
  if (!state.connectSourceId) {
    state.connectSourceId = nodeId;
    updateSelectionVisuals();
    showToast(state.mode === 'connect-directed' ? "Select target node for dotted flow." : "Select second node to complete link.");
  } else if (state.connectSourceId === nodeId) {
    state.connectSourceId = null;
    updateSelectionVisuals();
  } else {
    const isDirected = (state.mode === 'connect-directed');
    const exists = state.edges.some(e => 
      isDirected 
        ? (e.source === state.connectSourceId && e.target === nodeId && e.directed)
        : ((e.source === state.connectSourceId && e.target === nodeId) || (e.source === nodeId && e.target === state.connectSourceId))
    );

    if (!exists) {
      pushHistory();
      state.edges.push({
        id: "edge_" + Date.now(),
        source: state.connectSourceId,
        target: nodeId,
        directed: isDirected
      });
      commitState(true, true);
      showToast(isDirected ? "Green dotted flow created!" : "Relationship connected!");
    } else {
      showToast("Relationship already exists.");
    }

    state.connectSourceId = null;
    renderBoard();
  }
}

function deleteEdge(edgeId) {
  pushHistory();
  state.edges = state.edges.filter(e => e.id !== edgeId);
  if (state.selectedEdgeId === edgeId) state.selectedEdgeId = null;
  commitState(true, true);
  renderBoard();
  showToast("Relationship removed.");
}

function deleteNode(nodeId) {
  pushHistory();
  state.nodes = state.nodes.filter(n => n.id !== nodeId);
  state.edges = state.edges.filter(e => e.source !== nodeId && e.target !== nodeId);
  state.tasks = state.tasks.filter(t => t.nodeId !== nodeId);
  state.selectedNodeIds.delete(nodeId);
  if (state.editingNodeId === nodeId) {
    closeInlineEditor(false);
  }
  commitState(true, true);
  renderBoard();
  showToast("Node deleted.");
}

function deleteSelected() {
  let changed = false;
  if (state.selectedEdgeId || state.selectedNodeIds.size > 0) {
    pushHistory();
  }
  if (state.selectedEdgeId) {
    state.edges = state.edges.filter(e => e.id !== state.selectedEdgeId);
    state.selectedEdgeId = null;
    changed = true;
  }
  if (state.selectedNodeIds.size > 0) {
    const toDelete = new Set(state.selectedNodeIds);
    state.nodes = state.nodes.filter(n => !toDelete.has(n.id));
    state.edges = state.edges.filter(e => !toDelete.has(e.source) && !toDelete.has(e.target));
    state.tasks = state.tasks.filter(t => !toDelete.has(t.nodeId));
    state.selectedNodeIds.clear();
    changed = true;
  }
  if (changed) {
    commitState(true, true);
    renderBoard();
    showToast("Selected items deleted.");
  } else {
    showToast("Nothing selected to delete.");
  }
}

function selectEntireDiagram() {
  state.selectedNodeIds.clear();
  state.nodes.forEach(n => state.selectedNodeIds.add(n.id));
  state.selectedEdgeId = null;
  updateSelectionVisuals();
  showToast(`Selected all ${state.nodes.length} nodes.`);
}

function centerDiagram() {
  const viewportEl = document.getElementById('board-viewport');
  if (!viewportEl || state.nodes.length === 0) return;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  state.nodes.forEach(n => {
    if (n.x < minX) minX = n.x;
    if (n.x > maxX) maxX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.y > maxY) maxY = n.y;
  });

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  const rect = viewportEl.getBoundingClientRect();
  const w = rect.width || window.innerWidth - 68;
  const h = rect.height || window.innerHeight;
  state.view.x = (w / 2) - centerX * state.view.zoom;
  state.view.y = (h / 2) - centerY * state.view.zoom;
  applyTransform();
}

function getDetectedClusters() {
  const clusterMap = {};

  state.nodes.forEach(node => {
    const colorKey = node.color || 'gray';
    if (!clusterMap[colorKey]) {
      clusterMap[colorKey] = {
        id: colorKey,
        color: colorKey,
        nodes: []
      };
    }
    clusterMap[colorKey].nodes.push(node);
  });

  return Object.values(clusterMap)
    .filter(cluster => cluster.nodes.length > 0)
    .map(cluster => {
      const colorKey = cluster.color;
      const nodeIdsInCluster = new Set(cluster.nodes.map(n => n.id));
      let clusterName = null;

      if (cluster.nodes.length === 1) {
        clusterName = cleanClusterLabel(cluster.nodes[0].linkCaption || cluster.nodes[0].label);
      } else {
        const internalHub = cluster.nodes.find(n => n.isHub || state.edges.some(e => !e.directed && e.source === n.id && nodeIdsInCluster.has(e.target)));
        if (internalHub) {
          clusterName = cleanClusterLabel(internalHub.linkCaption || internalHub.label);
        }

        if (!clusterName) {
          for (const edge of state.edges) {
            if (!edge.directed && nodeIdsInCluster.has(edge.target) && !nodeIdsInCluster.has(edge.source)) {
              const parentNode = state.nodes.find(n => n.id === edge.source);
              if (parentNode) {
                clusterName = cleanClusterLabel(parentNode.linkCaption || parentNode.label);
                break;
              }
            }
          }
        }
      }

      if (!clusterName) {
        clusterName = cleanClusterLabel(cluster.nodes[0].linkCaption || cluster.nodes[0].label) || colorKey;
      }

      return {
        id: colorKey,
        name: clusterName.toUpperCase(),
        color: colorKey,
        count: cluster.nodes.length,
        nodes: cluster.nodes
      };
    });
}

function selectDynamicCluster(colorKey) {
  const clusterNodes = state.nodes.filter(n => (n.color || 'gray') === colorKey);
  if (clusterNodes.length === 0) return;

  switchPage('canvas');

  state.selectedNodeIds.clear();
  clusterNodes.forEach(n => state.selectedNodeIds.add(n.id));
  state.selectedEdgeId = null;
  updateSelectionVisuals();

  setTimeout(() => {
    const viewportEl = document.getElementById('board-viewport');
    const sidebar = document.getElementById('sidebar');
    const rect = viewportEl ? viewportEl.getBoundingClientRect() : null;
    const isCollapsed = sidebar ? sidebar.classList.contains('collapsed') : false;
    const fallbackWidth = window.innerWidth - (isCollapsed ? 68 : 256);

    const width = (rect && rect.width > 0) ? rect.width : fallbackWidth;
    const height = (rect && rect.height > 0) ? rect.height : window.innerHeight;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    clusterNodes.forEach(n => {
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    });

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const spanX = Math.max(160, maxX - minX + 220);
    const spanY = Math.max(160, maxY - minY + 220);
    const targetZoom = Math.min(1.4, Math.max(0.65, Math.min(width / spanX, height / spanY)));

    state.view.zoom = targetZoom;
    state.view.x = (width / 2) - (centerX * targetZoom);
    state.view.y = (height / 2) - (centerY * targetZoom);
    applyTransform();

    showToast(`Selected ${clusterNodes.length} nodes in ${colorKey} cluster.`);
  }, 50);
}

function focusNodeOnCanvas(nodeId) {
  const node = state.nodes.find(n => n.id === nodeId);
  if (!node) return;

  switchPage('canvas');

  state.selectedNodeIds.clear();
  state.selectedNodeIds.add(nodeId);
  updateSelectionVisuals();

  setTimeout(() => {
    const viewportEl = document.getElementById('board-viewport');
    const sidebar = document.getElementById('sidebar');
    const rect = viewportEl ? viewportEl.getBoundingClientRect() : null;
    const isCollapsed = sidebar ? sidebar.classList.contains('collapsed') : false;
    const fallbackWidth = window.innerWidth - (isCollapsed ? 68 : 256);

    const width = (rect && rect.width > 0) ? rect.width : fallbackWidth;
    const height = (rect && rect.height > 0) ? rect.height : window.innerHeight;

    state.view.zoom = 1.25;
    state.view.x = (width / 2) - (node.x * state.view.zoom);
    state.view.y = (height / 2) - (node.y * state.view.zoom);
    applyTransform();

    showToast(`Focused on ${cleanClusterLabel(node.linkCaption || node.label)}`);
  }, 50);
}

function resetView() {
  state.view.zoom = 1;
  centerDiagram();
  showToast("View centered");
}

function resetToDefaultDiagram() {
  pushHistory();
  state.nodes = JSON.parse(JSON.stringify(defaultNodes));
  state.edges = JSON.parse(JSON.stringify(defaultEdges));
  state.tasks = [];
  state.selectedNodeIds.clear();
  state.selectedEdgeId = null;
  state.connectSourceId = null;
  closeInlineEditor(false);
  commitState(true, true);
  renderBoard();
  resetView();
}

function setAppMode(mode) {
  state.mode = mode;
  state.connectSourceId = null;

  const btnSelectMode = document.getElementById('btn-select-mode');
  const btnConnectMode = document.getElementById('btn-connect-mode');
  const btnConnectDirectedMode = document.getElementById('btn-connect-directed-mode');
  const btnPanMode = document.getElementById('btn-pan-mode');
  const viewportEl = document.getElementById('board-viewport');

  [btnSelectMode, btnConnectMode, btnConnectDirectedMode, btnPanMode].forEach(btn => {
    if (!btn) return;
    btn.classList.remove('bg-indigo-600', 'text-white', 'shadow-sm');
  });

  if (mode === 'select' && btnSelectMode) {
    btnSelectMode.classList.add('bg-indigo-600', 'text-white', 'shadow-sm');
    if (viewportEl) viewportEl.style.cursor = 'default';
  } else if (mode === 'connect' && btnConnectMode) {
    btnConnectMode.classList.add('bg-indigo-600', 'text-white', 'shadow-sm');
    if (viewportEl) viewportEl.style.cursor = 'crosshair';
    showToast("Connect Mode: Tap first node, then second node to connect.");
  } else if (mode === 'connect-directed' && btnConnectDirectedMode) {
    btnConnectDirectedMode.classList.add('bg-indigo-600', 'text-white', 'shadow-sm');
    if (viewportEl) viewportEl.style.cursor = 'crosshair';
    showToast("Dotted Flow Mode: Tap source node, then target node for green dotted line.");
  } else if (mode === 'pan' && btnPanMode) {
    btnPanMode.classList.add('bg-indigo-600', 'text-white', 'shadow-sm');
    if (viewportEl) viewportEl.style.cursor = 'grab';
  }
  updateSelectionVisuals();
}

function exportToPNG() {
  showToast("Generating high-resolution PNG snapshot...", 2500);
  const viewportEl = document.getElementById('board-viewport');
  const svgLayerEl = document.getElementById('svg-layer');
  if (!viewportEl || state.nodes.length === 0) return;

  const prevView = { x: state.view.x, y: state.view.y, zoom: state.view.zoom };
  const prevSelected = new Set(state.selectedNodeIds);

  state.selectedNodeIds.clear();
  state.selectedEdgeId = null;
  updateSelectionVisuals();

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  state.nodes.forEach(n => {
    const pad = 120;
    if (n.x - pad < minX) minX = n.x - pad;
    if (n.x + pad > maxX) maxX = n.x + pad;
    if (n.y - pad < minY) minY = n.y - pad;
    if (n.y + pad > maxY) maxY = n.y + pad;
  });

  const contentWidth = Math.ceil(maxX - minX);
  const contentHeight = Math.ceil(maxY - minY);

  state.view.zoom = 1;
  state.view.x = -minX;
  state.view.y = -minY;
  applyTransform();
  renderBoard();

  if (svgLayerEl) svgLayerEl.style.pointerEvents = 'auto';

  const originalWidth = viewportEl.style.width;
  const originalHeight = viewportEl.style.height;
  viewportEl.style.width = `${contentWidth}px`;
  viewportEl.style.height = `${contentHeight}px`;

  setTimeout(() => {
    html2canvas(viewportEl, {
      scale: 2,
      useCORS: true,
      logging: false,
      width: contentWidth,
      height: contentHeight,
      windowWidth: contentWidth,
      windowHeight: contentHeight,
      backgroundColor: getComputedStyle(viewportEl).backgroundColor || '#fbfbfa'
    }).then(canvas => {
      viewportEl.style.width = originalWidth;
      viewportEl.style.height = originalHeight;
      if (svgLayerEl) svgLayerEl.style.pointerEvents = 'none';

      state.view.x = prevView.x;
      state.view.y = prevView.y;
      state.view.zoom = prevView.zoom;
      state.selectedNodeIds = prevSelected;
      applyTransform();
      renderBoard();

      const link = document.createElement('a');
      link.download = 'Adam_Pollack_PPSC_Workmap.png';
      link.href = canvas.toDataURL('image/png');
      link.click();

      showToast("PNG exported successfully!");
    }).catch(err => {
      console.error("PNG export error:", err);
      viewportEl.style.width = originalWidth;
      viewportEl.style.height = originalHeight;
      if (svgLayerEl) svgLayerEl.style.pointerEvents = 'none';
      state.view.x = prevView.x;
      state.view.y = prevView.y;
      state.view.zoom = prevView.zoom;
      state.selectedNodeIds = prevSelected;
      applyTransform();
      renderBoard();
      showToast("Failed to export PNG.");
    });
  }, 300);
}

function exportHierarchyToPDF() {
  showToast("Generating Hierarchy PDF...", 3000);
  const container = document.getElementById('page-hierarchy');
  if (!container) return;

  const themeToggleBtn = container.querySelector('.fixed.top-4.right-4');
  if (themeToggleBtn) themeToggleBtn.style.display = 'none';

  html2canvas(container, {
    scale: 2,
    useCORS: true,
    backgroundColor: getComputedStyle(container).backgroundColor || '#ffffff'
  }).then(canvas => {
    if (themeToggleBtn) themeToggleBtn.style.display = 'block';

    const imgData = canvas.toDataURL('image/png');
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [canvas.width, canvas.height]
    });

    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save('Adam_Pollack_PPSC_Hierarchy.pdf');
    showToast("Hierarchy PDF exported successfully!");
  }).catch(err => {
    console.error("Hierarchy PDF export error:", err);
    if (themeToggleBtn) themeToggleBtn.style.display = 'block';
    showToast("Failed to export Hierarchy PDF.");
  });
}

function createIsolatedGroup() {
  pushHistory();
  switchPage('canvas');

  const chosenColor = PALETTE_15[Math.floor(Math.random() * PALETTE_15.length)].key;

  let originX = 500;
  let originY = 500;

  if (state.nodes.length > 0) {
    let maxX = -Infinity;
    let avgY = 0;
    state.nodes.forEach(n => {
      if (n.x > maxX) maxX = n.x;
      avgY += n.y;
    });
    avgY = avgY / state.nodes.length;
    originX = Math.round(maxX + 420);
    originY = Math.round(avgY);
  }

  const timestamp = Date.now();
  const baseId = `node_${timestamp}_base`;
  const baseNode = {
    id: baseId,
    label: "New\nHub",
    x: originX,
    y: originY,
    color: "gray",
    shape: "pill",
    fontSize: '',
    bgColor: '',
    textColor: '',
    linkUrl: '',
    linkCaption: '',
    isBold: false,
    isItalic: false,
    isUnderline: false
  };

  const newNodes = [baseNode];
  const newEdges = [];

  const offsets = [
    { label: "Branch 1", dx: -160, dy: -130 },
    { label: "Branch 2", dx: 160, dy: -130 },
    { label: "Branch 3", dx: -160, dy: 130 },
    { label: "Branch 4", dx: 160, dy: 130 }
  ];

  offsets.forEach((offset, idx) => {
    const childId = `node_${timestamp}_c${idx + 1}`;
    newNodes.push({
      id: childId,
      label: offset.label,
      x: originX + offset.dx,
      y: originY + offset.dy,
      color: chosenColor,
      shape: "pill",
      fontSize: '',
      bgColor: '',
      textColor: '',
      linkUrl: '',
      linkCaption: '',
      isBold: false,
      isItalic: false,
      isUnderline: false
    });
    newEdges.push({
      id: `edge_${timestamp}_e${idx + 1}`,
      source: baseId,
      target: childId
    });
  });

  state.nodes.push(...newNodes);
  state.edges.push(...newEdges);

  state.selectedNodeIds.clear();
  newNodes.forEach(n => state.selectedNodeIds.add(n.id));
  state.selectedEdgeId = null;

  commitState(true, true);
  renderBoard();

  setTimeout(() => {
    const viewportEl = document.getElementById('board-viewport');
    const sidebar = document.getElementById('sidebar');
    const rect = viewportEl ? viewportEl.getBoundingClientRect() : null;
    const isCollapsed = sidebar ? sidebar.classList.contains('collapsed') : false;
    const width = (rect && rect.width > 0) ? rect.width : (window.innerWidth - (isCollapsed ? 68 : 256));
    const height = (rect && rect.height > 0) ? rect.height : window.innerHeight;

    state.view.zoom = 1;
    state.view.x = (width / 2) - (originX * state.view.zoom);
    state.view.y = (height / 2) - (originY * state.view.zoom);
    applyTransform();
    showToast("Created new isolated cluster!");
  }, 50);
}

function getPillMarkup(node, isDark, compact = false) {
  if (!node) return '<span class="opacity-40 italic">Unassigned</span>';
  const hex = COLOR_HEX_MAP[node.color] || '#64748b';
  const hubMarkup = node.isHub ? `<span class="text-[8px] font-bold uppercase tracking-wider text-indigo-500 bg-indigo-500/10 border border-indigo-500/30 px-1 py-0.2 rounded shrink-0">Hub</span>` : '';
  
  const bgHex = node.bgColor && COLOR_HEX_MAP[node.bgColor] ? COLOR_HEX_MAP[node.bgColor] : hex;
  const bg = isDark ? `${bgHex}FA` : `${bgHex}FA`;
  const border = isDark ? `${hex}60` : `${hex}45`;
  const color = node.textColor === 'black' ? '#000000' : (node.textColor === 'white' ? '#ffffff' : (isDark ? '#ffffff' : hex));
  
  const fontStyle = compact ? 'font-size: 10px; line-height: 1.25;' : (node.fontSize ? `font-size: ${node.fontSize};` : '');
  const weightStyle = node.isBold ? `font-weight: bold;` : '';
  const italicStyle = node.isItalic ? `font-style: italic;` : '';
  const underlineStyle = node.isUnderline ? `text-decoration: underline;` : '';

  const sizeClasses = compact 
    ? "px-2.5 py-1 text-[10px] max-w-[220px]" 
    : "px-3 py-1 text-xs max-w-[260px]";

  const roundedClasses = compact ? "rounded-xl" : "rounded-full";

  return `
    <div style="background-color: ${bg}; border-color: ${border}; color: ${color}; ${fontStyle} ${weightStyle} ${italicStyle} ${underlineStyle}" class="${sizeClasses} ${roundedClasses} font-semibold border shadow-xs inline-flex items-center justify-center text-center gap-1 mx-auto w-max">
      <span class="whitespace-normal break-words text-center">${renderFormattedLabel(node.linkCaption || node.label).replace(/<br\s*\/?>/gi, ' ')}</span>
    </div>
    ${hubMarkup}
  `;
}

function getHierarchyPillMarkup(node, isDark) {
  const hex = COLOR_HEX_MAP[node.color] || '#64748b';
  const hubMarkup = node.isHub ? `<span class="text-[9px] font-bold uppercase tracking-wider text-indigo-500 bg-indigo-500/10 border border-indigo-500/30 px-1.5 py-0.2 rounded">Hub</span>` : '';
  
  const bgHex = node.bgColor && COLOR_HEX_MAP[node.bgColor] ? COLOR_HEX_MAP[node.bgColor] : hex;
  const bg = isDark ? `${bgHex}FA` : `${bgHex}FA`;
  const border = isDark ? `${hex}60` : `${hex}45`;
  const color = node.textColor === 'black' ? '#000000' : (node.textColor === 'white' ? '#ffffff' : (isDark ? '#ffffff' : hex));
  const fontStyle = node.fontSize ? `font-size: ${node.fontSize};` : '';
  const weightStyle = node.isBold ? `font-weight: bold;` : '';
  const italicStyle = node.isItalic ? `font-style: italic;` : '';
  const underlineStyle = node.isUnderline ? `text-decoration: underline;` : '';

  const cleanText = cleanClusterLabel(node.linkCaption || node.label);

  return `
    <div style="background-color: ${bg}; border-color: ${border}; color: ${color}; ${fontStyle} ${weightStyle} ${italicStyle} ${underlineStyle}" class="px-3 py-1 text-xs font-semibold rounded-full border shadow-xs inline-flex items-center justify-center text-center gap-1.5 mx-auto w-max max-w-[200px]">
      <span class="truncate">${cleanText}</span>
    </div>
    ${hubMarkup}
  `;
}

function populateParentDropdown(selectedId = null, filterQuery = "") {
  const dropdownItemsContainer = document.getElementById('parent-dropdown-items');
  const dropdownSelected = document.getElementById('parent-dropdown-selected');
  if (!dropdownItemsContainer || !dropdownSelected) return;

  const isDark = state.theme === 'dark' || state.theme === 'black';

  if (selectedId) {
    const found = state.nodes.find(n => n.id === selectedId);
    if (found) {
      dropdownSelected.innerHTML = getPillMarkup(found, isDark);
    } else {
      dropdownSelected.innerHTML = `<span class="opacity-60 font-medium px-2 py-0.5">None (Root Node)</span>`;
    }
  } else {
    dropdownSelected.innerHTML = `<span class="opacity-60 font-medium px-2 py-0.5">None (Root Node)</span>`;
  }

  dropdownItemsContainer.innerHTML = '';
  const query = filterQuery.toLowerCase().trim();

  if (!query || "none root node".includes(query)) {
    const noneOption = document.createElement('div');
    noneOption.className = `modal-dropdown-item p-2 rounded-lg cursor-pointer flex items-center justify-between text-xs transition-colors ${!selectedId ? 'font-semibold' : ''}`;
    noneOption.innerHTML = `<span class="modal-label px-1 font-medium">None (Root Node)</span>`;
    noneOption.addEventListener('click', (e) => {
      e.stopPropagation();
      selectParentOption(null);
    });
    dropdownItemsContainer.appendChild(noneOption);
  }

  const matchingNodes = state.nodes.filter(node => {
    if (!query) return true;
    const normalizedLabel = cleanClusterLabel(node.linkCaption || node.label).toLowerCase();
    return normalizedLabel.includes(query);
  });

  matchingNodes.forEach(node => {
    const opt = document.createElement('div');
    opt.className = `modal-dropdown-item p-1.5 rounded-lg cursor-pointer flex items-center justify-between text-xs transition-colors ${selectedId === node.id ? 'font-semibold' : ''}`;
    opt.innerHTML = `
      <div class="flex items-center justify-center gap-1.5 w-full">
        ${getPillMarkup(node, isDark)}
      </div>
      ${selectedId === node.id ? '<i class="fa-solid fa-check text-indigo-500 text-xs mr-1 shrink-0"></i>' : ''}
    `;
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      selectParentOption(node.id);
    });
    dropdownItemsContainer.appendChild(opt);
  });

  if (matchingNodes.length === 0 && query && !"none root node".includes(query)) {
    const noMatch = document.createElement('div');
    noMatch.className = "p-3 text-center text-xs opacity-50 italic";
    noMatch.textContent = "No matching items found";
    dropdownItemsContainer.appendChild(noMatch);
  }
}

function selectParentOption(nodeId) {
  state.modalParentNodeId = nodeId;
  const dropdownMenu = document.getElementById('parent-dropdown-menu');

  if (nodeId) {
    const parentNode = state.nodes.find(n => n.id === nodeId);
    if (parentNode) {
      state.selectedModalColor = parentNode.color;
      state.selectedModalShape = parentNode.shape || 'pill';
      state.selectedModalFontSize = parentNode.fontSize || '';
      state.selectedModalBgColor = parentNode.bgColor || '';
      state.selectedModalTextColor = parentNode.textColor || '';
      state.selectedModalBold = !!parentNode.isBold;
      state.selectedModalItalic = !!parentNode
