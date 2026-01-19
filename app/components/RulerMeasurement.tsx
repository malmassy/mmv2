'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

type RulerMeasurementProps = {
  lengthMm: number;        // Length of object in mm
  resolution: number;      // Resolution in mm (e.g., 0.1, 0.5, 1)
  resolutionLabel: string; // Display label for resolution (e.g., "1 mm", "0.5 mm")
  onMeasurementChange?: (measuredLengthMm: number) => void; // Optional callback when object is positioned
};

/**
 * RulerMeasurement component displays a canvas-like area with a fixed ruler and draggable object.
 * The ruler is responsive to window size with proper spacing for millimeter visibility.
 * Object can be dragged above or below the ruler to align with zero mark.
 */
export default function RulerMeasurement({ lengthMm, resolution, resolutionLabel, onMeasurementChange }: RulerMeasurementProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(800);
  const [canvasHeight] = useState(400); // Fixed height for canvas area
  
  // Calculate responsive pixel scale based on available width
  // Ensure at least 4px per mm for good visibility between millimeter marks
  const pixelsPerMm = Math.max(4, Math.floor(canvasWidth / 200)); // Minimum 200mm (20cm) visible
  const rulerWidthMm = Math.floor(canvasWidth / pixelsPerMm); // Actual ruler width in mm
  
  // Ruler display properties
  const rulerHeightPx = 50; // Height of ruler body
  const tickHeightSmall = 8; // Small tick height in pixels (on top)
  const tickHeightMedium = 12; // Medium tick height (every 5mm)
  const tickHeightLarge = 18; // Large tick height (every cm)
  const tickGap = 4; // Gap between tick and label
  
  // Object properties
  const objectHeight = 30; // Height of object rectangle
  
  // Update canvas width on resize
  useEffect(() => {
    const updateWidth = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setCanvasWidth(Math.max(600, rect.width - 40)); // Minimum 600px, account for padding
      }
    };
    
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);
  
  // Zoom state - allow zooming in once (2x)
  const [isZoomed, setIsZoomed] = useState(false);
  const zoomFactor = isZoomed ? 2 : 1;
  
  // Canvas coordinate system: (0,0) is top-left of canvas
  // Ruler is positioned in the middle vertically, object can be above or below
  const rulerY = canvasHeight / 2; // Ruler center Y position
  const rulerPadding = 30; // Padding before zero mark
  const rulerZeroX = 20 + rulerPadding; // Ruler zero position (left edge + padding)
  
  // Adjust pixels per mm based on zoom (when zoomed, double the resolution)
  const effectivePixelsPerMm = pixelsPerMm * zoomFactor;
  const effectiveObjectWidth = lengthMm * effectivePixelsPerMm;
  const effectiveRulerWidthMm = Math.floor((canvasWidth - rulerZeroX - 20) / effectivePixelsPerMm);
  
  // Object position in canvas coordinates (accounting for zoom)
  // Start object above ruler, offset to the left
  const [objectX, setObjectX] = useState(100);
  const [objectY, setObjectY] = useState(0); // Will be initialized
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef({ startX: 0, startY: 0, startObjectX: 0, startObjectY: 0 });
  const initializedRef = useRef(false);
  
  // Adjust object position when zooming to maintain visual position relative to zero
  useEffect(() => {
    if (initializedRef.current && !isDragging) {
      // When zooming, adjust object X to maintain relative position to zero
      setObjectX(prevX => {
        const offsetFromZero = prevX - rulerZeroX;
        // Scale the offset based on zoom factor
        return rulerZeroX + (offsetFromZero * zoomFactor);
      });
    }
  }, [isZoomed, zoomFactor, rulerZeroX, isDragging]);
  
  // Initialize object position when canvas width is available (only once)
  useEffect(() => {
    if (canvasWidth > 0 && !initializedRef.current) {
      setObjectX(rulerZeroX - 50); // Start slightly to the left of zero
      setObjectY(rulerY - 60); // Start above ruler
      initializedRef.current = true;
    }
  }, [canvasWidth, rulerY, rulerZeroX]);
  
  // Calculate measured length based on object position
  // When left edge of object aligns with ruler zero, measured length = object's actual length
  const objectLeftEdgeX = objectX;
  
  // Measurement: when left edge is at zero, length is the object width
  // Offset from zero affects the reading (account for zoom)
  const offsetFromZero = objectLeftEdgeX - rulerZeroX;
  const measuredLengthMm = Math.max(0, (effectiveObjectWidth - offsetFromZero) / effectivePixelsPerMm);
  
  // No snapping - use actual measured length
  
  // Check if object is aligned with zero (tolerance adjusted for zoom)
  const alignmentTolerance = isZoomed ? 2 : 3; // Tighter tolerance when zoomed
  const isAlignedWithZero = Math.abs(offsetFromZero) <= alignmentTolerance;
  
  // Update parent component when measurement changes (on drag end)
  useEffect(() => {
    if (onMeasurementChange && !isDragging) {
      onMeasurementChange(measuredLengthMm);
    }
  }, [measuredLengthMm, isDragging, onMeasurementChange]);
  
  // Handle mouse/touch events for dragging
  const handleStart = useCallback((clientX: number, clientY: number) => {
    if (!canvasRef.current) return;
    setIsDragging(true);
    const rect = canvasRef.current.getBoundingClientRect();
    // Account for zoom: scale coordinates to match inner scaled container
    dragStateRef.current.startX = (clientX - rect.left) * zoomFactor;
    dragStateRef.current.startY = (clientY - rect.top) * zoomFactor;
    dragStateRef.current.startObjectX = objectX;
    dragStateRef.current.startObjectY = objectY;
  }, [objectX, objectY, zoomFactor]);
  
  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!canvasRef.current || !isDragging) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    // Account for zoom: when inner div is scaled, mouse coords need to be scaled up
    const canvasX = (clientX - rect.left) * zoomFactor;
    const canvasY = (clientY - rect.top) * zoomFactor;
    
    // Calculate delta from drag start (dragStateRef already has scaled coords)
    const deltaX = canvasX - dragStateRef.current.startX;
    const deltaY = canvasY - dragStateRef.current.startY;
    
    // Update object position (only horizontal movement for now, but ready for rotation/vertical later)
    const newX = dragStateRef.current.startObjectX + deltaX;
    const newY = dragStateRef.current.startObjectY + deltaY;
    
    // Constrain object to canvas bounds (account for zoom)
    const effectiveCanvasWidth = canvasWidth * zoomFactor;
    const effectiveCanvasHeight = canvasHeight * zoomFactor;
    const minX = -effectiveObjectWidth;
    const maxX = effectiveCanvasWidth + effectiveObjectWidth;
    const minY = 0;
    const maxY = effectiveCanvasHeight - objectHeight;
    
    setObjectX(Math.max(minX, Math.min(maxX, newX)));
    setObjectY(Math.max(minY, Math.min(maxY, newY)));
  }, [canvasWidth, canvasHeight, effectiveObjectWidth, objectHeight, isDragging, zoomFactor]);
  
  const handleEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    // No snapping - just end the drag
  }, [isDragging]);
  
  // Mouse events
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX, e.clientY);
  };
  
  useEffect(() => {
    if (!isDragging) return;
    
    const onMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      handleMove(e.clientX, e.clientY);
    };
    
    const onMouseUp = () => {
      handleEnd();
    };
    
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging, handleMove, handleEnd]);
  
  // Touch events for mobile
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    if (touch) handleStart(touch.clientX, touch.clientY);
  }, [handleStart]);
  
  useEffect(() => {
    if (!isDragging) return;
    
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (touch) handleMove(touch.clientX, touch.clientY);
    };
    
    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      handleEnd();
    };
    
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    
    return () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [isDragging, handleMove, handleEnd]);
  
  // Generate tick marks on top of ruler
  // Tick positions are relative to ruler's left edge (padding before zero)
  const ticks: Array<{ position: number; height: number; label?: string }> = [];
  
  // Calculate ruler width in mm based on zoom
  const rulerWidthInMm = Math.floor((canvasWidth * (isZoomed ? 2 : 1) - rulerZeroX - 20) / effectivePixelsPerMm);
  
  // Small ticks (every resolution)
  for (let mm = 0; mm <= rulerWidthInMm; mm += resolution) {
    const isCm = mm % 10 === 0; // Every centimeter
    const isMedium = mm % 5 === 0; // Every 5mm (if resolution allows)
    
    // Position relative to ruler's left edge (after padding)
    const tickPositionInRuler = rulerPadding + (mm * effectivePixelsPerMm);
    
    if (isCm) {
      ticks.push({
        position: tickPositionInRuler,
        height: tickHeightLarge,
        label: `${mm / 10}cm`,
      });
    } else if (isMedium && resolution <= 1) {
      ticks.push({
        position: tickPositionInRuler,
        height: tickHeightMedium,
      });
    } else {
      ticks.push({
        position: tickPositionInRuler,
        height: tickHeightSmall,
      });
    }
  }

  return (
    <div style={{ 
      margin: '20px 0',
      padding: '20px',
      background: '#f9f9f9',
      borderRadius: '8px',
      border: '1px solid #ddd',
    }}>
      {/* Instructions and Zoom Control */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
      }}>
        <div style={{
          fontSize: '13px',
          color: '#666',
          fontStyle: 'italic',
        }}>
          Drag the object to align its left edge with the ruler's zero mark (you can drag it above or below the ruler)
        </div>
        <button
          onClick={() => setIsZoomed(!isZoomed)}
          style={{
            padding: '6px 12px',
            fontSize: '13px',
            fontWeight: 600,
            background: isZoomed ? '#667eea' : '#f0f0f0',
            color: isZoomed ? '#fff' : '#333',
            border: `1px solid ${isZoomed ? '#667eea' : '#ccc'}`,
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          {isZoomed ? 'Zoom Out 1×' : 'Zoom In 2×'}
        </button>
      </div>

      {/* Canvas area with zoom support */}
      <div
        ref={canvasRef}
        style={{
          position: 'relative',
          width: '100%',
          height: `${canvasHeight}px`,
          background: '#f9f9f9',
          border: '1px solid #ccc',
          borderRadius: '4px',
          overflow: isZoomed ? 'auto' : 'hidden',
          marginBottom: '12px',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: isZoomed ? `${canvasWidth * zoomFactor}px` : '100%',
            height: isZoomed ? `${canvasHeight * zoomFactor}px` : `${canvasHeight}px`,
            transform: isZoomed ? `scale(${1 / zoomFactor})` : 'scale(1)',
            transformOrigin: 'top left',
            background: '#fff',
            transition: isDragging ? 'none' : 'transform 0.3s ease',
          }}
        >
        {/* Object - draggable */}
        <div
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          style={{
            position: 'absolute',
            left: `${objectX}px`,
            top: `${objectY}px`,
            width: `${effectiveObjectWidth}px`,
            height: `${objectHeight}px`,
            background: isDragging 
              ? 'linear-gradient(135deg, #5568d3 0%, #6a3a8a 100%)' 
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '4px',
            border: isAlignedWithZero 
              ? '2px solid #28a745' 
              : isDragging 
              ? '2px solid #4a5568' 
              : '2px solid #333',
            boxShadow: isDragging 
              ? '0 4px 12px rgba(0,0,0,0.3)' 
              : '0 2px 8px rgba(0,0,0,0.2)',
            transition: isDragging ? 'none' : 'border-color 0.2s ease',
            userSelect: 'none',
            touchAction: 'none',
            cursor: isDragging ? 'grabbing' : 'grab',
            zIndex: 10,
          }}
        >
          {/* Left alignment marker (should align with ruler zero) */}
          <div style={{
            position: 'absolute',
            left: '-1px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: isZoomed ? '2px' : '3px',
            height: isZoomed ? '20px' : '16px',
            background: isAlignedWithZero ? '#28a745' : '#e74c3c',
            transition: 'background 0.2s ease',
            borderRadius: '1px',
          }} />
          
          {/* Right alignment marker (shows end of object) */}
          <div style={{
            position: 'absolute',
            right: '-1px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: isZoomed ? '2px' : '3px',
            height: isZoomed ? '20px' : '16px',
            background: '#e74c3c',
            borderRadius: '1px',
          }} />
        </div>

        {/* Alignment guide line when near zero */}
        {isAlignedWithZero && (
          <div style={{
            position: 'absolute',
            left: `${rulerZeroX}px`,
            top: '0',
            width: '2px',
            height: `${canvasHeight}px`,
            background: '#28a745',
            opacity: 0.4,
            pointerEvents: 'none',
            zIndex: 5,
          }} />
        )}

        {/* Ruler - positioned in center with padding before zero */}
        <div style={{
          position: 'absolute',
          left: '20px',
          top: `${rulerY - rulerHeightPx / 2}px`,
          width: `${(rulerWidthInMm * effectivePixelsPerMm) + rulerPadding}px`,
          height: `${rulerHeightPx}px`,
          background: '#fff',
          border: '2px solid #333',
          borderRadius: '2px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}>
          {/* Padding area before zero (visual spacer) */}
          <div style={{
            position: 'absolute',
            left: '0',
            top: '0',
            width: `${rulerPadding}px`,
            height: '100%',
            background: '#f5f5f5',
            borderRight: '1px dashed #ccc',
          }} />
          {/* Tick marks on top */}
          {ticks.map((tick, idx) => (
            <React.Fragment key={idx}>
              <div
                style={{
                  position: 'absolute',
                  left: `${tick.position}px`, // Position relative to ruler's left edge
                  top: '0',
                  width: '1px',
                  height: `${tick.height}px`,
                  background: '#333',
                }}
              />
              {tick.label && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${tick.position}px`,
                    top: `${tick.height + tickGap}px`,
                    transform: 'translateX(-50%)',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#333',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {tick.label}
                </div>
              )}
            </React.Fragment>
          ))}
          
          {/* Zero mark highlight (at padding edge) */}
          <div
            style={{
              position: 'absolute',
              left: `${rulerPadding - 1}px`,
              top: '0',
              width: isZoomed ? '2px' : '3px',
              height: `${tickHeightLarge}px`,
              background: '#e74c3c',
              zIndex: 1,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: `${rulerPadding}px`,
              top: `${tickHeightLarge + tickGap}px`,
              fontSize: isZoomed ? '12px' : '11px',
              fontWeight: 700,
              color: '#e74c3c',
              transform: 'translateX(-50%)',
              whiteSpace: 'nowrap',
            }}
          >
            0
          </div>
        </div>
        </div>
      </div>

      {/* Measurement display */}
      <div style={{
        fontSize: '14px',
        color: '#333',
        fontWeight: 600,
      }}>
        Measured length: <strong style={{ color: isAlignedWithZero ? '#28a745' : '#666' }}>
          {measuredLengthMm.toFixed(resolution < 1 ? 2 : 1)} mm
        </strong>
      </div>
      
      {/* Resolution indicator */}
      <div style={{
        marginTop: '6px',
        fontSize: '12px',
        color: '#666',
        fontStyle: 'italic',
      }}>
        Ruler resolution: <strong>{resolutionLabel}</strong> • Scale: {effectivePixelsPerMm}px/mm {isZoomed ? '(Zoomed 2×)' : ''}
      </div>
    </div>
  );
}