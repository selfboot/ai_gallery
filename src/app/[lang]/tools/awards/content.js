"use client";

import { useState, useRef, useEffect } from "react";
import template from "./templates";
import Draggable from "react-draggable";

export default function GenAwards({ lang }) {
  const [textValues, setTextValues] = useState(() => {
    const initialValues = {};
    template.textPositions.forEach((pos) => {
      initialValues[pos.id] = pos.defaultText || "";
    });
    return initialValues;
  });
  const [activeInput, setActiveInput] = useState(null);
  const [textAligns, setTextAligns] = useState({});
  const [positions, setPositions] = useState({});
  const containerRef = useRef(null);
  const [scale, setScale] = useState(null);

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const currentWidth = containerRef.current.clientWidth;
        const newScale = currentWidth / template.width;
        console.log("Scale calculation:", {
          currentWidth,
          templateWidth: template.width,
          newScale,
        });
        setScale(newScale);
      }
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [template.width]);

  const getPositionStyle = (position) => {
    let transformX = "0";
    switch (position.textAnchor) {
      case "start":
        transformX = "0";
        break;
      case "end":
        transformX = "-100%";
        break;
      default: // 'middle' or undefined
        transformX = "-50%";
    }

    const scaledX = position.x * scale;
    const scaledY = position.y * scale;

    console.log(`Position ${position.id}:`, {
      original: { x: position.x, y: position.y },
      scaled: { x: scaledX, y: scaledY },
      scale,
      textAnchor: position.textAnchor,
      transformX,
    });

    return { x: scaledX, y: scaledY, transformX };
  };

  const handleDragStop = (id, e, data) => {
    const originalX = data.x / scale;
    const originalY = data.y / scale;

    console.log("Drag stopped:", {
      id,
      originalPosition: { x: originalX, y: originalY },
      scaledPosition: data,
      scale,
    });

    setPositions((prev) => ({
      ...prev,
      [id]: { x: originalX, y: originalY },
    }));
  };

  const toggleTextAlign = (id) => {
    setTextAligns((prev) => {
      const current = prev[id] || "center";
      const alignments = ["left", "center", "right"];
      const nextIndex = (alignments.indexOf(current) + 1) % alignments.length;
      return { ...prev, [id]: alignments[nextIndex] };
    });
  };

  const handleExport = async () => {
    const element = document.getElementById("template-container");
    if (!element) return;

    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
      });

      const link = document.createElement("a");
      link.download = `${template.name}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  if (!scale) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">{template.name}生成器</h2>
          <div
            ref={containerRef}
            className="relative bg-white shadow-lg"
            style={{
              width: "100%",
              aspectRatio: `${template.width}/${template.height}`,
            }}
          >
            <img
              src={template.imageUrl}
              alt={template.name}
              className="absolute top-0 left-0 w-full h-full object-contain"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">{template.name}生成器</h2>

        <div
          id="template-container"
          ref={containerRef}
          className="relative bg-white shadow-lg"
          style={{
            width: "100%",
            aspectRatio: `${template.width}/${template.height}`,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <img
            src={template.imageUrl}
            alt={template.name}
            className="absolute top-0 left-0 w-full h-full object-contain"
          />

          {template.textPositions.map((position) => {
            const { x: scaledX, y: scaledY, transformX } = getPositionStyle(position);
            return (
              <Draggable
                key={position.id}
                defaultPosition={{ x: scaledX, y: scaledY }}
                onStop={(e, data) => handleDragStop(position.id, e, data)}
                scale={scale}
                bounds="parent"
                onMouseDown={() => setActiveInput(position.id)}
                onMouseUp={() => setActiveInput(null)}
              >
                <div
                  className={`absolute cursor-move ${
                    activeInput === position.id ? "outline outline-2 outline-dashed outline-blue-500" : ""
                  }`}
                  style={{
                    transform: `translate(${transformX}, -50%)`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={textValues[position.id] || ""}
                      onChange={(e) => {
                        setTextValues((prev) => ({
                          ...prev,
                          [position.id]: e.target.value,
                        }));
                      }}
                      className="bg-transparent px-2 py-1 focus:outline-none"
                      style={{
                        fontSize: `${position.fontSize * scale}px`,
                        fontFamily: position.fontFamily,
                        color: position.color,
                        textAlign: textAligns[position.id] || "center",
                        minWidth: `${100 * scale}px`,
                      }}
                      onFocus={(e) => {
                        setActiveInput(position.id);
                        e.stopPropagation();
                      }}
                      onBlur={(e) => {
                        setActiveInput(null);
                        e.stopPropagation();
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    {activeInput === position.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTextAlign(position.id);
                        }}
                        className="p-1 bg-white rounded shadow-sm hover:bg-gray-100"
                      >
                        对齐
                      </button>
                    )}
                  </div>
                </div>
              </Draggable>
            );
          })}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <button
          onClick={handleExport}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          导出图片
        </button>
      </div>
    </div>
  );
}
