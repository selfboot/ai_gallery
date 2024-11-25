"use client";
import React, { useEffect, useRef, useState, memo, useCallback } from "react";
import { calculateMapId } from "../gameLogic";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/app/i18n/client";
import { CustomListbox } from "@/app/components/ListBox";

const CELL_SIZE = 6;
const STORAGE_KEY = "sokoban-progress";

const MapThumbnail = memo(({ mapData, completedInfo }) => {
  const { t } = useI18n();
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

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      className={`flex flex-col items-center p-2 sm:p-4 shadow-sm cursor-pointer hover:shadow-md transition-all relative
        w-[180px] h-[180px]
        ${isCompleted ? "bg-green-50 border-green-200" : "bg-white border-gray-200"} border`}
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
        <svg
          width={width}
          height={height}
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "center",
          }}
        >
          {mapData.map((row, y) =>
            row.map((cell, x) => {
              const posX = x * CELL_SIZE;
              const posY = y * CELL_SIZE;
              
              // 跳过空白格子
              if (cell === 0) return null;

              let fillColor;
              switch (cell) {
                case 1: // WALL
                  fillColor = "#2C282B";
                  break;
                case 2: // FLOOR
                  fillColor = "#f5eedf";
                  break;
                case 3: // TARGET
                  fillColor = "#ff6b6b";
                  break;
                case 4: // BOX
                  fillColor = "#556589";
                  break;
                case 5: // BOX_ON_TARGET
                  fillColor = "#ff8787";
                  break;
                case 6: // PLAYER
                  fillColor = "#4169E1";
                  break;
                case 7: // PLAYER_ON_TARGET
                  fillColor = "#5c7cfa";
                  break;
                default:
                  return null;
              }

              return (
                <g key={`${x}-${y}`}>
                  <rect
                    x={posX}
                    y={posY}
                    width={CELL_SIZE}
                    height={CELL_SIZE}
                    fill={fillColor}
                    stroke="#e9ecef"
                    strokeWidth="0.5"
                  />
                </g>
              );
            })
          )}
        </svg>
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
          <div className="w-24 sm:w-32">
            <CustomListbox
              value={filters.completion}
              onChange={(value) => handleFilterChange("completion", value)}
              options={completionOptions}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="font-medium text-gray-700 whitespace-nowrap">{t("map_width")}:</label>
          <div className="w-24 sm:w-32">
            <CustomListbox
              value={filters.width}
              onChange={(value) => handleFilterChange("width", value)}
              options={sizeOptions}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="font-medium text-gray-700 whitespace-nowrap">{t("map_height")}:</label>
          <div className="w-24 sm:w-32">
            <CustomListbox
              value={filters.height}
              onChange={(value) => handleFilterChange("height", value)}
              options={sizeOptions}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="font-medium text-gray-700 whitespace-nowrap">{t("target_count")}:</label>
          <div className="w-24 sm:w-32">
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

const Pagination = memo(({ currentPage, totalPages, onPageChange }) => {
  const { t } = useI18n();
  const [windowWidth, setWindowWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 0);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getPageNumbers = () => {
    const pages = [];
    const showPages = windowWidth < 640 ? 3 : 7;
    let start = Math.max(1, currentPage - Math.floor(showPages / 2));
    let end = Math.min(totalPages, start + showPages - 1);

    if (end - start + 1 < showPages) {
      start = Math.max(1, end - showPages + 1);
    }

    if (start > 1) {
      pages.push(1);
      if (start > 2) pages.push("...");
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < totalPages) {
      if (end < totalPages - 1) pages.push("...");
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="flex items-center justify-end gap-1 mt-8">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex items-center gap-1 px-2 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed
          hover:bg-gray-100 transition-colors sm:px-3"
      >
        <ChevronLeft size={16} />
        <span className="hidden sm:inline">{t("previous")}</span>
      </button>

      {/* Page numbers */}
      <div className="flex items-center gap-1">
        {getPageNumbers().map((page, index) => (
          <React.Fragment key={index}>
            {page === "..." ? (
              <span className="px-1 sm:px-2">...</span>
            ) : (
              <button
                onClick={() => page !== currentPage && onPageChange(page)}
                className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-md transition-colors
                  ${page === currentPage ? "bg-blue-600 text-white" : "hover:bg-gray-100"}`}
              >
                {page}
              </button>
            )}
          </React.Fragment>
        ))}
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="flex items-center gap-1 px-2 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed
          hover:bg-gray-100 transition-colors sm:px-3"
      >
        <span className="hidden sm:inline">{t("next")}</span>
        <ChevronRight size={16} />
      </button>
    </div>
  );
});

const SokobanGallery = ({ levels }) => {
  const containerRef = useRef(null);
  const [completedLevels, setCompletedLevels] = useState({});
  const [containerWidth, setContainerWidth] = useState(null);
  const [filteredLevels, setFilteredLevels] = useState(levels);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(24);
  const { t } = useI18n();

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

  // Determine the number of items per row based on screen width
  const getItemsPerRow = useCallback((width) => {
    if (width < 640) return 2; // Display 2 items on mobile screens
    if (width < 1024) return 3; // Display 3 items on tablets
    return Math.max(1, Math.floor((width - 40) / 200)); // Desktop adaptive
  }, []);

  // Cal page show numbers
  const getItemsPerPage = useCallback(
    (width) => {
      const itemsPerRow = getItemsPerRow(width);
      const viewportHeight = window.innerHeight - 200;
      const itemHeight = width < 640 ? 140 : 180;
      const rowsPerPage = Math.max(2, Math.floor(viewportHeight / itemHeight));
      return itemsPerRow * rowsPerPage;
    },
    [getItemsPerRow]
  );

  useEffect(() => {
    if (containerWidth) {
      setItemsPerPage(getItemsPerPage(containerWidth));
    }
  }, [containerWidth, getItemsPerPage]);

  const itemsPerRow = getItemsPerRow(containerWidth);
  const totalPages = Math.ceil(filteredLevels.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentLevels = filteredLevels.slice(startIndex, endIndex);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const pageParam = urlParams.get("page");
    if (pageParam) {
      const page = parseInt(pageParam, 10);
      if (!isNaN(page) && page > 0) {
        setCurrentPage(page);
      }
    }
  }, []);

  const handlePageChange = useCallback((newPage) => {
    setCurrentPage(newPage);

    const newUrl = new URL(window.location.href);
    if (newPage === 1) {
      newUrl.searchParams.delete("page");
    } else {
      newUrl.searchParams.set("page", newPage);
    }

    window.history.pushState({}, "", newUrl.toString());
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const pageParam = urlParams.get("page");
      const page = pageParam ? parseInt(pageParam, 10) : 1;
      if (!isNaN(page) && page > 0) {
        setCurrentPage(page);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
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
      setCurrentPage(1);
    },
    [levels, completedLevels]
  );

  if (containerWidth === null) {
    return <div ref={containerRef} className="w-full" />;
  }

  return (
    <div ref={containerRef} className="w-full space-y-6">
      <FilterBar onFilterChange={handleFilter} completedLevels={completedLevels} />

      <div
        className="grid gap-2 sm:gap-4"
        style={{
          gridTemplateColumns: `repeat(${itemsPerRow}, minmax(0, 1fr))`,
        }}
      >
        {currentLevels.map((mapData) => {
          const mapId = calculateMapId(mapData);
          return <MapThumbnail key={mapId} mapData={mapData} completedInfo={completedLevels[mapId]} />;
        })}
      </div>

      {totalPages > 1 && (
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
      )}
    </div>
  );
};

export default SokobanGallery;
