"use client";

import React, { useState, useRef, useEffect } from 'react';
import shapeTargets from './shapeTargets';
import { useI18n } from "@/app/i18n/client";

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

// 原始尺寸的七巧板形状（用于右侧预览区域，已缩小适配306x306视口）
const originalShapes = [
  {
    id: 'big-tri-1',
    color: '#0f82f2', // 蓝色
    path: 'M-65.36,-32.68L0,32.68L65.36,-32.68Z',
    initialTransform: 'translate(65.36 32.68)'
  },
  {
    id: 'big-tri-2',
    color: '#cd0e66', // 品红色
    path: 'M-65.36,-32.68L0,32.68L65.36,-32.68Z',
    initialTransform: 'translate(32.68 65.36) rotate(270)'
  },
  {
    id: 'medium-tri',
    color: '#009ea6', // 青色
    path: 'M0,-16.34L32.68,16.34L-32.68,16.34Z',
    initialTransform: 'translate(65.36 81.7)'
  },
  {
    id: 'small-tri-1',
    color: '#eb4726', // 橙红色
    path: 'M0,-16.34L32.68,16.34L-32.68,16.34Z',
    initialTransform: 'translate(114.38 32.68) rotate(270)'
  },
  {
    id: 'small-tri-2',
    color: '#6d3bbf', // 紫色
    path: 'M-32.68,-32.68L32.68,-32.68L32.68,32.68Z',
    initialTransform: 'translate(98.04 98.04) rotate(90)'
  },
  {
    id: 'square',
    color: '#22ab24', // 绿色
    path: 'M-32.68,0L0,-32.68L32.68,0L0,32.68Z',
    initialTransform: 'translate(98.04 65.36)'
  },
  {
    id: 'parallelogram',
    color: '#fd8c00', // 橙色
    path: 'M-49.02,16.34L16.34,16.34L49.02,-16.34L-16.34,-16.34Z',
    initialTransform: 'translate(49.02 114.38)'
  }
];

const TangramGame = ({ lang = 'en' }) => {
  const { t, dictionary } = useI18n();
  const loanDict = dictionary.tangram || {};
  const tTrangram = (key, params = {}) => {
    let text = loanDict[key] || key;
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        text = text.replace(`{${key}}`, value);
      });
    }
    return text;
  };
 
  const [activePiece, setActivePiece] = useState(null);
  const [selectedPieces, setSelectedPieces] = useState([]);  // 存储多选的片段ID
  const [isShiftPressed, setIsShiftPressed] = useState(false);  // 跟踪Shift键是否按下

  const [showLeftArrow, setShowLeftArrow] = useState(false); // 添加左箭头显示状态
  const [showRightArrow, setShowRightArrow] = useState(true); // 添加右箭头显示状态
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

  const [selectedTarget, setSelectedTarget] = useState(null); // Track selected target shape

  // 处理从右侧七巧板区域开始拖拽
  const handlePaletteMouseDown = (e, pieceId) => {
    // 如果形状已经被拖走，不允许再次拖拽
    if (draggedShapes[pieceId]) return;

    e.stopPropagation();
    e.preventDefault();

    // 选中片段但不添加到画布
    if (e.shiftKey) {
      // 不改变当前选择状态
    } else {
      // 清除之前的选择
      setSelectedPieces([]);
    }

    setActivePiece(pieceId);

    // 获取SVG坐标系中的鼠标位置
    const svg = paletteRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());

    // 找到原始片段用于拖拽预览（使用原始大小的形状）
    const origPiece = originalShapes.find(p => p.id === pieceId);
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

    // 检查是否按下Shift键进行多选
    if (e.shiftKey) {
      // 如果已经选中，则取消选中
      if (selectedPieces.includes(pieceId)) {
        // 使用函数式更新确保状态更新正确
        const newSelectedPieces = selectedPieces.filter(id => id !== pieceId);
        setSelectedPieces(newSelectedPieces);

        // 如果取消选中的是当前活动片段，则需要更新活动片段
        if (activePiece === pieceId) {
          setActivePiece(newSelectedPieces.length > 0 ? newSelectedPieces[0] : null);
        }
      } else {
        // 如果尚未选中，则添加到选中列表
        setSelectedPieces([...selectedPieces, pieceId]);
        // 同时设置为活动片段，以便可以拖动
        setActivePiece(pieceId);
      }
    } else {
      // 如果没有按下Shift键
      if (!selectedPieces.includes(pieceId)) {
        // 如果点击的片段不在选中列表中，则清除之前的选择并选中当前片段
        setSelectedPieces([pieceId]);
        setActivePiece(pieceId);
      } else {
        // 如果点击的是已选中的片段之一，只更新活动片段，不清除选择
        setActivePiece(pieceId);
      }
    }
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
          // 移动活动片段和所有选中的片段
          if (piece.id === activePiece || selectedPieces.includes(piece.id)) {
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
      // 不是拖拽结束时，保留当前选择状态
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

        // 找到原始片段（使用原始大小的形状）
        const origPiece = originalShapes.find(p => p.id === activePiece);
        if (origPiece) {
          // 获取原始片段的旋转信息
          const { rotate } = extractTransformParams(origPiece.initialTransform);

          // 创建新片段，初始位置在鼠标位置，保持原始朝向和大小
          const newPiece = {
            ...origPiece,
            id: `${origPiece.id}-${Date.now()}`, // 生成唯一ID
            transform: `translate(${svgP.x} ${svgP.y}) ${rotate.angle !== 0 ? `rotate(${rotate.angle})` : ''}` // 保持原始旋转
          };

          // 添加到画板
          setCanvasPieces(prevPieces => [...prevPieces, newPiece]);

          // 标记形状已被拖走
          setDraggedShapes(prev => ({ ...prev, [activePiece]: true }));

          // 是否按下了shift键
          if (e.shiftKey) {
            // 如果按下了shift键，添加到选中列表
            setSelectedPieces(prev => [...prev, newPiece.id]);
          } else {
            // 否则清除之前的选择并设置当前片段为选中状态
            setSelectedPieces([newPiece.id]);
          }

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
    const distance = 50;
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

      const snapAngles = [0, 45, 90, 135, 180, 225, 270, 315, 360];
      const snapThreshold = 10;

      // Normalize the angle to the 0-360 range
      while (newAngle < 0) newAngle += 360;
      newAngle = newAngle % 360;

      // Check if it needs to snap to a certain angle
      let isSnapped = false;
      let snappedAngle = null;

      for (const snapAngle of snapAngles) {
        // Calculate the difference between the current angle and the snap angle
        const diff = Math.abs(newAngle - snapAngle);
        // If the difference is less than the threshold, snap to that angle
        if (diff < snapThreshold || 360 - diff < snapThreshold) {
          newAngle = snapAngle;
          isSnapped = true;
          snappedAngle = snapAngle;
          break;
        }
      }

      // Change 360 to 0 to keep consistency
      if (newAngle === 360) newAngle = 0;

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
    e.preventDefault(); // 防止事件冒泡和默认行为

    // 避免重复点击处理 - 因为mousedown已经处理了选择逻辑
    // 此处只作为备用
  };

  // 翻转片段
  const handleFlip = () => {
    if (!activePiece && selectedPieces.length === 0) return;

    setCanvasPieces(prevPieces => {
      return prevPieces.map(piece => {
        // 如果是当前活动片段或者在多选列表中的片段，则一起翻转
        if (piece.id === activePiece || selectedPieces.includes(piece.id)) {
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
    setSelectedPieces([]);  // 清空多选列表
    // 重置拖走状态，所有形状都可以再次拖拽
    setDraggedShapes({});
    // 可选：清除选中的目标形状
    // setSelectedTarget(null);
  };

  // 添加全局键盘事件监听Shift键的按下状态
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 跟踪Shift键的按下状态
      if (e.key === 'Shift' && !isShiftPressed) {
        setIsShiftPressed(true);
      }

      // Ctrl+A 或 Command+A 全选
      if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const allIds = canvasPieces.map(p => p.id);
        setSelectedPieces(allIds);
        if (allIds.length > 0) {
          setActivePiece(allIds[0]);
        }
      }
    };

    const handleKeyUp = (e) => {
      // 跟踪Shift键的释放状态
      if (e.key === 'Shift') {
        setIsShiftPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [canvasPieces, isShiftPressed]);

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

  // Handle target shape selection
  const handleTargetSelect = (target) => {
    setSelectedTarget(target);
  };

  // 添加滚动处理函数
  const handleScroll = (direction) => {
    const container = document.querySelector('.target-shapes-container');
    if (!container) return;

    const scrollAmount = 200; // 每次滚动的距离
    const newPosition = direction === 'left' 
      ? container.scrollLeft - scrollAmount 
      : container.scrollLeft + scrollAmount;

    container.scrollTo({
      left: newPosition,
      behavior: 'smooth'
    });

    // 更新箭头显示状态
    setTimeout(() => {
      setShowLeftArrow(container.scrollLeft > 0);
      setShowRightArrow(
        container.scrollLeft < container.scrollWidth - container.clientWidth
      );
    }, 300);
  };

  // 添加滚动监听
  useEffect(() => {
    const container = document.querySelector('.target-shapes-container');
    if (!container) return;

    const handleScroll = () => {
      setShowLeftArrow(container.scrollLeft > 0);
      setShowRightArrow(
        container.scrollLeft < container.scrollWidth - container.clientWidth
      );
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

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
                setSelectedPieces([]);  // 点击空白区域时清除多选
              }}
            >
              {/* 网格背景 */}
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e0e0e0" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="640" height="360" fill="url(#grid)" />

              {/* Target shape (if selected) */}
              {selectedTarget && (
                <g
                  className="target-shape"
                  // Center the target shape directly in the middle of the canvas
                  transform={selectedTarget.viewBox === '0 0 306 306'
                    ? `translate(${320 - (153)} ${180 - (153)}) `
                    : `translate(${320} ${180})`}
                >
                  <path
                    d={selectedTarget.svgPath}
                    fill="#e0e0e0"
                    opacity="0.5"
                    stroke="#666666"
                    strokeWidth="1"
                    // Add transform for non-standard viewBox to center the shape properly
                    transform={selectedTarget.viewBox !== '0 0 306 306'
                      ? `translate(${-selectedTarget.viewBox.split(' ')[2] / 2} ${-selectedTarget.viewBox.split(' ')[3] / 2})`
                      : ''}
                  />
                </g>
              )}

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
                  const isSelected = selectedPieces.includes(piece.id);
                  return (
                    <g
                      key={piece.id}
                      className={`tile ${isActive ? 'active' : ''} ${isSelected ? 'selected' : ''}`}
                      transform={piece.transform}
                      onMouseDown={(e) => handleCanvasMouseDown(e, piece.id)}
                      onClick={(e) => handlePieceClick(e, piece.id)}
                    >
                      <path
                        className="polygon-tile"
                        fill={piece.color}
                        d={piece.path}
                        stroke={isActive || isSelected ? "#000" : "none"}
                        strokeWidth={isActive || isSelected ? "1.5" : "0"}
                        strokeDasharray={isSelected && !isActive ? "3,3" : "none"}
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

          {/* 目标形状选择区域 */}
          <div className="mt-4 w-full relative">
            <h4 className="font-medium text-gray-700 mb-2">{tTrangram('select_target_shape')}</h4>
            <div className="relative">
              {showLeftArrow && (
                <button
                  onClick={() => handleScroll('left')}
                  className="absolute left-0 top-0 z-10 flex items-center justify-center w-12 h-[120px] bg-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] mt-2"
                >
                  <svg viewBox="0 0 24 24" className="w-8 h-8 text-gray-600 hover:text-gray-900">
                    <path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                  </svg>
                </button>
              )}
              
              {/* 右箭头 */}
              {showRightArrow && (
                <button
                  onClick={() => handleScroll('right')}
                  className="absolute right-0 top-0 z-10 flex items-center justify-center w-12 h-[120px] bg-gray-200 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] mt-2"
                >
                  <svg viewBox="0 0 24 24" className="w-8 h-8 text-gray-600 hover:text-gray-900">
                    <path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                  </svg>
                </button>
              )}

              <div className="target-shapes-container flex overflow-x-auto p-2 space-x-3 pb-3 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
                {/* 空选项 - 不选择任何目标 */}
                <div
                  className={`target-tile flex flex-col items-center cursor-pointer ${selectedTarget === null ? 'border-2 border-blue-500' : 'border border-gray-300'} p-2 rounded-lg bg-white flex-shrink-0`}
                  onClick={() => handleTargetSelect(null)}
                >
                  <div className="w-20 h-20 flex items-center justify-center border border-dashed border-gray-400">
                    <span className="text-gray-500">{tTrangram('no_target')}</span>
                  </div>
                  <span className="mt-1 text-xs text-center">{tTrangram('free_creation')}</span>
                </div>

                {/* 目标形状选项 */}
                {shapeTargets.map(target => (
                  <div
                    key={target.id}
                    className={`target-tile flex-shrink-0 flex flex-col items-center cursor-pointer ${selectedTarget?.id === target.id ? 'border-2 border-blue-500' : 'border border-gray-300'} p-2 rounded-lg bg-white`}
                    onClick={() => handleTargetSelect(target)}
                  >
                    <div className="w-20 h-20 flex items-center justify-center">
                      <svg
                        width="88"
                        height="88"
                        viewBox={target.viewBox}
                      >
                        <path d={target.svgPath} fill="#333" />
                      </svg>
                    </div>
                    <span className="mt-1 text-xs text-center">{target.name[lang] || target.name.en}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 添加多选信息和提示 */}
          <div className="mt-2 text-sm text-gray-600">
            <p>
              {tTrangram('multi_select_hint')}
              {isShiftPressed ? tTrangram('shift_pressed') : ''}
              {tTrangram('selected_count', { count: selectedPieces.length })}
            </p>
          </div>
        </div>

        {/* 侧边控制区 - 大屏幕下占1/5宽度 */}
        <div className="lg:w-1/5 order-1 lg:order-2 p-4 flex flex-col gap-4">
          <h3 className="font-bold text-lg mb-4">{tTrangram('toolbox_title')}</h3>

          {/* 七巧板组件区域 */}
          <div className="bg-white">
            <svg
              ref={paletteRef}
              viewBox="0 0 130 130"
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
              onClick={handleClear}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5">
                <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" fill="currentColor" />
              </svg>
              {t('restart')}
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
