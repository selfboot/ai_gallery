"use client";

import React, { useState, useRef, useEffect } from 'react';

// 提取变换矩阵的参数
function extractTransformParams(transformString) {
  const translate = { x: 0, y: 0 };
  const rotate = { angle: 0, x: 0, y: 0 };

  if (!transformString) return { translate, rotate };

  // 提取translate值
  const translateMatch = transformString.match(/translate\((-?\d+\.?\d*)\s+(-?\d+\.?\d*)\)/);
  if (translateMatch) {
    translate.x = parseFloat(translateMatch[1]);
    translate.y = parseFloat(translateMatch[2]);
  }

  // 提取rotate值
  const rotateMatch = transformString.match(/rotate\((-?\d+\.?\d*)(?:\s+(-?\d+\.?\d*)\s+(-?\d+\.?\d*))?\)/);
  if (rotateMatch) {
    rotate.angle = parseFloat(rotateMatch[1]);
    if (rotateMatch[2] && rotateMatch[3]) {
      rotate.x = parseFloat(rotateMatch[2]);
      rotate.y = parseFloat(rotateMatch[3]);
    }
  }

  return { translate, rotate };
}

// 生成新的变换字符串
function generateTransform(translate, rotate) {
  let transform = `translate(${translate.x} ${translate.y})`;
  if (rotate.angle !== 0) {
    transform += ` rotate(${rotate.angle})`;
  }
  return transform;
}

// 定义七巧板的基本形状 - 缩放因子仅用于画布区域
// 七巧板整体边长为200单位，画布为400单位，所以设置为60%大小
const CANVAS_SIZE = 400;
const SCALE_FACTOR = CANVAS_SIZE * 0.3; // 缩放因子，使七巧板占画布60%

// 原始尺寸的七巧板形状（用于右侧预览区域）
const originalShapes = [
  {
    id: 'big-tri-1',
    name: '大三角形1',
    color: '#0f82f2', // 蓝色
    path: 'M-100,-50L0,50L100,-50Z',
    initialTransform: 'translate(100 50)'
  },
  {
    id: 'big-tri-2',
    name: '大三角形2',
    color: '#cd0e66', // 品红色
    path: 'M-100,-50L0,50L100,-50Z',
    initialTransform: 'translate(50 100) rotate(270)'
  },
  {
    id: 'medium-tri',
    name: '中三角形',
    color: '#009ea6', // 青色
    path: 'M0,-25L50,25L-50,25Z',
    initialTransform: 'translate(100 125)'
  },
  {
    id: 'small-tri-1',
    name: '小三角形1',
    color: '#eb4726', // 橙红色
    path: 'M0,-25L50,25L-50,25Z',
    initialTransform: 'translate(175 50) rotate(270)'
  },
  {
    id: 'small-tri-2',
    name: '小三角形2',
    color: '#6d3bbf', // 紫色
    path: 'M-50,-50L50,-50L50,50Z',
    initialTransform: 'translate(150 150) rotate(90)'
  },
  {
    id: 'square',
    name: '正方形',
    color: '#22ab24', // 绿色
    path: 'M-50,0L0,-50L50,0L0,50Z',
    initialTransform: 'translate(150 100)'
  },
  {
    id: 'parallelogram',
    name: '平行四边形',
    color: '#fd8c00', // 橙色
    path: 'M-75,25L25,25L75,-25L-25,-25Z',
    initialTransform: 'translate(75 175)'
  }
];

// 缩放后的七巧板形状（用于左侧画布区域和拖拽）
const tangramShapes = originalShapes.map(shape => {
  // 缩放路径 - 原始七巧板总宽度约为200单位，需要缩放到占画布的60%
  const scaleFactor = SCALE_FACTOR / 200;

  // 缩放路径
  const scaledPath = shape.path.replace(/-?\d+\.?\d*/g, match => {
    const num = parseFloat(match);
    return (num * scaleFactor).toString();
  });

  // 提取原始变换中的平移和旋转信息
  const transformInfo = extractTransformParams(shape.initialTransform);

  // 缩放平移参数
  const scaledTranslate = {
    x: transformInfo.translate.x * scaleFactor,
    y: transformInfo.translate.y * scaleFactor
  };

  // 生成新的变换字符串，保持旋转角度不变
  const newTransform = generateTransform(scaledTranslate, transformInfo.rotate);

  return {
    ...shape,
    path: scaledPath,
    initialTransform: newTransform,
    originalTransform: shape.initialTransform, // 保存原始变换
    scaleFactor: scaleFactor  // 存储缩放因子以便后续参考
  };
});

const TangramGame = () => {
  // 状态变量
  const [activePiece, setActivePiece] = useState(null);
  const [dragInfo, setDragInfo] = useState({
    isDragging: false,
    startX: 0,
    startY: 0,
    startClientX: 0,  // 用于跟踪鼠标在客户端坐标系中的初始位置
    startClientY: 0,
    sourceArea: null,
    currentX: 0,  // 当前鼠标X位置 - 用于拖拽预览
    currentY: 0   // 当前鼠标Y位置 - 用于拖拽预览
  });
  const [dragPreview, setDragPreview] = useState(null);

  // 画板上的片段（从右侧拖过来的）
  const [canvasPieces, setCanvasPieces] = useState([]);

  // 跟踪哪些形状已经被拖走
  const [draggedShapes, setDraggedShapes] = useState({});

  // Refs
  const canvasRef = useRef(null);
  const paletteRef = useRef(null);

  // 处理从右侧七巧板区域开始拖拽
  const handlePaletteMouseDown = (e, pieceId) => {
    // 如果形状已经被拖走，不允许再次拖拽
    if (draggedShapes[pieceId]) return;
    
    e.stopPropagation();
    e.preventDefault();
    
    // 选中片段但不添加到画布
    setActivePiece(pieceId);
    
    // 获取SVG坐标系中的鼠标位置
    const svg = paletteRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
    
    // 找到原始片段用于拖拽预览（使用缩放后的形状）
    const origPiece = tangramShapes.find(p => p.id === pieceId);
    if (origPiece) {
      // 保存原始变换信息到拖拽预览中
      const { translate, rotate } = extractTransformParams(origPiece.initialTransform);
      
      setDragPreview({
        ...origPiece,
        initialTransform: origPiece.initialTransform,
        transformInfo: { translate, rotate }
      });
    }
    
    // 保存拖拽开始信息，包括客户端坐标位置
    setDragInfo({
      isDragging: true,
      startX: svgP.x,
      startY: svgP.y,
      startClientX: e.clientX,
      startClientY: e.clientY,
      currentX: 0,
      currentY: 0,
      sourceArea: 'palette', // 标记是从调色板开始拖拽
      isOverCanvas: false    // 标记是否在画布区域上
    });
  };

  // 处理从画板区域开始拖拽
  const handleCanvasMouseDown = (e, pieceId) => {
    e.stopPropagation();
    e.preventDefault();

    // 选中片段并自动显示旋转控制器
    setActivePiece(pieceId);

    // 获取SVG坐标系中的鼠标位置
    const svg = canvasRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());

    // 保存拖拽开始信息
    setDragInfo({
      isDragging: true,
      startX: svgP.x,
      startY: svgP.y,
      startClientX: e.clientX,
      startClientY: e.clientY,
      currentX: svgP.x,
      currentY: svgP.y,
      sourceArea: 'canvas' // 标记是从画板开始拖拽
    });
  };

  // 处理画板区域的鼠标移动（拖拽）
  const handleCanvasMouseMove = (e) => {
    if (!dragInfo.isDragging) return;

    // 获取SVG坐标系中的鼠标位置
    const svg = canvasRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());

    // 更新鼠标当前位置（用于拖拽预览）
    setDragInfo(prev => ({
      ...prev,
      currentX: svgP.x,
      currentY: svgP.y
    }));

    if (dragInfo.sourceArea === 'canvas' && activePiece) {
      // 计算移动的距离
      const dx = svgP.x - dragInfo.startX;
      const dy = svgP.y - dragInfo.startY;

      // 如果是从画板区域拖拽的，则移动画板中的片段
      setCanvasPieces(prevPieces => {
        return prevPieces.map(piece => {
          if (piece.id === activePiece) {
            // 获取当前的变换参数
            const { translate, rotate } = extractTransformParams(piece.transform);

            // 更新位置
            translate.x += dx;
            translate.y += dy;

            // 生成新的变换字符串
            const newTransform = generateTransform(translate, rotate);

            return { ...piece, transform: newTransform };
          }
          return piece;
        });
      });

      // 更新拖拽开始位置
      setDragInfo(prev => ({
        ...prev,
        startX: svgP.x,
        startY: svgP.y
      }));
    }
  };

  // 处理拖拽结束
  const handleMouseUp = (e) => {
    if (!dragInfo.isDragging) {
      setActivePiece(null);
      setDragPreview(null);
      setDragInfo({ isDragging: false, startX: 0, startY: 0, startClientX: 0, startClientY: 0, currentX: 0, currentY: 0, sourceArea: null });
      return;
    }

    if (dragInfo.sourceArea === 'palette') {
      // 如果是从调色板区域拖拽的，则在画板上添加一个新片段

      // 获取鼠标在画板上的位置
      const canvas = canvasRef.current;
      const pt = canvas.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;

      // 检查鼠标是否在画板区域内
      const rect = canvas.getBoundingClientRect();
      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        // 将鼠标位置转换为SVG坐标
        const svgP = pt.matrixTransform(canvas.getScreenCTM().inverse());

        // 找到原始片段
        const origPiece = tangramShapes.find(p => p.id === activePiece);
        if (origPiece) {
          // 获取原始片段的旋转信息
          const { rotate } = extractTransformParams(origPiece.initialTransform);

          // 创建新片段，初始位置在鼠标位置，保持原始朝向
          const newPiece = {
            ...origPiece,
            id: `${origPiece.id}-${Date.now()}`, // 生成唯一ID
            transform: `translate(${svgP.x} ${svgP.y}) ${rotate.angle !== 0 ? `rotate(${rotate.angle})` : ''}` // 保持原始旋转
          };

          // 添加到画板
          setCanvasPieces(prevPieces => [...prevPieces, newPiece]);

          // 标记形状已被拖走
          setDraggedShapes(prev => ({ ...prev, [activePiece]: true }));

          // 选中新添加的片段
          setActivePiece(newPiece.id);
        }
      }
    }

    // 重置拖拽预览
    setDragPreview(null);

    // 重置拖拽状态
    setDragInfo({ isDragging: false, startX: 0, startY: 0, startClientX: 0, startClientY: 0, currentX: 0, currentY: 0, sourceArea: null });
  };

  // 计算旋转控制器的位置
  const getRotatorPosition = () => {
    if (!activePiece) return null;

    const piece = canvasPieces.find(p => p.id === activePiece);
    if (!piece) return null;

    const { translate, rotate } = extractTransformParams(piece.transform);

    // 计算旋转控制器的位置
    const distance = 40;
    const angle = rotate.angle * Math.PI / 180;

    return {
      x: translate.x + distance * Math.sin(angle),
      y: translate.y - distance * Math.cos(angle)
    };
  };

  // 处理旋转
  const handleRotation = (e) => {
    if (!activePiece) return;

    e.stopPropagation();
    e.preventDefault();

    // 获取当前片段
    const piece = canvasPieces.find(p => p.id === activePiece);
    if (!piece) return;

    // 获取SVG坐标系中的鼠标位置
    const svg = canvasRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());

    // 获取当前的变换参数
    const { translate } = extractTransformParams(piece.transform);

    // 计算旋转角度 - 基于从中心点到鼠标的角度
    const dx = svgP.x - translate.x;
    const dy = svgP.y - translate.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    // 更新片段旋转
    setCanvasPieces(prevPieces => {
      return prevPieces.map(p => {
        if (p.id === activePiece) {
          const newTransform = `translate(${translate.x} ${translate.y}) rotate(${angle})`;
          return { ...p, transform: newTransform };
        }
        return p;
      });
    });
  };

  // 处理旋转控制器鼠标按下
  const handleRotatorMouseDown = (e) => {
    e.stopPropagation();
    e.preventDefault();

    // 获取当前片段
    const piece = canvasPieces.find(p => p.id === activePiece);
    if (!piece) return;

    // 获取当前的变换参数
    const { translate, rotate } = extractTransformParams(piece.transform);

    // 获取SVG坐标系中的鼠标位置
    const svg = canvasRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());

    // 计算初始鼠标角度 - 以形状中心为原点
    const startDx = svgP.x - translate.x;
    const startDy = svgP.y - translate.y;
    const startAngle = Math.atan2(startDy, startDx) * (180 / Math.PI);

    // 记录片段当前的旋转角度
    const initialRotation = rotate.angle;

    // 添加移动事件监听器
    const handleMouseMove = (e) => {
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());

      // 计算当前鼠标角度
      const dx = svgP.x - translate.x;
      const dy = svgP.y - translate.y;
      const currentAngle = Math.atan2(dy, dx) * (180 / Math.PI);

      // 计算角度差值
      let angleDiff = currentAngle - startAngle;

      // 计算新的旋转角度 - 原始角度加上鼠标角度的变化
      let newAngle = initialRotation + angleDiff;

      // 更新片段旋转
      setCanvasPieces(prevPieces => {
        return prevPieces.map(p => {
          if (p.id === activePiece) {
            const newTransform = `translate(${translate.x} ${translate.y}) rotate(${newAngle})`;
            return { ...p, transform: newTransform };
          }
          return p;
        });
      });
    };

    // 添加鼠标松开事件监听器
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // 处理片段点击
  const handlePieceClick = (e, pieceId) => {
    e.stopPropagation();
    setActivePiece(pieceId);
  };

  // 翻转片段
  const handleFlip = () => {
    if (!activePiece) return;

    setCanvasPieces(prevPieces => {
      return prevPieces.map(piece => {
        if (piece.id === activePiece) {
          // 获取当前的变换参数
          const { translate, rotate } = extractTransformParams(piece.transform);

          // 创建包含水平翻转的新变换
          const scaleValue = piece.flipped ? 1 : -1;
          const newTransform = `translate(${translate.x} ${translate.y}) rotate(${rotate.angle}) scale(${scaleValue}, 1)`;

          return {
            ...piece,
            transform: newTransform,
            flipped: !piece.flipped
          };
        }
        return piece;
      });
    });
  };

  // 清空画板
  const handleClear = () => {
    setCanvasPieces([]);
    setActivePiece(null);
    // 重置拖走状态，所有形状都可以再次拖拽
    setDraggedShapes({});
  };

  // 添加绑定全局事件
  useEffect(() => {
    const handleGlobalMouseUp = (e) => {
      if (dragInfo.isDragging) {
        handleMouseUp(e);
      }
    };
    
    const handleGlobalMouseMove = (e) => {
      if (dragInfo.isDragging && dragInfo.sourceArea === 'palette') {
        // 从调色板区域拖拽到画布区域时，保持预览图形的移动方向与鼠标一致
        const canvas = canvasRef.current;
        if (canvas) {
          const pt = canvas.createSVGPoint();
          pt.x = e.clientX;
          pt.y = e.clientY;
          
          // 检查鼠标是否在画布范围内
          const rect = canvas.getBoundingClientRect();
          const isOverCanvas = 
            e.clientX >= rect.left && 
            e.clientX <= rect.right && 
            e.clientY >= rect.top && 
            e.clientY <= rect.bottom;
          
          if (isOverCanvas) {
            const svgP = pt.matrixTransform(canvas.getScreenCTM().inverse());
            
            // 更新鼠标当前位置（用于拖拽预览）和画布状态
            setDragInfo(prev => ({
              ...prev,
              currentX: svgP.x,
              currentY: svgP.y,
              isOverCanvas: true
            }));
          } else {
            // 不在画布上，但仍然更新状态
            setDragInfo(prev => ({
              ...prev,
              isOverCanvas: false
            }));
          }
        }
      }
    };
    
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('mousemove', handleGlobalMouseMove);
    
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [dragInfo.isDragging, dragInfo.sourceArea]);

  return (
    <div className="container mx-auto">
      <div className="lg:flex lg:items-start lg:space-x-8">
        {/* 画板区域 - 大屏幕下占4/5宽度 */}
        <div className="lg:w-4/5 flex flex-col items-center">
          <div className="text-center mb-4">
            {/* 可以添加标题或状态信息 */}
          </div>
          <div className="w-full relative border-2 border-gray-300 rounded-lg p-2 bg-gray-50" style={{ aspectRatio: '16/9' }}>
            <svg
              ref={canvasRef}
              viewBox="0 0 640 360"
              className="w-full h-full"
              onMouseMove={handleCanvasMouseMove}
              onClick={() => {
                setActivePiece(null);
              }}
            >
              {/* 网格背景 */}
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e0e0e0" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="640" height="360" fill="url(#grid)" />

              {/* 拖拽预览 */}
              {dragPreview && dragInfo.isDragging && dragInfo.sourceArea === 'palette' && dragInfo.isOverCanvas && (
                <g 
                  className="tile preview"
                  transform={`translate(${dragInfo.currentX} ${dragInfo.currentY}) ${dragPreview.transformInfo && dragPreview.transformInfo.rotate.angle !== 0 ? `rotate(${dragPreview.transformInfo.rotate.angle})` : ''}`}
                  style={{ opacity: 0.6 }}
                >
                  <path 
                    fill={dragPreview.color} 
                    d={dragPreview.path} 
                    stroke="white"
                    strokeWidth="0.5"
                    strokeDasharray="5,5"
                  />
                </g>
              )}

              {/* 画板上的片段 */}
              <g className="tiles">
                {canvasPieces.map((piece) => {
                  const isActive = activePiece === piece.id;
                  return (
                    <g
                      key={piece.id}
                      className={`tile ${isActive ? 'active' : ''}`}
                      transform={piece.transform}
                      onMouseDown={(e) => handleCanvasMouseDown(e, piece.id)}
                      onClick={(e) => handlePieceClick(e, piece.id)}
                    >
                      <path
                        className="polygon-tile"
                        fill={piece.color}
                        d={piece.path}
                        stroke={isActive ? "#000" : "none"}
                        strokeWidth={isActive ? "1.5" : "0"}
                      />
                    </g>
                  );
                })}
              </g>

              {/* 旋转控制器 - 单独渲染确保在所有形状上方 */}
              {activePiece && (() => {
                const rotatorPosition = getRotatorPosition();
                if (!rotatorPosition) return null;

                const piece = canvasPieces.find(p => p.id === activePiece);
                if (!piece) return null;

                const { translate } = extractTransformParams(piece.transform);

                return (
                  <g className="rotator">
                    {/* 连接线 */}
                    <line
                      x1={translate.x}
                      y1={translate.y}
                      x2={rotatorPosition.x}
                      y2={rotatorPosition.y}
                      stroke="#000"
                      strokeWidth="1"
                      strokeDasharray="2,2"
                    />

                    {/* 控制点 */}
                    <circle
                      cx={rotatorPosition.x}
                      cy={rotatorPosition.y}
                      r="6"
                      fill="#000"
                      stroke="#fff"
                      strokeWidth="1.5"
                      style={{ cursor: 'grab' }}
                      onMouseDown={handleRotatorMouseDown}
                    />
                  </g>
                );
              })()}
            </svg>
          </div>
        </div>

        {/* 侧边控制区 - 大屏幕下占1/5宽度 */}
        <div className="lg:w-1/5 order-1 lg:order-2 p-4 flex flex-col gap-4">
          <h3 className="font-bold text-lg mb-4">七巧板工具箱</h3>

          {/* 七巧板组件区域 */}
          <div className="bg-white">
            <svg
              ref={paletteRef}
              viewBox="0 0 200 200"
              className="w-full aspect-square"
            >
              {originalShapes.map((piece) => (
                <g
                  key={piece.id}
                  className={`tile ${draggedShapes[piece.id] ? 'opacity-50' : 'cursor-pointer'}`}
                  transform={piece.initialTransform}
                  onMouseDown={(e) => handlePaletteMouseDown(e, piece.id)}
                >
                  {draggedShapes[piece.id] ? (
                    <path
                      fill="none"
                      d={piece.path}
                      stroke="#999"
                      strokeWidth="1"
                      strokeDasharray="5,3"
                    />
                  ) : (
                    <path
                      fill={piece.color}
                      d={piece.path}
                      stroke="white"
                      strokeWidth="0.2"
                    />
                  )}
                </g>
              ))}
            </svg>
          </div>
          {/* 工具按钮区 */}
          <div className="flex gap-2 mb-4">
            <button
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              title="清空画板"
              onClick={handleClear}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5">
                <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" fill="currentColor" />
              </svg>
              重新开始
            </button>
          </div>

          {/* 使用说明 */}
          {/* <div className="mt-4 text-sm text-gray-600">
            <p>1. 从右侧拖拽图形到画板</p>
            <p>2. 点击图形可以选中，显示黑色边框</p>
            <p>3. 拖动黑色圆点可以360°旋转图形</p>
            <p>4. 使用翻转按钮可以水平翻转形状</p>
            <p>5. 清空按钮可重新开始</p>
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default TangramGame;

// Note: The points for each piece have been translated to start near origin (0,0) 
// for easier placement in a palette. The comments indicate original coordinates for reference.
// The layout is a simple horizontal row.
