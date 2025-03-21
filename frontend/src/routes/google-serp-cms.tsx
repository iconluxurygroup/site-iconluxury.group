import React, { useState } from 'react';
import {
  Container,
  Text,
  Button,
  VStack,
  HStack,
  Box,
  Input,
  FormControl,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Table,
  Tr,
  Td,
  Tbody,
  Select,
  Spinner,
} from '@chakra-ui/react';
import { createFileRoute } from '@tanstack/react-router';
import { FiSend } from 'react-icons/fi';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import ExcelDataTable from '../components/ExcelDataTable';
import useCustomToast from '../hooks/useCustomToast';
import { useSearch } from '@tanstack/react-router';
// ### Interfaces
interface ColumnMapping {
  style: number | null;
  brand: number | null;
  imageAdd: number | null;
  readImage: number | null;
  category: number | null;
  colorName: number | null;
}

interface ExcelData {
  headers: string[];
  rows: { row: ExcelJS.CellValue[] }[];
}

// ### Helper Functions
function getDisplayValue(cellValue: any): string {
  if (cellValue === null || cellValue === undefined) return '';
  else if (typeof cellValue === 'string' || typeof cellValue === 'number' || typeof cellValue === 'boolean')
    return String(cellValue);
  else if (cellValue instanceof Date) return cellValue.toLocaleString();
  else if (typeof cellValue === 'object') {
    if (cellValue.error) return cellValue.error;
    else if (cellValue.result !== undefined) return getDisplayValue(cellValue.result);
    else if (cellValue.text) return cellValue.text;
    else if (cellValue.hyperlink) return cellValue.text || cellValue.hyperlink;
    else return JSON.stringify(cellValue);
  }
  return String(cellValue);
}

function indexToColumnLetter(index: number): string {
  let column = '';
  let temp = index;
  while (temp >= 0) {
    column = String.fromCharCode((temp % 26) + 65) + column;
    temp = Math.floor(temp / 26) - 1;
  }
  return column;
}

// Memoize the ExcelDataTable component
const ExcelDataTableMemo = React.memo(ExcelDataTable);
import { z } from 'zod';

// Define the search schema
const searchSchema = z.object({
  UserEmail: z.string().optional(),
});
// ### Main Component
function CMSGoogleSerpForm() {
  // State Declarations
  const search = useSearch({ from: '/google-serp-cms' });
  const userEmail = search.UserEmail || 'nik@luxurymarket.com'; 
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>(''); // Added state for filename
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [excelData, setExcelData] = useState<ExcelData>({ headers: [], rows: [] });
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [mappingPreviewRows, setMappingPreviewRows] = useState<any[]>([]); // Added state for mapping preview
  const [isHeaderModalOpen, setIsHeaderModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null);
  const [selectedField, setSelectedField] = useState<string>('');
  const [headerRowIndex, setHeaderRowIndex] = useState<number | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    style: null,
    brand: null,
    imageAdd: null,
    readImage: null,
    category: null,
    colorName: null,
  });
  const [manualBrand, setManualBrand] = useState<string>('');
  const showToast = useCustomToast();

  // Constants
  const requiredColumns = ['style', 'brand'];
  const optionalColumns = ['category', 'colorName', 'readImage', 'imageAdd'];
  const allColumns = [...requiredColumns, ...optionalColumns];
  const targetHeaders = ['BRAND', 'STYLE'];
  const SERVER_URL = 'https://backend-dev.iconluxury.group';

  // #### Event Handlers
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const selectedFile = event.target.files?.[0];
      if (!selectedFile) return;
      if (!['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'].includes(selectedFile.type)) {
        throw new Error('Invalid file type. Please upload an Excel file (.xlsx or .xls)');
      }
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setExcelData({ headers: [], rows: [] });
      setColumnMapping({ style: null, brand: null, imageAdd: null, readImage: null, category: null, colorName: null });
      setManualBrand('');
      setIsLoadingFile(true);
  
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (!data) throw new Error('Failed to read file');
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
  
          // Limit to top 50 rows
          const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
          const limitedRange = {
            s: { c: 0, r: 0 }, // Start at A1
            e: { c: range.e.c, r: Math.min(49, range.e.r) } // End at column max, row 49 (50 rows total)
          };
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            range: limitedRange,
            blankrows: true,
            defval: '',
            raw: true
          });
          const allRows = jsonData; // Top 50 rows
          const preview = allRows;
          const mappingPreview = allRows; // Already limited to 50
          setPreviewRows(preview);
          setMappingPreviewRows(mappingPreview);
  
          let headerRowIndex: number | null = null;
          for (let i = 0; i < Math.min(10, preview.length); i++) {
            const row = preview[i] as any[];
            const rowValues = row.map((cell: any) => String(cell || "").toUpperCase().trim());
            const matchedHeaders = rowValues.filter((value: string) => targetHeaders.includes(value));
            if (matchedHeaders.length >= 2) {
              headerRowIndex = i;
              break;
            }
          }
  
          if (headerRowIndex !== null) {
            const headers = preview[headerRowIndex] as string[];
            const rows = preview.slice(headerRowIndex + 1).map(row => ({ row: row as ExcelJS.CellValue[] }));
            setExcelData({ headers, rows });
            const newColumnMapping: ColumnMapping = {
              style: null,
              brand: null,
              imageAdd: null,
              readImage: null,
              category: null,
              colorName: null,
            };
            headers.forEach((header, index) => {
              const upperHeader = String(header).toUpperCase().trim();
              if (upperHeader === 'STYLE') newColumnMapping.style = index;
              if (upperHeader === 'BRAND') newColumnMapping.brand = index;
            });
            setColumnMapping(newColumnMapping);
            setHeaderRowIndex(headerRowIndex);
            showToast('Header auto selected', `Row ${headerRowIndex + 1} selected`, 'info');
          } else {
            setIsHeaderModalOpen(true);
          }
        } catch (error) {
          throw new Error('Error parsing Excel file: ' + error.message);
        } finally {
          setIsLoadingFile(false);
        }
      };
      reader.onerror = () => { throw new Error('Error reading file'); };
      reader.readAsBinaryString(selectedFile);
    } catch (error) {
      showToast('File Upload Error', error.message, 'error');
      setFile(null);
      setFileName('');
      setIsLoadingFile(false);
    }
  };
  const handleRowSelect = (rowIndex: number) => {
    setSelectedRowIndex(rowIndex);
    setIsConfirmModalOpen(true);
  };

  const confirmHeaderSelect = () => {
    if (selectedRowIndex === null) return;
    const headers = previewRows[selectedRowIndex] as string[];
    const rows = previewRows.slice(selectedRowIndex + 1).map(row => ({ row: row as ExcelJS.CellValue[] }));
    setExcelData({ headers, rows });
    const newColumnMapping: ColumnMapping = {
      style: null,
      brand: null,
      imageAdd: null,
      readImage: null,
      category: null,
      colorName: null,
    };
    headers.forEach((header, index) => {
      const upperHeader = String(header).toUpperCase().trim();
      if (upperHeader === 'STYLE') newColumnMapping.style = index;
      if (upperHeader === 'BRAND') newColumnMapping.brand = index;
    });
    setColumnMapping(newColumnMapping);
    setHeaderRowIndex(selectedRowIndex);
    setIsHeaderModalOpen(false);
    setIsConfirmModalOpen(false);
    setIsLoadingFile(false);
    showToast('Header Selected', `Row ${selectedRowIndex + 1} confirmed`, 'info');
  };

  const applyManualBrand = () => {
    if (!manualBrand || columnMapping.brand !== null) return;
  
    // Insert manual brand as the second column
    const newHeaders = [
      excelData.headers[0], // Keep the first column (e.g., SEARCH)
      'BRAND (Manual)',     // Add manual brand as second column
      ...excelData.headers.slice(1), // Shift the rest of the columns
    ];
  
    const newRows = excelData.rows.map(row => ({
      row: [
        row.row[0], // Keep the first column
        manualBrand, // Insert manual brand
        ...row.row.slice(1), // Shift the rest of the row
      ],
    }));
  
    // Update column mappings
    const newColumnMapping = { ...columnMapping };

    // Shift mappings for columns originally at index 1 or higher (but not 'search')
    Object.keys(newColumnMapping).forEach(key => {
      if (key !== 'search' && newColumnMapping[key] >= 1) {
        newColumnMapping[key] += 1; // Shift by 1
      }
    });
    newColumnMapping.brand = 1; // Set brand to the second column
  
    setExcelData({ headers: newHeaders, rows: newRows });
    setColumnMapping(newColumnMapping);
    showToast('Manual Brand Applied', `Brand "${manualBrand}" added as second column`, 'success');
  };

  const handleSubmit = async () => {
  try {
    const missingRequired = requiredColumns.filter(col => columnMapping[col] === null);
    if (missingRequired.length > 0) {
      showToast('Missing Required Columns', `Map: ${missingRequired.join(', ')}`, 'warning');
      return;
    }
    if (!file) throw new Error('No file selected');
    if (headerRowIndex === null) throw new Error('Header row not selected');
    setIsLoadingFile(true);
    const formData = new FormData();
    formData.append('fileUploadImage', file);

    // Define the insertion point of the manual brand
    const insertIndex = 1;
    const isManualBrand = columnMapping.brand === insertIndex && excelData.headers[insertIndex] === 'BRAND (Manual)';

    const getOriginalIndex = (key) => {
      const mappedIndex = columnMapping[key];
      if (mappedIndex === null) return null;
      if (isManualBrand) {
        if (mappedIndex < insertIndex) return mappedIndex;
        if (mappedIndex > insertIndex) return mappedIndex - 1;
      }
      return mappedIndex;
    };

    const styleColIndex = getOriginalIndex('style');
    const styleCol = styleColIndex !== null ? indexToColumnLetter(styleColIndex) : 'A';
    const brandCol = isManualBrand ? 'MANUAL' : (columnMapping.brand !== null ? indexToColumnLetter(getOriginalIndex('brand')) : 'B');
    const imageAddColIndex = getOriginalIndex('imageAdd');
    const imageAddCol = imageAddColIndex !== null ? indexToColumnLetter(imageAddColIndex) : null;
    const readImageColIndex = getOriginalIndex('readImage');
    const readImageCol = readImageColIndex !== null ? indexToColumnLetter(readImageColIndex) : null;
    const colorColIndex = getOriginalIndex('colorName');
    const colorCol = colorColIndex !== null ? indexToColumnLetter(colorColIndex) : null;
    const categoryColIndex = getOriginalIndex('category');
    const categoryCol = categoryColIndex !== null ? indexToColumnLetter(categoryColIndex) : null;

    const imageColumnImage = readImageCol || imageAddCol;

    if (imageColumnImage) formData.append('imageColumnImage', imageColumnImage);
    formData.append('searchColImage', styleCol);
    formData.append('brandColImage', brandCol);
    if (colorCol) formData.append('ColorColImage', colorCol);
    if (categoryCol) formData.append('CategoryColImage', categoryCol);
    formData.append('header_index', String(headerRowIndex));

    if (isManualBrand) {
      formData.append('manualBrand', manualBrand);
    }

    // Add UserEmail to FormData if present
    if (userEmail) {
      formData.append('sendToEmail', userEmail);
    }

    const response = await fetch(`${SERVER_URL}/submitImage`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json', // Specify that we expect a JSON response
      },
      body: formData,
    });

    if (!response.ok) throw new Error(`Server error: ${response.status} - ${await response.text()}`);
    const result = await response.json();
    showToast('Success', 'Data submitted', 'success');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
    return result;
  } catch (error) {
    showToast('Submission Error', error.message, 'error');
    throw error;
  } finally {
    setIsLoadingFile(false);
  }
};

  const handleMappingConfirm = (confirm: boolean) => {
    if (confirm && selectedColumn !== null) {
      const newMapping = { ...columnMapping };
      Object.keys(newMapping).forEach(key => {
        if (newMapping[key] === selectedColumn) {
          newMapping[key] = null; // Reset any existing mapping for this column
        }
      });
      if (selectedField && selectedField !== '') {
        newMapping[selectedField] = selectedColumn; // Set new mapping
      }
      setColumnMapping(newMapping);
    }
    setIsMappingModalOpen(false);
    setSelectedColumn(null);
    setSelectedField('');
  };

  const openMappingModal = (columnIndex: number) => {
    setSelectedColumn(columnIndex);
    const currentField = Object.keys(columnMapping).find(key => columnMapping[key] === columnIndex);
    if (currentField) {
      setSelectedField(currentField);
    } else {
      if (columnMapping.style === null) setSelectedField('style');
      else if (columnMapping.brand === null) setSelectedField('brand');
      else if (columnMapping.category === null) setSelectedField('category');
      else if (columnMapping.colorName === null) setSelectedField('colorName');
      else setSelectedField('');
    }
    setIsMappingModalOpen(true);
  };

  // Computed Values
  const allRequiredSelected = requiredColumns.every(col => columnMapping[col] !== null);
  const missingRequired = requiredColumns.filter(col => columnMapping[col] === null);
  const mappedColumns = Object.entries(columnMapping)
    .filter(([_, index]) => index !== null)
    .map(([col, index]) => `${col}: ${excelData.headers[index as number] || `Column ${index! + 1}`}`);

  // ### JSX
  return (
    <Container
      maxW="container.xl"
      minH="100vh"
      py={0}
      bg="white"
      sx={{ backgroundColor: 'white !important' }}
    >
      <VStack spacing={4} align="start">
        {/* File Input and Submit Button */}
        <HStack spacing={4}>
          <FormControl w="sm">
            <Input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              disabled={isLoadingFile}
              borderColor="gray.300"
              color="black"
              bg="white"
              sx={{ backgroundColor: 'white !important' }}
              _hover={{ borderColor: 'gray.500' }}
            />
          </FormControl>
          <Button
            colorScheme="blue"
            leftIcon={<FiSend />}
            onClick={handleSubmit}
            isDisabled={!excelData.rows.length || isLoadingFile || !allRequiredSelected}
            isLoading={isLoadingFile}
          >
          </Button>
        </HStack>

        {/* File Name and Data Summary */}
        {excelData.headers.length > 0 && (
          <VStack align="start" spacing={1}>
            <Text fontSize="sm" color="gray.600">
              File: {fileName}
            </Text>
            {missingRequired.length > 0 ? (
              <Text fontSize="sm" color="red.500">
                Missing: {missingRequired.join(', ')}
              </Text>
            ) : (
              <Text fontSize="sm" color="green.500">
                Mapped: {mappedColumns.join(', ')}
              </Text>
            )}
            <Text fontSize="sm" color="gray.600">
              Rows: {excelData.rows.length}
            </Text>
          </VStack>
        )}

        {/* Manual Brand Input */}
        {excelData.rows.length > 0 && columnMapping.brand === null && (
          <HStack spacing={4}>
            <FormControl w="sm">
              <Input
                placeholder="Add Brand for All Rows"
                value={manualBrand}
                onChange={(e) => setManualBrand(e.target.value)}
                disabled={isLoadingFile}
                borderColor="gray.300"
                color="black"
                bg="white"
                sx={{ backgroundColor: 'white !important' }}
              />
            </FormControl>
            <Button
              colorScheme="orange"
              onClick={applyManualBrand}
              isDisabled={!manualBrand || isLoadingFile}
            >
              Apply
            </Button>
          </HStack>
        )}

        {/* Excel Data Table */}
        {excelData.rows.length > 0 && (
          <Box
            w="full"
            maxH="60vh"
            overflowX="auto"
            overflowY="auto"
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="md"
            p={0}
            bg="white"
            sx={{ backgroundColor: 'white !important' }}
          >
            {isLoadingFile ? (
              <VStack justify="center" h="full">
                <Spinner size="md" color="gray.500" />
                <Text color="gray.600">Loading...</Text>
              </VStack>
            ) : (
              <Box minW="max-content">
                <ExcelDataTableMemo
                  excelData={excelData}
                  columnMapping={columnMapping}
                  setColumnMapping={setColumnMapping}
                  onColumnClick={openMappingModal}
                  isManualBrand={columnMapping.brand !== null && excelData.headers[columnMapping.brand] === 'BRAND (Manual)'}
                  textColor="black"
                  fontWeight="bold"
                />
              </Box>
            )}
          </Box>
        )}
<Modal isOpen={isMappingModalOpen} onClose={() => setIsMappingModalOpen(false)}>
  <ModalOverlay />
  <ModalContent bg="white" sx={{ backgroundColor: 'white !important' }} maxW="80vw">
    <ModalHeader color="black">Map Column</ModalHeader>
    <ModalBody>
      <Text color="black">
        Map "{selectedColumn !== null ? excelData.headers[selectedColumn] || `Column ${selectedColumn + 1}` : ''}" to:
      </Text>
      <Select
        value={selectedField}
        onChange={(e) => setSelectedField(e.target.value)}
        mt={2}
        bg="white"
        color="black"
        borderColor="gray.300"
        _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px blue.500' }}
        _hover={{ borderColor: 'gray.500' }}
      >
        <option value="" style={{ backgroundColor: 'white', color: 'black' }}>
          None (Reset Mapping)
        </option>
        {allColumns.map(col => (
          <option key={col} value={col} style={{ backgroundColor: 'white', color: 'black' }}>
            {col}
          </option>
        ))}
      </Select>
      {selectedColumn !== null && mappingPreviewRows.length > 0 && (
        <Box mt={4} maxH="30vh" overflowY="auto">
          <Text color="black" fontWeight="bold" mb={2}>Column Preview (First 20 Rows):</Text>
          <Table size="sm" variant="simple">
            <Tbody>
              {mappingPreviewRows.slice(0, 20).map((row, rowIndex) => (
                <Tr key={rowIndex}>
                  <Td color="black" borderColor="gray.200">
                    {getDisplayValue(row[selectedColumn])}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}
    </ModalBody>
    <ModalFooter>
      <Button colorScheme="blue" mr={3} onClick={() => handleMappingConfirm(true)}>
        Confirm
      </Button>
      <Button
        variant="outline"
        color="gray.700"
        borderColor="gray.300"
        _hover={{ bg: 'gray.100', borderColor: 'gray.500' }}
        onClick={() => setIsMappingModalOpen(false)}
      >
        Cancel
      </Button>
    </ModalFooter>
  </ModalContent>
</Modal>

        {/* Header Selection Modal */}
        <Modal isOpen={isHeaderModalOpen} onClose={() => setIsHeaderModalOpen(false)}>
          <ModalOverlay />
          <ModalContent maxW="80vw" bg="white" sx={{ backgroundColor: 'white !important' }}>
            <ModalHeader color="black">Select Header Row</ModalHeader>
            <ModalBody maxH="60vh" overflowY="auto">
              <Table size="sm">
                <Tbody>
                  {previewRows.map((row, rowIndex) => (
                    <Tr
                      key={rowIndex}
                      onClick={() => handleRowSelect(rowIndex)}
                      cursor="pointer"
                      _hover={{ bg: 'gray.100' }}
                    >
                      {row.map((cell: any, cellIndex: number) => (
                        <Td key={cellIndex} color="black" borderColor="gray.200">
                          {getDisplayValue(cell)}
                        </Td>
                      ))}
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </ModalBody>
            <ModalFooter>
              <Button
                variant="outline"
                color="gray.700"
                borderColor="gray.300"
                _hover={{ bg: 'gray.100', borderColor: 'gray.500' }}
                onClick={() => setIsHeaderModalOpen(false)}
              >
                Cancel
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Confirm Header Modal */}
        <Modal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)}>
          <ModalOverlay />
          <ModalContent bg="white" sx={{ backgroundColor: 'white !important' }}>
            <ModalHeader color="black">Confirm Header</ModalHeader>
            <ModalBody>
              <Text color="black">Use row {selectedRowIndex !== null ? selectedRowIndex + 1 : ''} as header?</Text>
              {selectedRowIndex !== null && (
                <Text mt={2} color="black">{previewRows[selectedRowIndex].join(', ')}</Text>
              )}
            </ModalBody>
            <ModalFooter>
              <Button colorScheme="blue" mr={3} onClick={confirmHeaderSelect}>
                Confirm
              </Button>
              <Button
                variant="outline"
                color="gray.700"
                borderColor="gray.300"
                _hover={{ bg: 'gray.100', borderColor: 'gray.500' }}
                onClick={() => setIsConfirmModalOpen(false)}
              >
                Cancel
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </VStack>
    </Container>
  );
}
export const Route = createFileRoute('/google-serp-cms')({
  component: CMSGoogleSerpForm,
  validateSearch: searchSchema,
});