import { useState, useEffect } from 'react';
import Breadcrumb from '../components/ui/Breadcrumbs/Breadcrumb';

interface Widget {
  id: string;
  name: string;
  position: number;
}

const DashboardCustomizer = () => {
  const defaultWidgets: Widget[] = [
    { id: 'device-manager', name: 'Device Manager', position: 0 },
    { id: 'live-wave', name: 'Live Waveform (L/R)', position: 1 },
    { id: 'live-wave-ud', name: 'Live Waveform (U/B)', position: 2 },
    { id: 'fft-graph', name: 'FFT Graph', position: 3 },
    { id: 'stats', name: 'Statistics (Avg. From Last 10 Min)', position: 4 },
    { id: 'controls', name: 'Controls', position: 5 },
  ];

  const [widgets, setWidgets] = useState<Widget[]>(() => {
    const saved = localStorage.getItem('dashboard-layout');
    return saved ? JSON.parse(saved) : defaultWidgets;
  });

  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const handleDragStart = (index: number) => {
    setDraggedItem(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItem === null || draggedItem === index) return;

    const newWidgets = [...widgets];
    const draggedWidget = newWidgets[draggedItem];
    newWidgets.splice(draggedItem, 1);
    newWidgets.splice(index, 0, draggedWidget);

    // Update positions
    newWidgets.forEach((widget, idx) => {
      widget.position = idx;
    });

    setWidgets(newWidgets);
    setDraggedItem(index);
    setHasChanges(true);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const handleSave = () => {
    localStorage.setItem('dashboard-layout', JSON.stringify(widgets));
    setHasChanges(false);
    // Trigger a storage event for same-window updates
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'dashboard-layout',
      newValue: JSON.stringify(widgets),
    }));
    // Show success toast or notification
    alert('Dashboard layout saved successfully! Go back to the Live page to see the changes.');
  };

  const handleReset = () => {
    setWidgets(defaultWidgets);
    setHasChanges(true);
  };

  return (
    <>
      <Breadcrumb pageName="Customize Dashboard" />

      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
          <h3 className="font-medium text-black dark:text-white">
            Dashboard Widget Layout
          </h3>
          <p className="text-sm text-bodydark mt-2">
            Drag and drop widgets to rearrange their order on the dashboard
          </p>
        </div>

        <div className="p-6.5">
          <div className="mb-6 flex flex-col gap-4">
            {widgets.map((widget, index) => (
              <div
                key={widget.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center justify-between rounded-lg border-2 border-stroke bg-gray p-4 cursor-move transition-all hover:border-primary dark:border-strokedark dark:bg-meta-4 ${
                  draggedItem === index ? 'opacity-50' : 'opacity-100'
                }`}
              >
                <div className="flex items-center gap-4">
                  <svg
                    className="fill-bodydark dark:fill-bodydark1"
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M7 2C7 0.895431 6.10457 0 5 0C3.89543 0 3 0.895431 3 2C3 3.10457 3.89543 4 5 4C6.10457 4 7 3.10457 7 2Z" />
                    <path d="M7 10C7 8.89543 6.10457 8 5 8C3.89543 8 3 8.89543 3 10C3 11.1046 3.89543 12 5 12C6.10457 12 7 11.1046 7 10Z" />
                    <path d="M7 18C7 16.8954 6.10457 16 5 16C3.89543 16 3 16.8954 3 18C3 19.1046 3.89543 20 5 20C6.10457 20 7 19.1046 7 18Z" />
                    <path d="M17 2C17 0.895431 16.1046 0 15 0C13.8954 0 13 0.895431 13 2C13 3.10457 13.8954 4 15 4C16.1046 4 17 3.10457 17 2Z" />
                    <path d="M17 10C17 8.89543 16.1046 8 15 8C13.8954 8 13 8.89543 13 10C13 11.1046 13.8954 12 15 12C16.1046 12 17 11.1046 17 10Z" />
                    <path d="M17 18C17 16.8954 16.1046 16 15 16C13.8954 16 13 16.8954 13 18C13 19.1046 13.8954 20 15 20C16.1046 20 17 19.1046 17 18Z" />
                  </svg>
                  <div>
                    <h4 className="text-black dark:text-white font-medium">
                      {widget.name}
                    </h4>
                    <p className="text-sm text-bodydark">Position {index + 1}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-primary bg-opacity-10 py-1 px-3 text-sm font-medium text-primary">
                    {widget.id}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className={`flex justify-center rounded bg-primary p-3 font-medium text-white transition hover:bg-opacity-90 ${
                !hasChanges ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              Save Layout
            </button>
            <button
              onClick={handleReset}
              className="flex justify-center rounded border border-stroke p-3 font-medium text-black transition hover:bg-gray dark:border-strokedark dark:text-white dark:hover:bg-meta-4"
            >
              Reset to Default
            </button>
          </div>

          {hasChanges && (
            <div className="mt-4 rounded-lg bg-warning bg-opacity-10 p-4">
              <p className="text-sm text-warning">
                You have unsaved changes. Click "Save Layout" to apply them.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default DashboardCustomizer;
