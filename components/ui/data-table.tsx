'use client';

import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  ColumnDef,
  SortingState,
  ColumnResizeMode,
  VisibilityState,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  ChevronUp, 
  ChevronDown, 
  Settings, 
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  resizable?: boolean;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  visible?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
}

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

interface DataTableProps {
  data: any[];
  columns: Column[];
  pageSize?: number;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
  searchable?: boolean;
  selectable?: boolean;
  onSelectionChange?: (selectedIds: string[]) => void;
  selectedIds?: string[];
  idField?: string;
}

export function DataTable({
  data,
  columns,
  pageSize = 50,
  onLoadMore,
  hasMore = false,
  loading = false,
  searchable = true,
  selectable = true,
  onSelectionChange,
  selectedIds = [],
  idField = 'id'
}: DataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [columnSizes, setColumnSizes] = useState<Record<string, number>>({});
  const [resizing, setResizing] = useState<string | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);

  // Initialize column visibility and sizes
  React.useEffect(() => {
    const initialVisibility: VisibilityState = {};
    const initialSizes: Record<string, number> = {};
    columns.forEach(col => {
      initialVisibility[col.key] = col.visible !== false;
      initialSizes[col.key] = col.width || 150;
    });
    setColumnVisibility(initialVisibility);
    setColumnSizes(initialSizes);
  }, [columns]);

  // Convert our column format to TanStack Table format
  const tableColumns = useMemo(() => {
    const columnHelper = createColumnHelper<any>();
    
    const tableCols: ColumnDef<any>[] = [];

    // Add selection column if needed
    if (selectable) {
      tableCols.push(
        columnHelper.display({
          id: 'select',
          header: ({ table }) => (
            <input
              type="checkbox"
              checked={table.getIsAllPageRowsSelected()}
              onChange={table.getToggleAllPageRowsSelectedHandler()}
              className="rounded border-gray-300"
            />
          ),
          cell: ({ row }) => (
            <input
              type="checkbox"
              checked={row.getIsSelected()}
              onChange={row.getToggleSelectedHandler()}
              className="rounded border-gray-300"
            />
          ),
          size: 50,
          enableSorting: false,
          enableResizing: false,
        })
      );
    }

    // Add data columns
    columns.forEach(col => {
      tableCols.push(
        columnHelper.accessor(col.key, {
          header: col.label,
          cell: ({ getValue, row }) => {
            const value = getValue();
            const displayValue = col.render ? col.render(value, row.original) : (value || '-');
            
            // Handle tooltip text properly
            let tooltipText = '';
            if (React.isValidElement(displayValue)) {
              // For React elements, try to extract meaningful text content
              const props = displayValue.props as any;
              if (props && props.children) {
                // For elements with children, get the text content
                const children = props.children;
                if (typeof children === 'string') {
                  tooltipText = children;
                } else if (Array.isArray(children)) {
                  // For arrays of children, extract text from each
                  tooltipText = children
                    .map((child: any) => {
                      if (typeof child === 'string') return child;
                      if (child && typeof child === 'object' && child.props && child.props.children) {
                        return child.props.children;
                      }
                      return '';
                    })
                    .filter((text: string) => text)
                    .join(' ');
                } else if (children && typeof children === 'object' && children.props && children.props.children) {
                  tooltipText = children.props.children;
                }
              }
              
              // Special handling for complex elements like Invite URL with copy button
              if (!tooltipText && props && props.className && props.className.includes('group')) {
                // For group containers, try to find the first anchor tag or text content
                const findTextInElement = (element: any): string => {
                  if (typeof element === 'string') return element;
                  if (element && typeof element === 'object' && element.props) {
                    if (element.props.children) {
                      if (typeof element.props.children === 'string') {
                        return element.props.children;
                      } else if (Array.isArray(element.props.children)) {
                        const textParts = element.props.children
                          .map(findTextInElement)
                          .filter((text: string) => text && text !== '[object Object]');
                        return textParts.join(' ');
                      }
                    }
                  }
                  return '';
                };
                
                tooltipText = findTextInElement(displayValue);
              }
              
              // If we couldn't extract meaningful text, fall back to the original value
              if (!tooltipText || tooltipText.includes('[object Object]')) {
                tooltipText = String(value || '');
              }
            } else {
              // For strings and primitives, use the actual value
              tooltipText = String(displayValue);
            }
            
            // Always show tooltip for every cell
            return (
              <div 
                className="truncate cursor-help max-w-full"
                title={tooltipText}
              >
                {displayValue as React.ReactNode}
              </div>
            );
          },
          size: columnSizes[col.key] || col.width || 150,
          minSize: col.minWidth || Math.max(50, col.label.length * 8 + 50), // Minimum based on label width + icons + padding + 10px buffer
          maxSize: col.maxWidth || 800, // Increased maximum width
          enableSorting: col.sortable !== false,
          enableResizing: col.resizable !== false,
        })
      );
    });

    return tableCols;
  }, [columns, selectable, columnSizes]);

  // Create the table instance
  const table = useReactTable({
    data,
    columns: tableColumns,
    state: {
      sorting,
      globalFilter,
      columnVisibility,
      rowSelection,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    columnResizeMode: 'onChange' as ColumnResizeMode,
    enableRowSelection: selectable,
    enableMultiRowSelection: selectable,
    enableSorting: true,
    enableColumnResizing: true,
    enableGlobalFilter: searchable,
    globalFilterFn: 'includesString',
    initialState: {
      pagination: {
        pageSize: 1000, // Show many more rows per page
      },
    },
  });

  // Handle row selection changes
  React.useEffect(() => {
    if (onSelectionChange) {
      const selectedRows = table.getFilteredSelectedRowModel().rows;
      const selectedIds = selectedRows.map(row => row.original[idField]);
      onSelectionChange(selectedIds);
    }
  }, [rowSelection, table, onSelectionChange, idField]);

  // Custom resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent, columnKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const currentWidth = columnSizes[columnKey] || 150;
    setResizing(columnKey);
    setResizeStartX(e.clientX);
    setResizeStartWidth(currentWidth);
  }, [columnSizes]);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!resizing) return;

    const column = columns.find(col => col.key === resizing);
    if (!column) return;

    const deltaX = e.clientX - resizeStartX;
    let newWidth = resizeStartWidth + deltaX;
    
    // Apply min/max constraints
    newWidth = Math.max(column.minWidth || 50, newWidth);
    newWidth = Math.min(column.maxWidth || 800, newWidth);

    setColumnSizes(prev => ({
      ...prev,
      [resizing]: newWidth
    }));
  }, [resizing, columns, resizeStartX, resizeStartWidth]);

  const handleResizeEnd = useCallback(() => {
    setResizing(null);
    setResizeStartX(0);
    setResizeStartWidth(0);
  }, []);

  // Add resize event listeners
  React.useEffect(() => {
    if (resizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [resizing, handleResizeMove, handleResizeEnd]);

  const getSortIcon = (column: any) => {
    if (!column.getCanSort()) return null;
    
    if (column.getIsSorted() === 'asc') {
      return <ChevronUp className="h-4 w-4" />;
    } else if (column.getIsSorted() === 'desc') {
      return <ChevronDown className="h-4 w-4" />;
    }
    return <ArrowUpDown className="h-4 w-4" />;
  };

  return (
    <div className="space-y-4">
      {/* Table Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {searchable && (
          <div className="flex-1 max-w-md">
            <Label htmlFor="search" className="sr-only">Search</Label>
            <Input
              id="search"
              placeholder="Search..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
            />
          </div>
        )}
        
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table.getAllLeafColumns()
                .filter(column => column.id !== 'select')
                .map(column => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(value: boolean) => column.toggleVisibility(!!value)}
                  >
                    {column.columnDef.header as string}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full border-collapse table-fixed">
            <thead className="bg-gray-50">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative border-b border-gray-200"
                      style={{
                        width: header.id === 'select' ? 50 : columnSizes[header.id] || header.getSize(),
                        position: 'relative',
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <button
                          className={`flex items-center space-x-1 ${
                            header.column.getCanSort() ? 'hover:text-gray-700 cursor-pointer' : ''
                          }`}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                          {getSortIcon(header.column)}
                        </button>
                        {header.column.getCanResize() && header.id !== 'select' && (
                          <div
                            onMouseDown={(e) => handleResizeStart(e, header.id)}
                            className={`absolute right-0 top-2 bottom-2 w-0.5 cursor-col-resize select-none touch-none ${
                              resizing === header.id ? 'bg-gray-400' : 'bg-gray-200'
                            }`}
                          />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="bg-white">
              {table.getRowModel().rows.map(row => (
                <tr key={row.id} className="hover:bg-gray-50 border-b border-gray-100">
                  {row.getVisibleCells().map(cell => (
                    <td
                      key={cell.id}
                      className="px-3 py-4 text-sm text-gray-900 overflow-hidden"
                      style={{
                        width: cell.column.id === 'select' ? 50 : columnSizes[cell.column.id] || cell.column.getSize(),
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {table.getRowModel().rows.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {globalFilter ? 'No results found for your search.' : 'No data available.'}
            </p>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            <p className="text-sm text-gray-700">
              Showing{' '}
              <span className="font-medium">{table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}</span>
              {' '}to{' '}
              <span className="font-medium">
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                  table.getFilteredRowModel().rows.length
                )}
              </span>
              {' '}of{' '}
              <span className="font-medium">{table.getFilteredRowModel().rows.length}</span>
              {' '}results
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Load More */}
        {hasMore && (
          <div className="p-4 border-t border-gray-200">
            <Button
              onClick={onLoadMore}
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              {loading ? 'Loading...' : 'Load More'}
            </Button>
          </div>
        )}
      </div>

      {/* Table Info */}
      <div className="text-sm text-gray-600">
        Showing {table.getFilteredRowModel().rows.length} of {data.length} entries
        {globalFilter && ` (filtered from ${data.length} total)`}
      </div>
    </div>
  );
} 