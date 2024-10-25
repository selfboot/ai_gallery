"use client";

export default function CubeControls({ disabled }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="col-span-3 text-center font-bold mb-2">魔方控制</div>
      
      {/* 上层控制 */}
      <div className="col-span-3 grid grid-cols-3 gap-2">
        <button className="p-2 bg-gray-200 rounded" disabled={disabled}>←</button>
        <button className="p-2 bg-gray-200 rounded" disabled={disabled}>U</button>
        <button className="p-2 bg-gray-200 rounded" disabled={disabled}>→</button>
      </div>
      
      {/* 中层控制 */}
      <div className="col-span-3 grid grid-cols-3 gap-2">
        <button className="p-2 bg-gray-200 rounded" disabled={disabled}>L</button>
        <button className="p-2 bg-gray-200 rounded" disabled={disabled}>F</button>
        <button className="p-2 bg-gray-200 rounded" disabled={disabled}>R</button>
      </div>
      
      {/* 下层控制 */}
      <div className="col-span-3 grid grid-cols-3 gap-2">
        <button className="p-2 bg-gray-200 rounded" disabled={disabled}>B</button>
        <button className="p-2 bg-gray-200 rounded" disabled={disabled}>D</button>
        <button className="p-2 bg-gray-200 rounded" disabled={disabled}>B'</button>
      </div>
    </div>
  );
}
