import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FileUpload from '../FileUpload';
import axios from 'axios';

jest.mock('axios');

describe('FileUpload Component', () => {
  const mockOnFileUpload = jest.fn();
  const mockOnDataUpdate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should handle BEK invoice image upload', async () => {
    render(<FileUpload onFileUpload={mockOnFileUpload} onDataUpdate={mockOnDataUpdate} />);

    // Create a mock file that represents BEK.png
    const bekFile = new File(['mock image content'], 'BEK.png', { type: 'image/png' });
    const input = screen.getByTestId('file-input');

    // Simulate file selection
    await act(async () => {
      await userEvent.upload(input, bekFile);
    });

    expect(input.files[0]).toBe(bekFile);
    expect(input.files.length).toBe(1);
    expect(mockOnFileUpload).toHaveBeenCalledWith(bekFile);
  });

  test('should process BEK invoice and display results', async () => {
    // Mock successful API response with BEK invoice data
    axios.post.mockResolvedValueOnce({
      data: {
        invoice: {
          number: '66702357',
          customer: 'Toby Keiths - Wwc -Tradi',
          customerNumber: 'FOK799734',
          deliveryDate: '10/04/2024',
          itemCount: '93 items',
          pieceCount: '198 pieces',
          total: '$10,351.16'
        },
        items: [
          {
            item: '884043',
            name: 'Mustard Yellow Upside Down',
            brand: 'Heinz',
            packSize: '18/12 OZ',
            price: '$31.77',
            ordered: 2,
            confirmed: 0,
            status: 'Out of stock'
          }
        ]
      }
    });

    render(<FileUpload onFileUpload={mockOnFileUpload} onDataUpdate={mockOnDataUpdate} />);

    // Upload BEK invoice
    const bekFile = new File(['mock image content'], 'BEK.png', { type: 'image/png' });
    const input = screen.getByTestId('file-input');
    await act(async () => {
      await userEvent.upload(input, bekFile);
    });

    // Click process button
    const processButton = screen.getByTestId('upload-button');
    await act(async () => {
      await userEvent.click(processButton);
    });

    // Wait for processing to complete
    await waitFor(() => {
      const logEntries = screen.getByTestId('system-log');
      expect(logEntries).toHaveTextContent('File processed successfully');
    });
  });

  test('should handle BEK invoice processing errors', async () => {
    // Mock API error
    axios.post.mockRejectedValueOnce(new Error('Failed to process invoice'));

    render(<FileUpload onFileUpload={mockOnFileUpload} onDataUpdate={mockOnDataUpdate} />);

    const bekFile = new File(['mock image content'], 'BEK.png', { type: 'image/png' });
    const input = screen.getByTestId('file-input');
    await act(async () => {
      await userEvent.upload(input, bekFile);
    });

    const processButton = screen.getByTestId('upload-button');
    await act(async () => {
      await userEvent.click(processButton);
    });

    await waitFor(() => {
      const logEntries = screen.getByTestId('system-log');
      expect(logEntries).toHaveTextContent('Error during upload: Failed to process invoice');
    });
  });

  test('should validate file types and show appropriate messages', async () => {
    render(<FileUpload onFileUpload={mockOnFileUpload} onDataUpdate={mockOnDataUpdate} />);

    // Test invalid file type
    const invalidFile = new File(['invalid'], 'invalid.txt', { type: 'text/plain' });
    const input = screen.getByTestId('file-input');
    await act(async () => {
      await userEvent.upload(input, invalidFile);
      // Add a small delay to allow the log message to be added
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // Wait for error message in system log
    await waitFor(() => {
      const logEntries = screen.getByTestId('system-log');
      const logEntriesDiv = logEntries.querySelector('.log-entries');
      expect(logEntriesDiv.textContent).toContain('Invalid file type');
    }, { timeout: 2000 });

    // Test valid file type
    const validFile = new File(['valid'], 'BEK.png', { type: 'image/png' });
    await act(async () => {
      await userEvent.upload(input, validFile);
      // Add a small delay to allow the log message to be added
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // Wait for success message
    await waitFor(() => {
      const logEntries = screen.getByTestId('system-log');
      const logEntriesDiv = logEntries.querySelector('.log-entries');
      expect(logEntriesDiv.textContent).toContain('File selected: BEK.png');
    }, { timeout: 2000 });
  });

  test('should show progress during file processing', async () => {
    // Mock axios progress event
    axios.post.mockImplementationOnce((url, data, config) => {
      config.onUploadProgress({ loaded: 50, total: 100 });
      return Promise.resolve({ data: {} });
    });

    render(<FileUpload onFileUpload={mockOnFileUpload} onDataUpdate={mockOnDataUpdate} />);

    const bekFile = new File(['mock image content'], 'BEK.png', { type: 'image/png' });
    const input = screen.getByTestId('file-input');
    await act(async () => {
      await userEvent.upload(input, bekFile);
    });

    const processButton = screen.getByTestId('upload-button');
    await act(async () => {
      await userEvent.click(processButton);
    });

    await waitFor(() => {
      const logEntries = screen.getByTestId('system-log');
      expect(logEntries).toHaveTextContent('Upload progress: 50%');
    });
  });
}); 