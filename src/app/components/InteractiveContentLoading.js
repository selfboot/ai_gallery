export const LOADING_VARIANTS = {
  board: 0,
  ring: 1,
  cube: 2,
};

export default function InteractiveContentLoading({ variant = LOADING_VARIANTS.board, title = "Loading interactive tool..." }) {
  const isCube = variant === LOADING_VARIANTS.cube;
  const isRing = variant === LOADING_VARIANTS.ring;

  return (
    <div className="w-full rounded-lg border border-gray-200 bg-white p-4 shadow-sm" aria-live="polite">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-700">{title}</p>
          <div className="mt-2 h-3 w-44 rounded bg-gray-200" />
        </div>
        <div className="hidden gap-2 sm:flex">
          <div className="h-9 w-20 rounded bg-blue-100" />
          <div className="h-9 w-20 rounded bg-gray-100" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="flex min-h-[360px] items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-4">
          {isCube ? (
            <div className="grid grid-cols-3 gap-2 rounded-lg bg-gray-200 p-4 shadow-inner">
              {Array.from({ length: 9 }).map((_, index) => (
                <div
                  key={index}
                  className={`h-14 w-14 rounded ${index % 3 === 0 ? "bg-blue-300" : index % 3 === 1 ? "bg-red-300" : "bg-yellow-300"}`}
                />
              ))}
            </div>
          ) : isRing ? (
            <div className="relative h-64 w-64 rounded-full border-8 border-blue-100">
              {Array.from({ length: 6 }).map((_, index) => {
                const angle = (index / 6) * Math.PI * 2;
                const x = 112 + Math.cos(angle) * 116;
                const y = 112 + Math.sin(angle) * 116;
                return (
                  <div
                    key={index}
                    className="absolute h-8 w-8 rounded-full bg-blue-400"
                    style={{ left: `${x}px`, top: `${y}px` }}
                  />
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-8 gap-1">
              {Array.from({ length: 64 }).map((_, index) => (
                <div
                  key={index}
                  className={`h-8 w-8 rounded ${index === 7 ? "bg-red-300" : index === 56 ? "bg-blue-300" : index % 9 === 0 ? "bg-gray-300" : "bg-white"}`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="h-4 w-28 rounded bg-gray-300" />
          <div className="h-10 rounded bg-white" />
          <div className="h-10 rounded bg-white" />
          <div className="h-10 rounded bg-blue-100" />
        </div>
      </div>
    </div>
  );
}
