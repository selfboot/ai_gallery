"use client";
import React, { useEffect, useRef, useState, memo, useCallback } from "react";
import { calculateMapId } from "../gameLogic";
import { Check } from "lucide-react";
import { useI18n } from "@/app/i18n/client";
import { CustomListbox } from "@/app/components/ListBox";

const CELL_SIZE = 6;
const STORAGE_KEY = "sokoban-progress";

const MapThumbnail = memo(({ mapData, completedInfo }) => {
  const { t } = useI18n();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);

  const rows = mapData.length;
  const cols = mapData[0].length;
  const width = cols * CELL_SIZE;
  const height = rows * CELL_SIZE;

  const isCompleted = completedInfo !== undefined;
  const completedDate = isCompleted ? new Date(completedInfo.completedAt) : null;
  const steps = isCompleted ? completedInfo.moves : null;

  const handleClick = useCallback(() => {
    const mapId = calculateMapId(mapData);
    const newUrl = new URL(window.location.pathname, window.location.origin);
    newUrl.pathname = newUrl.pathname.replace("/more", "");
    newUrl.searchParams.set("id", mapId);
    window.location.href = newUrl.toString();
  }, [mapData]);

  // To make the map fill the container
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const containerWidth = container.clientWidth - 32;
    const containerHeight = container.clientHeight - 48;

    const scaleX = containerWidth / width;
    const scaleY = containerHeight / height;
    const newScale = Math.min(scaleX, scaleY, 2);

    setScale(newScale);
  }, [width, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, width, height);

    mapData.forEach((row, y) => {
      row.forEach((cell, x) => {
        const posX = x * CELL_SIZE;
        const posY = y * CELL_SIZE;

        switch (cell) {
          case 0: // EMPTY
            // ctx.fillStyle = "#ffffff";
            break;
          case 1: // WALL
            ctx.fillStyle = "#2C282B";
            break;
          case 2: // FLOOR
            ctx.fillStyle = "#f5eedf";
            break;
          case 3: // TARGET
            ctx.fillStyle = "#ff6b6b";
            break;
          case 4: // BOX
            ctx.fillStyle = "#556589";
            break;
          case 5: // BOX_ON_TARGET
            ctx.fillStyle = "#ff8787";
            break;
          case 6: // PLAYER
            ctx.fillStyle = "#4169E1";
            break;
          case 7: // PLAYER_ON_TARGET
            ctx.fillStyle = "#5c7cfa";
            break;
        }
        if (cell !== 0) {
          ctx.fillRect(posX, posY, CELL_SIZE, CELL_SIZE);
          ctx.strokeStyle = "#e9ecef";
          ctx.strokeRect(posX, posY, CELL_SIZE, CELL_SIZE);
        }
      });
    });
  }, [mapData, width, height]);

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      className={`flex flex-col items-center p-4 rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-all relative
        ${isCompleted ? "bg-green-50 border-green-200" : "bg-white border-gray-200"} border`}
      style={{
        width: "180px",
        height: "180px",
      }}
    >
      {isCompleted && (
        <div
          className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full w-6 h-6 
            flex items-center justify-center shadow-sm z-10"
        >
          <Check size={14} strokeWidth={3} />
        </div>
      )}

      <div className="flex-1 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="border border-gray-200"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "center",
          }}
        />
      </div>
      <div className="mt-2 text-sm text-gray-600 text-center">
        {!isCompleted && (
          <div>
            ({rows}x{cols})
          </div>
        )}
        {isCompleted && (
          <div className="mt-1 space-y-1">
            <div className="text-green-600">
              {t("best_record")}: {steps} {t("steps")}
            </div>
            <div className="text-xs text-gray-500">
              {t("completed_at")}: {completedDate.toLocaleDateString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

const FilterBar = memo(({ onFilterChange, completedLevels }) => {
  const { t } = useI18n();
  const [filters, setFilters] = useState({
    completion: t("all"),
    width: t("all"),
    height: t("all"),
    targets: t("all"),
  });

  const completionOptions = [t("all"), t("completed_levels"), t("uncompleted_levels")];
  const sizeOptions = [t("all"), "≤ 8", "9-12", "> 12"];
  const targetOptions = [t("all"), "1-3", "4-6", "≥ 7"];

  const getCompletionValue = useCallback(
    (option) => {
      switch (option) {
        case t("completed_levels"):
          return "completed";
        case t("uncompleted_levels"):
          return "uncompleted";
        default:
          return "all";
      }
    },
    [t]
  );

  const getSizeValue = useCallback((option) => {
    switch (option) {
      case "≤ 8":
        return "small";
      case "9-12":
        return "medium";
      case "> 12":
        return "large";
      default:
        return "all";
    }
  }, []);

  const getTargetValue = useCallback((option) => {
    switch (option) {
      case "1-3":
        return "1-3";
      case "4-6":
        return "4-6";
      case "≥ 7":
        return "7+";
      default:
        return "all";
    }
  }, []);

  const handleFilterChange = useCallback(
    (key, value) => {
      const newFilters = { ...filters, [key]: value };
      setFilters(newFilters);

      const filterValues = {
        completion: getCompletionValue(newFilters.completion),
        width: getSizeValue(newFilters.width),
        height: getSizeValue(newFilters.height),
        targets: getTargetValue(newFilters.targets),
      };

      onFilterChange(filterValues);
    },
    [filters, getCompletionValue, getSizeValue, getTargetValue, onFilterChange]
  );

  return (
    <div className="mb-6 relative z-50">
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <label className="font-medium text-gray-700 whitespace-nowrap">{t("completion_status")}:</label>
          <div className="w-32">
            <CustomListbox
              value={filters.completion}
              onChange={(value) => handleFilterChange("completion", value)}
              options={completionOptions}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="font-medium text-gray-700 whitespace-nowrap">{t("map_width")}:</label>
          <div className="w-32">
            <CustomListbox
              value={filters.width}
              onChange={(value) => handleFilterChange("width", value)}
              options={sizeOptions}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="font-medium text-gray-700 whitespace-nowrap">{t("map_height")}:</label>
          <div className="w-32">
            <CustomListbox
              value={filters.height}
              onChange={(value) => handleFilterChange("height", value)}
              options={sizeOptions}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="font-medium text-gray-700 whitespace-nowrap">{t("target_count")}:</label>
          <div className="w-32">
            <CustomListbox
              value={filters.targets}
              onChange={(value) => handleFilterChange("targets", value)}
              options={targetOptions}
              className="min-w-[150px]"
            />
          </div>
        </div>
      </div>
    </div>
  );
});

const SokobanGallery = ({ levels }) => {
  const containerRef = useRef(null);
  const [completedLevels, setCompletedLevels] = useState({});
  const [containerWidth, setContainerWidth] = useState(null);
  const [filteredLevels, setFilteredLevels] = useState(levels);

  useEffect(() => {
    const savedProgress = localStorage.getItem(STORAGE_KEY);
    if (savedProgress) {
      setCompletedLevels(JSON.parse(savedProgress));
    }

    if (containerRef.current) {
      setContainerWidth(containerRef.current.clientWidth);
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const handleFilter = useCallback(
    (filters) => {
      const filtered = levels.filter((mapData) => {
        const mapId = calculateMapId(mapData);
        const isCompleted = completedLevels[mapId] !== undefined;
        const rows = mapData.length;
        const cols = mapData[0].length;
        const targetCount = mapData.flat().filter((cell) => cell === 3 || cell === 7).length;

        if (filters.completion !== "all") {
          if (filters.completion === "completed" && !isCompleted) return false;
          if (filters.completion === "uncompleted" && isCompleted) return false;
        }

        if (filters.width !== "all") {
          if (filters.width === "small" && cols > 8) return false;
          if (filters.width === "medium" && (cols <= 8 || cols > 12)) return false;
          if (filters.width === "large" && cols <= 12) return false;
        }

        if (filters.height !== "all") {
          if (filters.height === "small" && rows > 8) return false;
          if (filters.height === "medium" && (rows <= 8 || rows > 12)) return false;
          if (filters.height === "large" && rows <= 12) return false;
        }

        if (filters.targets !== "all") {
          if (filters.targets === "1-3" && (targetCount < 1 || targetCount > 3)) return false;
          if (filters.targets === "4-6" && (targetCount < 4 || targetCount > 6)) return false;
          if (filters.targets === "7+" && targetCount < 7) return false;
        }

        return true;
      });

      setFilteredLevels(filtered);
    },
    [levels, completedLevels]
  );

  if (containerWidth === null) {
    return <div ref={containerRef} className="w-full" />;
  }

  const itemsPerRow = Math.max(1, Math.floor((containerWidth - 40) / 200));

  return (
    <div ref={containerRef} className="w-full space-y-6">
      <FilterBar onFilterChange={handleFilter} completedLevels={completedLevels} />
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${itemsPerRow}, minmax(0, 1fr))`,
        }}
      >
        {filteredLevels.map((mapData, index) => {
          const mapId = calculateMapId(mapData);
          return <MapThumbnail key={index} mapData={mapData} completedInfo={completedLevels[mapId]} />;
        })}
      </div>
    </div>
  );
};

export default SokobanGallery;
