export default function ToolContentLoading() {
  return (
    <div className="w-full mx-auto mt-4 mb-6" aria-hidden="true">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="h-6 w-40 rounded bg-gray-200 animate-pulse mb-4" />
          <div className="h-32 rounded border-2 border-dashed border-gray-200 bg-gray-50 animate-pulse" />
          <div className="mt-4 h-4 w-2/3 rounded bg-gray-100 animate-pulse" />
        </div>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="h-6 w-36 rounded bg-gray-200 animate-pulse mb-4" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-20 rounded border border-gray-200 bg-gray-50 animate-pulse" />
            <div className="h-20 rounded border border-gray-200 bg-gray-50 animate-pulse" />
            <div className="h-20 rounded border border-gray-200 bg-gray-50 animate-pulse" />
            <div className="h-20 rounded border border-gray-200 bg-gray-50 animate-pulse" />
          </div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-3">
            <div className="h-6 w-44 rounded bg-gray-200 animate-pulse" />
            <div className="h-4 w-72 max-w-full rounded bg-gray-100 animate-pulse" />
          </div>
          <div className="flex gap-3">
            <div className="h-11 w-28 rounded bg-gray-200 animate-pulse" />
            <div className="h-11 w-28 rounded bg-gray-100 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
