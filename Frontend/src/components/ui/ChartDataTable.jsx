import { useId, useState } from 'react';
import { RiTableLine } from '@remixicon/react';

/**
 * Accessible wrapper for a chart — WCAG 1.1.1 "Non-text Content".
 *
 * An SVG chart is, to a screen reader, an unlabelled blob. Recharts emits no
 * usable text alternative, so the data behind every chart is exposed as a real
 * `<table>`: always present in the accessibility tree, and toggleable visually
 * for anyone who would rather read numbers than estimate them off an axis.
 *
 * A summary sentence carries the headline (range, min, max, latest) so the
 * chart's *point* is available without stepping through every row.
 */
const ChartDataTable = ({
  title,
  summary,
  columns,
  rows,
  children,
  emptyMessage = 'No data recorded yet.',
}) => {
  const [showTable, setShowTable] = useState(false);
  const tableId = useId();

  const hasData = Array.isArray(rows) && rows.length > 0;

  return (
    <figure className="m-0">
      <figcaption className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <h2 className="luxury-heading text-lg sm:text-xl">{title}</h2>
          {summary && <p className="text-xs text-[#5a5750] mt-1">{summary}</p>}
        </div>

        {hasData && (
          <button
            type="button"
            onClick={() => setShowTable((v) => !v)}
            aria-expanded={showTable}
            aria-controls={tableId}
            className="inline-flex items-center gap-1.5 text-xs text-[#5a5750] hover:text-[#141413] border border-[#e6dfd8] rounded-lg px-2.5 py-1.5 shrink-0"
          >
            <RiTableLine className="w-3.5 h-3.5" aria-hidden="true" />
            {showTable ? 'Hide data' : 'View data'}
          </button>
        )}
      </figcaption>

      {/* The chart itself is decorative once the table exists: its content is
          fully represented below, so exposing the SVG would only duplicate it. */}
      <div aria-hidden="true">{children}</div>

      {/* Rendered whenever data exists — visually collapsed, but always in the
          accessibility tree. `hidden` would remove it from screen readers too,
          which would defeat the purpose. */}
      {hasData && (
        <div
          id={tableId}
          className={showTable ? 'mt-6 overflow-x-auto' : 'sr-only'}
        >
          <table className="w-full text-sm border-collapse">
            <caption className="sr-only">
              {title}
              {summary ? `. ${summary}` : ''}
            </caption>
            <thead>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    scope="col"
                    className="text-left font-medium text-[#5a5750] border-b border-[#e6dfd8] py-2 px-3 whitespace-nowrap"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.key ?? i} className="border-b border-[#f1f0ed]">
                  {columns.map((col) => (
                    <td key={col.key} className="py-2 px-3 whitespace-nowrap">
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!hasData && (
        <p className="text-sm text-[#5a5750] text-center py-8">
          {emptyMessage}
        </p>
      )}
    </figure>
  );
};

export default ChartDataTable;
