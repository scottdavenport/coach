import { memo, useCallback, useState } from 'react';

// Minimal test input to isolate performance issues
export const PerformanceTestInput = memo(function PerformanceTestInput() {
  const [value, setValue] = useState('');

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const start = performance.now();
    setValue(e.target.value);
    const end = performance.now();
    
    console.log('🧪 ISOLATED INPUT PERFORMANCE:', {
      duration: end - start + 'ms',
      inputLength: e.target.value.length,
      timestamp: Date.now()
    });
  }, []);

  return (
    <div className="p-4 border border-red-500 rounded-lg">
      <p className="text-xs text-red-500 mb-2">PERFORMANCE TEST - Isolated Input</p>
      <textarea
        value={value}
        onChange={handleChange}
        placeholder="Type here to test performance..."
        className="w-full bg-card border border-line rounded-xl px-4 py-3 text-text placeholder:text-muted resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/30"
        rows={1}
        style={{ minHeight: '44px', maxHeight: '120px' }}
      />
      <p className="text-xs text-muted mt-1">Input length: {value.length}</p>
    </div>
  );
});