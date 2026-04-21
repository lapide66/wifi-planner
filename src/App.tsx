
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Wifi, 
  Layers, 
  Pencil, 
  Eraser, 
  Undo, 
  Redo, 
  Download, 
  Upload, 
  Info,
  ChevronRight,
  ChevronLeft,
  Settings,
  MousePointer2,
  Trash2,
  Move,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AP_MODELS, 
  MATERIALS, 
  SCALE, 
  PLAN_WIDTH_M, 
  PLAN_HEIGHT_M, 
  Point, 
  Wall, 
  APState, 
  Frequency,
  Material
} from './constants';
import { 
  calculateRSSI, 
  calculateWallAttenuation, 
  getFloorLoss, 
  rssiToColor, 
  rssiToClassification 
} from './utils/math';
import { cn } from './lib/utils';

type Mode = 'heatmap' | 'edit';
type EditSubMode = 'draw' | 'erase';

export default function App() {
  // --- State ---
  const [mode, setMode] = useState<Mode>('heatmap');
  const [editSubMode, setEditSubMode] = useState<EditSubMode>('draw');
  const [currentFloor, setCurrentFloor] = useState<0 | 1>(0);
  const [walls, setWalls] = useState<Wall[]>([]);
  const [ap, setAP] = useState<APState>({
    modelId: 'ex141',
    x: 7.1,
    y: 15,
    floor: 0,
    height: 2.2,
    frequency: '5GHz'
  });
  const [deviceHeight, setDeviceHeight] = useState(1.1);
  const [externalPenalty, setExternalPenalty] = useState(15);
  const [history, setHistory] = useState<Wall[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Design states
  const [drawingPoints, setDrawingPoints] = useState<Point[]>([]);
  const [hoveredWallId, setHoveredWallId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });
  const [selectedMaterialId, setSelectedMaterialId] = useState('brick');
  const [isDraggingAP, setIsDraggingAP] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heatmapRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentAPModel = useMemo(() => 
    AP_MODELS.find(m => m.id === ap.modelId), [ap.modelId]
  );

  // --- History Management ---
  const saveToHistory = useCallback((newWalls: Wall[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...newWalls]);
    if (newHistory.length > 50) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setWalls(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setWalls(history[historyIndex + 1]);
    }
  };

  useEffect(() => {
    // Initial state save
    if (historyIndex === -1) {
      saveToHistory([]);
    }
  }, [saveToHistory, historyIndex]);

  // --- Calculations ---
  const isAPOutside = useMemo(() => {
    return ap.x < 0 || ap.x > PLAN_WIDTH_M || ap.y < 0 || ap.y > PLAN_HEIGHT_M;
  }, [ap.x, ap.y]);

  const getSinalAtPoint = useCallback((px: number, py: number) => {
    if (!currentAPModel) return -100;
    
    const txPower = ap.frequency === '2.4GHz' ? currentAPModel.power24 : currentAPModel.power5;
    
    // Vertical distance
    const floorDiff = Math.abs(ap.floor - currentFloor);
    const hDiff = floorDiff === 0 
      ? Math.abs(ap.height - deviceHeight)
      : (floorDiff * 3) - ap.height + deviceHeight; // Simplified floor height 3m
    
    const dx = px - ap.x;
    const dy = py - ap.y;
    const distance2D = Math.sqrt(dx * dx + dy * dy);
    const distance3D = Math.sqrt(distance2D * distance2D + hDiff * hDiff);
    
    const floorLoss = getFloorLoss(floorDiff, ap.frequency);
    
    // Wall attenuation (ray casting)
    // We only care about walls that are on the floors in between or relevant
    // For simplicity, we check all walls for now or filter by current floor path
    // In multi-floor, signal passes through floors. This is complex for 2D ray casting.
    // ITU-R P.1238 handles floor loss separate from walls.
    const relevantWalls = walls.filter(w => w.floor === currentFloor);
    const wallAtten = calculateWallAttenuation({ x: ap.x, y: ap.y }, { x: px, y: py }, relevantWalls);
    
    const penalty = isAPOutside ? externalPenalty : 0;
    
    return calculateRSSI(txPower, distance3D, wallAtten, floorLoss, penalty, ap.frequency);
  }, [ap, currentAPModel, currentFloor, deviceHeight, externalPenalty, isAPOutside, walls]);

  // --- Rendering ---
  const drawHeatmap = useCallback(() => {
    const canvas = heatmapRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const res = 5; // resolution in pixels
    
    ctx.clearRect(0, 0, width, height);

    if (mode !== 'heatmap') return;

    for (let x = 0; x < width; x += res) {
      for (let y = 0; y < height; y += res) {
        const mx = x / SCALE;
        const my = y / SCALE;
        const rssi = getSinalAtPoint(mx, my);
        ctx.fillStyle = rssiToColor(rssi);
        ctx.globalAlpha = 0.5;
        ctx.fillRect(x, y, res, res);
      }
    }
    ctx.globalAlpha = 1.0;
  }, [mode, getSinalAtPoint]);

  useEffect(() => {
    drawHeatmap();
  }, [drawHeatmap, ap, walls, mode]);

  // --- Interaction Helpers ---
  const getSnapPoint = (px: number, py: number): Point => {
    const mx = px / SCALE;
    const my = py / SCALE;

    // 1. Snap to existing wall ends (0.6m radius)
    const snapRadius = 0.6;
    for (const wall of walls) {
      if (wall.floor !== currentFloor) continue;
      const dStart = Math.sqrt(Math.pow(mx - wall.start.x, 2) + Math.pow(my - wall.start.y, 2));
      if (dStart < snapRadius) return wall.start;
      const dEnd = Math.sqrt(Math.pow(mx - wall.end.x, 2) + Math.pow(my - wall.end.y, 2));
      if (dEnd < snapRadius) return wall.end;
    }

    // 2. Snap to grid 0.5m
    const grid = 0.5;
    return {
      x: Math.round(mx / grid) * grid,
      y: Math.round(my / grid) * grid
    };
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    
    if (mode === 'edit') {
      if (editSubMode === 'draw') {
        const point = getSnapPoint(px, py);
        
        // Check for double click or finishing polyline
        if (drawingPoints.length > 0 && e.detail === 2) {
          // Double click finishes the polyline
          const newWalls: Wall[] = [];
          for (let i = 0; i < drawingPoints.length - 1; i++) {
            newWalls.push({
              id: Math.random().toString(36).substr(2, 9),
              start: drawingPoints[i],
              end: drawingPoints[i + 1],
              materialId: selectedMaterialId,
              floor: currentFloor
            });
          }
          const updatedWalls = [...walls, ...newWalls];
          setWalls(updatedWalls);
          saveToHistory(updatedWalls);
          setDrawingPoints([]);
          return;
        }

        if (e.shiftKey && drawingPoints.length > 0) {
          // Ortho lock
          const last = drawingPoints[drawingPoints.length - 1];
          if (Math.abs(point.x - last.x) > Math.abs(point.y - last.y)) {
            point.y = last.y;
          } else {
            point.x = last.x;
          }
        }
        setDrawingPoints([...drawingPoints, point]);
      } else if (editSubMode === 'erase' && hoveredWallId) {
        const newWalls = walls.filter(w => w.id !== hoveredWallId);
        setWalls(newWalls);
        saveToHistory(newWalls);
        setHoveredWallId(null);
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || (e.key === ' ' && drawingPoints.length > 1)) {
      // Finish polyline
      if (drawingPoints.length > 1) {
        const newWalls: Wall[] = [];
        for (let i = 0; i < drawingPoints.length - 1; i++) {
          newWalls.push({
            id: Math.random().toString(36).substr(2, 9),
            start: drawingPoints[i],
            end: drawingPoints[i + 1],
            materialId: selectedMaterialId,
            floor: currentFloor
          });
        }
        const updatedWalls = [...walls, ...newWalls];
        setWalls(updatedWalls);
        saveToHistory(updatedWalls);
        setDrawingPoints([]);
      }
    }
    if (e.key === 'Escape') {
      setDrawingPoints([]);
      if (mode === 'edit') setMode('heatmap');
    }
    if (e.key === 'Backspace' && drawingPoints.length > 0) {
      setDrawingPoints(drawingPoints.slice(0, -1));
    }
    if (e.ctrlKey && e.key === 'z') {
      undo();
    }
    if (e.ctrlKey && e.key === 'y') {
      redo();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawingPoints, walls, mode, selectedMaterialId, currentFloor, historyIndex]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const mx = px / SCALE;
    const my = py / SCALE;
    
    setMousePos({ x: mx, y: my });

    if (isDraggingAP) {
      setAP(prev => ({ ...prev, x: mx, y: my }));
    }

    if (mode === 'edit' && editSubMode === 'erase') {
      // Find wall under mouse
      let found: string | null = null;
      for (const wall of walls) {
        if (wall.floor !== currentFloor) continue;
        // Point to segment distance
        const d = distToSegment({ x: mx, y: my }, wall.start, wall.end);
        if (d < 0.2) { // 0.2m threshold
          found = wall.id;
          break;
        }
      }
      setHoveredWallId(found);
    }
  };

  const distToSegment = (p: Point, v: Point, w: Point) => {
    const l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
    if (l2 === 0) return Math.pow(p.x - v.x, 2) + Math.pow(p.y - v.y, 2);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.sqrt(Math.pow(p.x - (v.x + t * (w.x - v.x)), 2) + Math.pow(p.y - (v.y + t * (w.y - v.y)), 2));
  };

  const handleExport = () => {
    const data = {
      walls,
      ap,
      deviceHeight,
      externalPenalty
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wifi-planner-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data.walls) setWalls(data.walls);
        if (data.ap) setAP(data.ap);
        if (data.deviceHeight) setDeviceHeight(data.deviceHeight);
        if (data.externalPenalty) setExternalPenalty(data.externalPenalty);
        // Reset history
        setHistory([data.walls]);
        setHistoryIndex(0);
      } catch (err) {
        alert('Falha ao importar arquivo JSON.');
      }
    };
    reader.readAsText(file);
  };

  // --- Computed UI Values ---
  const currentRSSI = getSinalAtPoint(mousePos.x, mousePos.y);

  return (
    <div className="flex h-screen bg-neutral-50 font-sans text-neutral-900 overflow-hidden">
      {/* --- Sidebar Left: Models & Settings --- */}
      <aside className="w-80 border-r border-neutral-200 bg-white p-6 flex flex-col space-y-8 overflow-y-auto shrink-0 z-20">
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2 bg-blue-600 rounded-lg text-white">
            <Wifi size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">WiFi Planner</h1>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={handleExport}
            className="flex-1 py-2 px-3 bg-neutral-100 hover:bg-neutral-200 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors text-neutral-700"
          >
            <Download size={16} /> Exportar
          </button>
          <label className="flex-1 py-2 px-3 bg-neutral-100 hover:bg-neutral-200 rounded-md text-sm font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors text-neutral-700">
            <Upload size={16} /> Importar
            <input type="file" className="hidden" accept=".json" onChange={handleImport} />
          </label>
        </div>

        <AnimatePresence mode="wait">
          {mode === 'heatmap' ? (
            <motion.div 
              key="heatmap-bar"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="flex flex-col space-y-8"
            >
              <div>
                <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4">Modelo do Access Point</h3>
                <div className="grid grid-cols-1 gap-2">
                  {AP_MODELS.map(model => (
                    <button
                      key={model.id}
                      onClick={() => setAP({ ...ap, modelId: model.id })}
                      className={cn(
                        "p-3 text-left border rounded-lg transition-all text-neutral-900",
                        ap.modelId === model.id 
                          ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500" 
                          : "border-neutral-200 hover:border-neutral-300"
                      )}
                    >
                      <div className="text-xs font-bold text-blue-600 mb-1">{model.brand}</div>
                      <div className="text-sm font-semibold">{model.name}</div>
                      <div className="flex gap-2 mt-2">
                        <span className="text-[10px] px-1.5 py-0.5 bg-neutral-100 rounded text-neutral-500 font-medium">2.4G: {model.power24} dBm</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-neutral-100 rounded text-neutral-500 font-medium">5G: {model.power5} dBm</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4">Configurações de RF</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-500 mb-2">Frequência Operacional</label>
                    <div className="flex p-1 bg-neutral-100 rounded-lg">
                      {(['2.4GHz', '5GHz'] as Frequency[]).map(freq => (
                        <button
                          key={freq}
                          onClick={() => setAP({ ...ap, frequency: freq })}
                          className={cn(
                            "flex-1 py-1 text-xs font-semibold rounded-md transition-all",
                            ap.frequency === freq ? "bg-white shadow text-blue-600" : "text-neutral-500 hover:text-neutral-700"
                          )}
                        >
                          {freq}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="flex justify-between text-xs font-medium text-neutral-500 mb-2">
                      Altura do AP (m)
                      <span>{ap.height}m</span>
                    </label>
                    <input 
                      type="range" min="0.5" max="5.0" step="0.1" 
                      value={ap.height} 
                      onChange={e => setAP({ ...ap, height: parseFloat(e.target.value) })}
                      className="w-full h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>
                  <div>
                    <label className="flex justify-between text-xs font-medium text-neutral-500 mb-2">
                      Altura do Dispositivo (m)
                      <span>{deviceHeight}m</span>
                    </label>
                    <input 
                      type="range" min="0" max="2.0" step="0.1" 
                      value={deviceHeight} 
                      onChange={e => setDeviceHeight(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>
                  <div>
                    <label className="flex justify-between text-xs font-medium text-neutral-500 mb-2 items-center">
                      Penalidade Externa (dB)
                      <div className="group relative">
                        <Info size={12} className="text-neutral-400 cursor-help" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-neutral-800 text-white text-[10px] rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          Atenuação aplicada quando o AP está fora do prédio (ex: perda através de fachadas ou obstáculos externos).
                        </div>
                      </div>
                      <span>{externalPenalty} dB</span>
                    </label>
                    <input 
                      type="range" min="0" max="30" 
                      value={externalPenalty} 
                      onChange={e => setExternalPenalty(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="drawing-bar"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="flex flex-col space-y-8"
            >
              <div>
                <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4">Ferramentas de Desenho</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setEditSubMode('draw')}
                    className={cn(
                      "p-4 rounded-xl transition-all flex flex-col items-center gap-2 border",
                      editSubMode === 'draw' ? "bg-blue-600 text-white border-blue-600 shadow-lg" : "text-neutral-500 hover:bg-neutral-50 border-neutral-200"
                    )}
                  >
                    <Pencil size={24} />
                    <span className="text-[10px] font-bold">Desenhar</span>
                  </button>
                  <button 
                     onClick={() => setEditSubMode('erase')}
                     className={cn(
                       "p-4 rounded-xl transition-all flex flex-col items-center gap-2 border",
                       editSubMode === 'erase' ? "bg-red-600 text-white border-red-600 shadow-lg" : "text-neutral-500 hover:bg-neutral-50 border-neutral-200"
                     )}
                  >
                    <Eraser size={24} />
                    <span className="text-[10px] font-bold">Apagar</span>
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4">Escolha o Material</h3>
                <div className="grid grid-cols-1 gap-2">
                  {MATERIALS.map(m => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMaterialId(m.id)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                        selectedMaterialId === m.id 
                          ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500" 
                          : "border-neutral-200 hover:border-neutral-300 bg-white"
                      )}
                    >
                      <div 
                        className="w-5 h-5 rounded-full shrink-0 shadow-sm border border-black/5" 
                        style={{ backgroundColor: m.color }} 
                      />
                      <div className="flex flex-col">
                        <span className={cn(
                          "text-xs font-bold whitespace-nowrap",
                          selectedMaterialId === m.id ? "text-blue-700 font-bold" : "text-neutral-700"
                        )}>
                          {m.name}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-medium">Atenuação: −{m.attenuation} dB</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3">
                <div className="flex items-center gap-2 text-neutral-500 font-bold text-xs uppercase tracking-tight">
                  <Info size={14} /> Atalhos de Teclado
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] text-neutral-500">
                    <span className="font-medium">Eixos Reto</span>
                    <span className="bg-neutral-200 px-1 rounded font-mono text-neutral-600">Shift</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-neutral-500">
                    <span className="font-medium">Concluir Parede</span>
                    <span className="bg-neutral-200 px-1 rounded font-mono text-neutral-600">Enter</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-neutral-500">
                    <span className="font-medium">Desfazer Ação</span>
                    <span className="bg-neutral-200 px-1 rounded font-mono text-neutral-600">Ctrl+Z</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-neutral-500">
                    <span className="font-medium">Remover Ponto</span>
                    <span className="bg-neutral-200 px-1 rounded font-mono text-neutral-600">BS</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </aside>

      {/* --- Main Area: Canvas --- */}
      <main className="flex-1 flex flex-col items-center bg-neutral-50 overflow-hidden relative">
        
        {/* Top Controls */}
        <div className="w-full h-16 border-b border-neutral-200 bg-white flex items-center justify-between px-8 shrink-0 z-10 shadow-sm">
          <div className="flex bg-neutral-100 p-1 rounded-xl">
            <button 
              onClick={() => setMode('heatmap')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all",
                mode === 'heatmap' ? "bg-white shadow text-blue-600" : "text-neutral-500 hover:text-neutral-700"
              )}
            >
              <Wifi size={16} /> Modo Heatmap
            </button>
            <button 
              onClick={() => {
                setMode('edit');
                setDrawingPoints([]);
              }}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all",
                mode === 'edit' ? "bg-white shadow text-blue-600" : "text-neutral-500 hover:text-neutral-700"
              )}
            >
              <Pencil size={16} /> Modo Desenho
            </button>
          </div>

          <div className="flex bg-neutral-100 p-1 rounded-xl">
            {( [0, 1] as const).map(f => (
              <button 
                key={f}
                onClick={() => setCurrentFloor(f)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-sm font-semibold transition-all relative",
                  currentFloor === f ? "bg-white shadow text-blue-600" : "text-neutral-500 hover:text-neutral-700"
                )}
              >
                {f === 0 ? 'Térreo' : '1º Andar'}
                {ap.floor === f && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full border border-white" />
                )}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button 
              onClick={undo}
              disabled={historyIndex <= 0}
              className="p-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg text-neutral-600 disabled:opacity-40 transition-colors"
              title="Desfazer (Ctrl+Z)"
            >
              <Undo size={18} />
            </button>
            <button 
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="p-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg text-neutral-600 disabled:opacity-40 transition-colors"
              title="Refazer (Ctrl+Y)"
            >
              <Redo size={18} />
            </button>
          </div>
        </div>

        {/* Canvas Display */}
        <div 
          ref={containerRef}
          className="flex-1 w-full flex items-center justify-center p-8 overflow-auto CustomScroll"
        >
          <div 
            className="relative bg-white shadow-2xl border-4 border-neutral-800"
            style={{ 
              width: PLAN_WIDTH_M * SCALE, 
              height: PLAN_HEIGHT_M * SCALE,
              cursor: mode === 'edit' ? (editSubMode === 'erase' ? 'crosshair' : 'crosshair') : 'default'
            }}
          >
            {/* Heatmap Layer */}
            <canvas 
              ref={heatmapRef} 
              width={PLAN_WIDTH_M * SCALE} 
              height={PLAN_HEIGHT_M * SCALE}
              className="absolute inset-0 pointer-events-none"
            />

            {/* Drawing/Interaction Layer */}
            <canvas 
              ref={canvasRef}
              width={PLAN_WIDTH_M * SCALE}
              height={PLAN_HEIGHT_M * SCALE}
              onMouseDown={(e) => {
                if (mode === 'heatmap') {
                  const rect = canvasRef.current!.getBoundingClientRect();
                  const mx = (e.clientX - rect.left) / SCALE;
                  const my = (e.clientY - rect.top) / SCALE;
                  if (Math.abs(mx - ap.x) < 0.5 && Math.abs(my - ap.y) < 0.5) {
                    setIsDraggingAP(true);
                  }
                }
              }}
              onMouseUp={() => setIsDraggingAP(false)}
              onMouseMove={handleMouseMove}
              onClick={handleCanvasClick}
              className="absolute inset-0 block"
              id="interaction-canvas"
            />

            {/* SVG Overlays (Walls, AP, etc) */}
            <svg 
              className="absolute inset-0 pointer-events-none overflow-visible"
              width={PLAN_WIDTH_M * SCALE}
              height={PLAN_HEIGHT_M * SCALE}
            >
              {/* Grid toggle when drawing */}
              {mode === 'edit' && (
                <pattern id="grid" width={0.5 * SCALE} height={0.5 * SCALE} patternUnits="userSpaceOnUse">
                  <circle cx={1} cy={1} r={1} fill="#e5e5e5" />
                </pattern>
              )}
              {mode === 'edit' && <rect width="100%" height="100%" fill="url(#grid)" />}

              {/* Existing Walls */}
              {walls.filter(w => w.floor === currentFloor).map(wall => (
                <line
                  key={wall.id}
                  x1={wall.start.x * SCALE}
                  y1={wall.start.y * SCALE}
                  x2={wall.end.x * SCALE}
                  y2={wall.end.y * SCALE}
                  stroke={hoveredWallId === wall.id ? '#ef4444' : (MATERIALS.find(m => m.id === wall.materialId)?.color || '#000')}
                  strokeWidth={hoveredWallId === wall.id ? 5 : 3}
                  className="transition-colors"
                />
              ))}

              {/* Drawing Points / Polyline */}
              {drawingPoints.length > 0 && (
                <>
                  <polyline
                    points={drawingPoints.map(p => `${p.x * SCALE},${p.y * SCALE}`).join(' ')}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    strokeDasharray="5,5"
                  />
                  {drawingPoints.length > 0 && (
                     <line 
                        x1={drawingPoints[drawingPoints.length - 1].x * SCALE}
                        y1={drawingPoints[drawingPoints.length - 1].y * SCALE}
                        x2={mousePos.x * SCALE}
                        y2={mousePos.y * SCALE}
                        stroke="#3b82f6"
                        strokeWidth={2}
                        strokeDasharray="5,5"
                     />
                  )}
                  {drawingPoints.map((p, i) => (
                    <circle key={i} cx={p.x * SCALE} cy={p.y * SCALE} r={4} fill="#3b82f6" />
                  ))}
                  {/* Current Length Label */}
                  {drawingPoints.length > 0 && (
                    <text 
                      x={mousePos.x * SCALE + 10} 
                      y={mousePos.y * SCALE - 10} 
                      className="text-[10px] font-bold fill-blue-600"
                    >
                      {Math.sqrt(Math.pow(mousePos.x - drawingPoints[drawingPoints.length-1].x, 2) + Math.pow(mousePos.y - drawingPoints[drawingPoints.length-1].y, 2)).toFixed(2)}m
                    </text>
                  )}
                </>
              )}

              {/* AP Icon */}
              <g 
                className={cn("transition-opacity", ap.floor !== currentFloor ? "opacity-30" : "opacity-100 hover:cursor-move")}
                style={{ pointerEvents: 'none' }}
              >
                <circle 
                  cx={ap.x * SCALE} 
                  cy={ap.y * SCALE} 
                  r={12} 
                  fill={isAPOutside ? '#fee2e2' : '#dbeafe'} 
                  stroke={isAPOutside ? '#ef4444' : '#3b82f6'} 
                  strokeWidth={2}
                />
                <text 
                  x={ap.x * SCALE} 
                  y={ap.y * SCALE} 
                  dominantBaseline="middle" 
                  textAnchor="middle" 
                  className={cn("text-[10px] font-bold", isAPOutside ? "fill-red-600" : "fill-blue-600")}
                >
                  AP
                </text>
                {/* 3D height indicators */}
                <line 
                  x1={ap.x * SCALE} 
                  y1={ap.y * SCALE} 
                  x2={ap.x * SCALE} 
                  y2={(ap.y - ap.height*0.2) * SCALE} 
                  stroke="#3b82f6" 
                  strokeWidth={1}
                />
              </g>

              {/* Outside Banner */}
              {isAPOutside && (
                <foreignObject x={10} y={10} width={150} height={40}>
                  <div className="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded text-[10px] font-bold border border-red-200">
                    <AlertTriangle size={12} /> AP FORA DO EDIFÍCIO
                  </div>
                </foreignObject>
              )}
            </svg>
          </div>
        </div>

        {/* Status bar info */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 flex gap-4 bg-white/90 backdrop-blur border border-neutral-200 px-4 py-2 rounded-full shadow-lg z-20 transition-all text-neutral-900">
          <div className="flex items-center gap-2 border-r border-neutral-200 pr-4 text-neutral-900">
             <MousePointer2 size={14} className="text-neutral-400" />
             <span className="text-xs font-mono font-medium">
               {mousePos.x.toFixed(2)}m, {mousePos.y.toFixed(2)}m
             </span>
          </div>
          <div className="flex items-center gap-2 text-neutral-900">
             <div className="w-3 h-3 rounded-full" style={{ backgroundColor: rssiToColor(currentRSSI) }} />
             <span className="text-xs font-bold whitespace-nowrap">
               {currentRSSI.toFixed(1)} dBm ({rssiToClassification(currentRSSI)})
             </span>
          </div>
        </div>
      </main>

      {/* --- Sidebar Right: Legend --- */}
      <aside className="w-72 border-l border-neutral-200 bg-white p-6 flex flex-col space-y-8 overflow-y-auto shrink-0 z-20">
        <AnimatePresence mode="wait">
          {mode === 'heatmap' ? (
            <motion.div 
              key="legend-heatmap"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
            >
              <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4">Escala de Cobertura</h3>
              <div className="space-y-4">
                {[
                  { label: 'Excelente', range: '≥ −55 dBm', color: 'bg-[rgb(0,128,0)]', desc: 'Máximo desempenho' },
                  { label: 'Boa', range: '−56 a −67 dBm', color: 'bg-[rgb(50,205,50)]', desc: 'Enterprise target' },
                  { label: 'Regular', range: '−68 a −75 dBm', color: 'bg-[rgb(255,255,0)]', desc: 'Web e e-mail' },
                  { label: 'Ruim', range: '−76 a −85 dBm', color: 'bg-[rgb(255,165,0)]', desc: 'Instável' },
                  { label: 'Inexistente', range: '< −85 dBm', color: 'bg-[rgb(255,0,0)]', desc: 'Sem conexão' }
                ].map(item => (
                  <div key={item.label} className="flex gap-3">
                    <div className={cn("w-3 h-3 rounded-full mt-1.5 shrink-0 shadow-sm", item.color)} />
                    <div>
                      <div className="text-xs font-bold flex justify-between gap-2 text-neutral-700">
                        {item.label}
                        <span className="text-neutral-400 font-normal">{item.range}</span>
                      </div>
                      <div className="text-[10px] text-neutral-500 font-medium">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="legend-edit"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
            >
              <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4">Materiais na Planta</h3>
              <div className="space-y-4">
                {MATERIALS.map(m => (
                  <div key={m.id} className="flex items-center gap-3">
                    <div className="w-8 h-1.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: m.color }} />
                    <div className="flex-1">
                      <div className="text-xs font-bold text-neutral-700">{m.name}</div>
                      <div className="text-[10px] text-neutral-400 font-medium">Perda: −{m.attenuation} dB</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1" />

        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
          <div className="flex items-center gap-2 text-blue-700 mb-2">
            <Info size={16} />
            <h4 className="text-sm font-bold">Resumo Técnico</h4>
          </div>
          <div className="space-y-2 text-[10px] text-blue-600 font-medium">
            <p>• Modelo: ITU-R P.1238 (Indoor Office)</p>
            <p>• Ray-casting 2D com distância 3D</p>
            <p>• Escala: 1m = 25px ({PLAN_WIDTH_M}m × {PLAN_HEIGHT_M}m)</p>
            <p className="mt-2 pt-2 border-t border-blue-200 opacity-60">Baseado em previsões teóricas. O sinal real pode variar.</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
