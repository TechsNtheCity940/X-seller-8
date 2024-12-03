import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LiveDataGrid from '../LiveDataGrid';

describe('LiveDataGrid Component with BEK Invoice Data', () => {
  // Sample BEK invoice data
  const bekData = [
    {
      'Item#': '884043',
      'Item Name': 'Mustard Yellow Upside Down',
      'Brand': 'Heinz',
      'Pack Size': '18/12 OZ',
      'Price': 31.77,
      'Ordered': 2,
      'Confirmed': 0,
      'Status': 'Out of stock'
    },
    {
      'Item#': '500401',
      'Brand': 'Packer',
      'Item Name': 'Beef Brisket Choice Sel Noroll',
      'Pack Size': '7/CATCH',
      'Price': 4.34,
      'Ordered': 1,
      'Confirmed': 0,
      'Status': 'Out of stock'
    },
    {
      'Item#': '151772',
      'Item Name': 'Pasta Elbow Macaroni',
      'Brand': 'Bellacibo',
      'Pack Size': '2/10 LB',
      'Price': 23.62,
      'Ordered': 1,
      'Confirmed': 1,
      'Status': 'Filled'
    }
  ];

  const mockSort = jest.fn();
  const mockFilter = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render BEK invoice data correctly', () => {
    render(<LiveDataGrid data={bekData} onSort={mockSort} onFilter={mockFilter} />);

    // Check if all items are displayed
    expect(screen.getByText('Mustard Yellow Upside Down')).toBeInTheDocument();
    expect(screen.getByText('Beef Brisket Choice Sel Noroll')).toBeInTheDocument();
    expect(screen.getByText('Pasta Elbow Macaroni')).toBeInTheDocument();

    // Check if prices are formatted correctly
    expect(screen.getByText('$31.77')).toBeInTheDocument();
    expect(screen.getByText('$4.34')).toBeInTheDocument();
    expect(screen.getByText('$23.62')).toBeInTheDocument();
  });

  test('should sort data by different columns', async () => {
    render(<LiveDataGrid data={bekData} onSort={mockSort} onFilter={mockFilter} />);

    // Sort by Item Name
    const itemNameHeader = screen.getByTestId('sort-Item Name');
    await act(async () => {
      await userEvent.click(itemNameHeader);
    });
    expect(mockSort).toHaveBeenCalledWith({ key: 'Item Name', direction: 'ascending' });

    // Sort by Price
    const priceHeader = screen.getByTestId('sort-Price');
    await act(async () => {
      await userEvent.click(priceHeader);
    });
    expect(mockSort).toHaveBeenCalledWith({ key: 'Price', direction: 'ascending' });
  });

  test('should filter data correctly', async () => {
    render(<LiveDataGrid data={bekData} onSort={mockSort} onFilter={mockFilter} />);

    // Filter by Brand
    const brandFilter = screen.getByTestId('filter-Brand');
    await act(async () => {
      await userEvent.type(brandFilter, 'Heinz');
    });
    
    expect(mockFilter).toHaveBeenCalledWith({ 'Brand': 'Heinz' });
  });

  test('should handle column selection', async () => {
    render(<LiveDataGrid data={bekData} onSort={mockSort} onFilter={mockFilter} />);

    // Open column selector
    const columnSelector = screen.getByTestId('column-selector');
    
    // Select specific columns
    await act(async () => {
      await userEvent.selectOptions(columnSelector, ['Item Name', 'Price', 'Status']);
      // Deselect other columns
      await userEvent.deselectOptions(columnSelector, ['Item#', 'Brand', 'Pack Size', 'Ordered', 'Confirmed']);
    });

    // Verify only selected columns are shown
    expect(screen.getByText('Mustard Yellow Upside Down')).toBeInTheDocument();
    expect(screen.getByText('$31.77')).toBeInTheDocument();
    expect(screen.getAllByText('Out of stock')[0]).toBeInTheDocument();
    
    // Wait for hidden columns to be removed
    await waitFor(() => {
      expect(screen.queryByText('18/12 OZ')).not.toBeInTheDocument();
    });
  });

  test('should display correct row count', () => {
    render(<LiveDataGrid data={bekData} onSort={mockSort} onFilter={mockFilter} />);

    expect(screen.getByText(`Showing ${bekData.length} of ${bekData.length} entries`)).toBeInTheDocument();
  });

  test('should handle search functionality', async () => {
    render(<LiveDataGrid data={bekData} onSort={mockSort} onFilter={mockFilter} />);

    const searchInput = screen.getByTestId('search-input');
    await act(async () => {
      await userEvent.type(searchInput, 'Mustard');
    });

    expect(screen.getByText('Mustard Yellow Upside Down')).toBeInTheDocument();
    expect(screen.queryByText('Beef Brisket Choice Sel Noroll')).not.toBeInTheDocument();
    expect(screen.queryByText('Pasta Elbow Macaroni')).not.toBeInTheDocument();
  });

  test('should format numbers correctly', () => {
    render(<LiveDataGrid data={bekData} onSort={mockSort} onFilter={mockFilter} />);

    // Check price formatting
    bekData.forEach(item => {
      expect(screen.getByText(`$${item.Price.toFixed(2)}`)).toBeInTheDocument();
    });
  });

  test('should highlight out of stock items', () => {
    render(<LiveDataGrid data={bekData} onSort={mockSort} onFilter={mockFilter} />);

    const outOfStockItems = screen.getAllByText('Out of stock');
    outOfStockItems.forEach(item => {
      const row = item.closest('tr');
      expect(row).toHaveStyle({ backgroundColor: '#ffebee' });
      expect(row).toHaveAttribute('data-status', 'out-of-stock');
    });
  });

  test('should handle empty data gracefully', () => {
    render(<LiveDataGrid data={[]} onSort={mockSort} onFilter={mockFilter} />);

    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  test('should maintain state between re-renders', async () => {
    const { rerender } = render(
      <LiveDataGrid data={bekData} onSort={mockSort} onFilter={mockFilter} />
    );

    // Set some filters and sorting
    const searchInput = screen.getByTestId('search-input');
    await act(async () => {
      await userEvent.type(searchInput, 'Mustard');
    });

    // Re-render with same data
    rerender(<LiveDataGrid data={bekData} onSort={mockSort} onFilter={mockFilter} />);

    // Check if filters are maintained
    expect(searchInput).toHaveValue('Mustard');
    expect(screen.getByText('Mustard Yellow Upside Down')).toBeInTheDocument();
    expect(screen.queryByText('Beef Brisket Choice Sel Noroll')).not.toBeInTheDocument();
  });
}); 