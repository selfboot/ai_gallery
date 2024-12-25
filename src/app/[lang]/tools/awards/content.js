"use client";

import { useState, useRef } from "react";
import template from "./templates";
import html2canvas from "html2canvas";

export default function GenAwards({ lang }) {
  const [textValues, setTextValues] = useState(() => {
    const initialValues = {};
    template.textPositions.forEach((pos) => {
      initialValues[pos.id] = pos.defaultText || "";
    });
    return initialValues;
  });
  const [activeInput, setActiveInput] = useState(null);
  const [textPositions, setTextPositions] = useState(template.textPositions);
  const [draggedElement, setDraggedElement] = useState(null);
  const svgRef = useRef(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartTime = useRef(0);
  const dragStartPos = useRef({ x: 0, y: 0 });

  const handleDragStart = (e, id) => {
    if (!svgRef.current) return;

    e.preventDefault();
    e.stopPropagation();

    dragStartTime.current = Date.now();
    dragStartPos.current = { x: e.clientX, y: e.clientY };

    setIsDragging(true);

    const svgRect = svgRef.current.getBoundingClientRect();

    const point = svgRef.current.createSVGPoint();
    point.x = e.clientX - svgRect.left;
    point.y = e.clientY - svgRect.top;

    const svgPoint = point.matrixTransform(svgRef.current.getScreenCTM().inverse());

    const textElement = textPositions.find((pos) => pos.id === id);
    if (textElement) {
      setDragOffset({
        x: textElement.x - svgPoint.x,
        y: textElement.y - svgPoint.y,
      });
    }

    setDraggedElement(id);
  };

  const handleDrag = (e) => {
    if (!draggedElement || !svgRef.current) return;

    e.preventDefault();

    const svgRect = svgRef.current.getBoundingClientRect();

    const point = svgRef.current.createSVGPoint();
    point.x = e.clientX - svgRect.left;
    point.y = e.clientY - svgRect.top;

    const svgPoint = point.matrixTransform(svgRef.current.getScreenCTM().inverse());

    const newX = svgPoint.x + dragOffset.x;
    const newY = svgPoint.y + dragOffset.y;

    setTextPositions((prev) =>
      prev.map((pos) => {
        if (pos.id === draggedElement) {
          return { ...pos, x: newX, y: newY };
        }
        return pos;
      })
    );
  };

  const handleDragEnd = (e, id) => {
    e.preventDefault();

    const dragDistance = Math.sqrt(
      Math.pow(e.clientX - dragStartPos.current.x, 2) + Math.pow(e.clientY - dragStartPos.current.y, 2)
    );

    const isClick = Date.now() - dragStartTime.current < 200 && dragDistance < 5;

    if (isClick) {
      setActiveInput(id);
    }

    setTimeout(() => {
      setIsDragging(false);
    }, 100);

    setDraggedElement(null);
    setDragOffset({ x: 0, y: 0 });
  };

  const handleTextClick = (e, id) => {
    e.stopPropagation();

    if (isDragging) return;

    setActiveInput(id);
  };

  const addNewTextBox = () => {
    const newId = `text-${Date.now()}`;
    const newTextBox = {
      id: newId,
      x: template.width / 2,
      y: template.height / 2,
      fontSize: 20,
      fontFamily: "SimSun",
      color: "#000000",
      textAnchor: "middle",
      defaultText: "新文本",
    };

    setTextPositions((prev) => [...prev, newTextBox]);
    setTextValues((prev) => ({
      ...prev,
      [newId]: newTextBox.defaultText,
    }));
  };

  const deleteTextBox = (id) => {
    setTextPositions((prev) => prev.filter((pos) => pos.id !== id));
    setTextValues((prev) => {
      const newValues = { ...prev };
      delete newValues[id];
      return newValues;
    });
    setActiveInput(null);
  };

  const handleExport = async () => {
    try {
      const container = document.getElementById("template-container");

      // 创建临时容器用于导出
      const tempContainer = container.cloneNode(true);
      tempContainer.style.position = "absolute";
      tempContainer.style.left = "-9999px";
      tempContainer.style.width = `${template.width}px`;
      tempContainer.style.height = `${template.height}px`;
      document.body.appendChild(tempContainer);

      const canvas = await html2canvas(tempContainer, {
        useCORS: true,
        backgroundColor: null,
        scale: 1,
        logging: false,
        width: template.width,
        height: template.height,
      });

      // 清理临时容器
      document.body.removeChild(tempContainer);

      // 导出为图片
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `${template.name}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("导出失败:", error);
      alert("导出失败，请稍后重试");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">{template.name}生成器</h2>
          <button onClick={addNewTextBox} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
            添加文本框
          </button>
        </div>

        <div
          id="template-container"
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
          <svg
            ref={svgRef}
            className="absolute top-0 left-0 w-full h-full"
            viewBox={`0 0 ${template.width} ${template.height}`}
            preserveAspectRatio="xMidYMid meet"
            onMouseMove={(e) => draggedElement && handleDrag(e)}
            onMouseUp={(e) => draggedElement && handleDragEnd(e, draggedElement)}
            onMouseLeave={(e) => draggedElement && handleDragEnd(e, draggedElement)}
          >
            {textPositions.map((position) => (
              <g key={position.id}>
                <text
                  x={position.x}
                  y={position.y}
                  fontSize={position.fontSize}
                  fontFamily={position.fontFamily}
                  fill={position.color}
                  textAnchor={position.textAnchor}
                  dominantBaseline="middle"
                  cursor="move"
                  onMouseDown={(e) => handleDragStart(e, position.id)}
                  onClick={(e) => handleTextClick(e, position.id)}
                  className={activeInput === position.id ? "outline-text" : ""}
                >
                  {textValues[position.id] || position.defaultText || ""}
                </text>
              </g>
            ))}
          </svg>

          {/* 编辑界面 */}
          {activeInput && (
            <div
              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                         bg-white p-4 rounded-lg shadow-lg z-50 min-w-[300px]"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">编辑文本</h3>
                <button
                  onClick={() => deleteTextBox(activeInput)}
                  className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  删除
                </button>
              </div>
              <input
                type="text"
                value={textValues[activeInput] || ""}
                onChange={(e) => {
                  setTextValues((prev) => ({
                    ...prev,
                    [activeInput]: e.target.value,
                  }));
                }}
                className="border p-2 mb-4 w-full rounded"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setActiveInput(null)}
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                >
                  关闭
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <button onClick={handleExport} className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
          导出图片
        </button>
      </div>
    </div>
  );
}
