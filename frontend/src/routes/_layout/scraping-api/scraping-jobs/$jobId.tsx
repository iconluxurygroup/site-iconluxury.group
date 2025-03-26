import React, { useState, useEffect } from "react";
import { useSearch } from "@tanstack/react-router";
import { createFileRoute, useParams } from "@tanstack/react-router";
import {
  Container,
  Box,
  Text,
  Flex,
  Tabs,
  TabList,
  Input,
  TabPanels,
  Tab,
  TabPanel,
  Spinner,
  Button,
  Card,
  Link,
  CardBody,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Image,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
} from "@chakra-ui/react";
import useCustomToast from "../../../../hooks/useCustomToast";
import InfiniteScroll from "react-infinite-scroll-component";

interface JobDetails {
  id: number;
  inputFile: string;
  fileLocationUrl: string;
  fileLocationURLComplete?: string;
  imageStart: string;
  imageEnd?: string;
  fileStart: string;
  fileEnd?: string;
  userId?: number;
  userEmail?: string;
  logFileUrl: string | null;
  userHeaderIndex?: string;
  user: string;
  rec: number;
  img: number;
  apiUsed: string;
  resultFile: string;
  results: ResultItem[];
  records: RecordItem[];
}

interface ResultItem {
  resultId: number;
  entryId: number;
  imageUrl: string;
  imageDesc: string;
  imageSource: string;
  createTime: string;
  imageUrlThumbnail: string;
  sortOrder: number;
  imageIsFashion: number;
  aiCaption: string | null;
  aiJson: string | null;
  aiLabel: string | null;
}

interface RecordItem {
  entryId: number;
  fileId: number;
  excelRowId: number;
  productModel: string;
  productBrand: string;
  createTime: string;
  step1: string | null;
  step2: string | null;
  step3: string | null;
  step4: string | null;
  completeTime: string | null;
  productColor: string;
  productCategory: string;
  excelRowImageRef: string | null;
}

// **LogDisplay Component**
const LogDisplay: React.FC<{ logUrl: string | null }> = ({ logUrl }) => {
  const [logContent, setLogContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const showToast = useCustomToast();

  useEffect(() => {
    const fetchLog = async () => {
      if (!logUrl) return;
      setIsLoading(true);
      try {
        const response = await fetch(logUrl);
        if (!response.ok) throw new Error("Failed to fetch log");
        const text = await response.text();
        setLogContent(text);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
        setError(errorMessage);
        showToast("Log Fetch Error", errorMessage, "error");
      } finally {
        setIsLoading(false);
      }
    };
    fetchLog();
  }, [logUrl, showToast]);

  if (isLoading) return <Spinner color="green.300" />;
  if (error) return <Text color="red.500">{error}</Text>;
  if (!logContent) return <Text color="gray.600">No log content available</Text>;

  return (
    <Box
      maxH="300px"
      w="full"
      overflowY="auto"
      overflowX="auto"
      bg="gray.50"
      color="gray.800"
      p={2}
      borderRadius="md"
      border="1px solid"
      borderColor="gray.200"
    >
      <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>{logContent}</pre>
    </Box>
  );
};

// **OverviewTab Component**
const OverviewTab: React.FC<{
  job: JobDetails;
  sortBy: "match" | "linesheet" | null;
  setSortBy: (value: "match" | "linesheet" | null) => void;
  fetchJobData: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setActiveTab: (index: number) => void;
}> = ({ job, sortBy, setSortBy, fetchJobData, setSearchQuery, setActiveTab }) => {
  const [isRestarting, setIsRestarting] = useState(false);
  const [isCreatingXLS, setIsCreatingXLS] = useState(false);
  const [isMatchAISort, setIsMatchAISort] = useState(false);
  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const [isInitialSort, setIsInitialSort] = useState(false);
  const [isSearchSort, setIsSearchSort] = useState(false);
  const [isGeneratingDownload, setIsGeneratingDownload] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const showToast = useCustomToast();

  const [sortConfig, setSortConfig] = useState<{
    key: "domain" | "totalResults" | "positiveSortOrderCount";
    direction: "ascending" | "descending";
  }>({ key: "positiveSortOrderCount", direction: "descending" });

  const getDomain = (url: string): string => {
    try {
      const hostname = new URL(url).hostname;
      return hostname.replace(/^www\./, "");
    } catch {
      return "unknown";
    }
  };

  const domainData = job.results.reduce((acc, result) => {
    const domain = getDomain(result.imageSource);
    if (!acc[domain]) {
      acc[domain] = { totalResults: 0, positiveSortOrderCount: 0 };
    }
    acc[domain].totalResults += 1;
    if (result.sortOrder > 0) acc[domain].positiveSortOrderCount += 1;
    return acc;
  }, {} as Record<string, { totalResults: number; positiveSortOrderCount: number }>);

  const topDomains = Object.entries(domainData)
    .map(([domain, data]) => ({
      domain,
      totalResults: data.totalResults,
      positiveSortOrderCount: data.positiveSortOrderCount,
    }))
    .sort((a, b) => b.positiveSortOrderCount - a.positiveSortOrderCount)
    .slice(0, 20);

  const sortedTopDomains = [...topDomains].sort((a, b) => {
    if (sortConfig.key === "domain") {
      const aValue = a.domain.toLowerCase();
      const bValue = b.domain.toLowerCase();
      return sortConfig.direction === "ascending" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    } else if (sortConfig.key === "totalResults") {
      return sortConfig.direction === "ascending" ? a.totalResults - b.totalResults : b.totalResults - a.totalResults;
    } else {
      return sortConfig.direction === "ascending"
        ? a.positiveSortOrderCount - b.positiveSortOrderCount
        : b.positiveSortOrderCount - a.positiveSortOrderCount;
    }
  });

  const handleSort = (key: "domain" | "totalResults" | "positiveSortOrderCount") => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "ascending" ? "descending" : "ascending",
    }));
  };

  const handleDomainClick = (domain: string) => {
    setSearchQuery(domain);
    setActiveTab(2);
  };

  const handleApiCall = async (
    url: string,
    method: "GET" | "POST",
    setLoading: (value: boolean) => void,
    successMessage: string,
    body?: any
  ) => {
    setLoading(true);
    showToast("Action Started", `Initiating ${successMessage.toLowerCase()}`, "info");
    try {
      const headers: Record<string, string> = { Accept: "application/json" };
      if (method === "POST") headers["Content-Type"] = "application/json";
      const response = await fetch(url, {
        method,
        headers,
        body: method === "POST" && body ? JSON.stringify(body) : undefined,
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setLoading(false);
      showToast("Success", `${successMessage}: ${data.message || "Completed"}`, "success");
      fetchJobData();
    } catch (error) {
      setLoading(false);
      showToast("Error", `Failed to ${successMessage.toLowerCase()}: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
    }
  };

  const handleMatchAISort = () => handleApiCall(`https://dev-image-distro.popovtech.com/match_ai_sort/${job.id}`, "GET", setIsMatchAISort, "Match AI Sort");
  const handleInitialSort = () => handleApiCall(`https://dev-image-distro.popovtech.com/initial_sort/${job.id}`, "GET", setIsInitialSort, "Initial Sort");
  const handleSearchSort = () => handleApiCall(`https://dev-image-distro.popovtech.com/search_sort/${job.id}`, "GET", setIsSearchSort, "Search Sort");
  const handleRestartClick = () => handleApiCall(`https://dev-image-distro.popovtech.com/restart-failed-batch/`, "POST", setIsRestarting, "Restart Failed Batch", { file_id_db: String(job.id) });
  const handleGenerateDownload = () => handleApiCall(`https://dev-image-distro.popovtech.com/generate-download-file/`, "POST", setIsGeneratingDownload, "Generate Download File", { file_id: job.id });
  const handleProcessAI = () => handleApiCall(`https://dev-image-distro.popovtech.com/process-ai-analysis/`, "POST", setIsProcessingAI, "Process AI Analysis", { file_id: String(job.id) });

  return (
    <Box p={4} bg="white">
      <Flex justify="space-between" align="center" mb={4} flexWrap="wrap" gap={3}>
        <Text fontSize="lg" fontWeight="bold" color="gray.800">Job Overview</Text>
        <Flex gap={3} flexWrap="wrap">
          <Button size="sm" colorScheme="red" onClick={handleRestartClick} isLoading={isRestarting}>Dev Restart</Button>
          <Button size="sm" colorScheme="green" onClick={handleMatchAISort} isLoading={isMatchAISort}>Match AI Sort</Button>
          <Button size="sm" colorScheme="green" onClick={handleInitialSort} isLoading={isInitialSort}>Initial Sort</Button>
          <Button size="sm" colorScheme="green" onClick={handleSearchSort} isLoading={isSearchSort}>Search Sort</Button>
          <Button size="sm" colorScheme="blue" onClick={handleGenerateDownload} isLoading={isGeneratingDownload}>Generate Download</Button>
          <Button size="sm" colorScheme="purple" onClick={handleProcessAI} isLoading={isProcessingAI}>Process AI</Button>
          <Button size="sm" onClick={() => setIsFileModalOpen(true)}>View File Details</Button>
          <DetailsModal
            isOpen={isFileModalOpen}
            onClose={() => setIsFileModalOpen(false)}
            title={`File ${job.id}`}
            data={{
              ID: job.id,
              FileName: job.inputFile,
              FileLocationUrl: job.fileLocationUrl,
              FileLocationURLComplete: job.fileLocationURLComplete,
              ImageStartTime: job.imageStart,
              ImageCompleteTime: job.imageEnd,
              CreateFileStartTime: job.fileStart,
              CreateFileCompleteTime: job.fileEnd,
              UserID: job.userId,
              UserEmail: job.userEmail,
              LogFileURL: job.logFileUrl,
              UserHeaderIndex: job.userHeaderIndex,
            }}
          />
          <Button size="sm" colorScheme={sortBy === "match" ? "teal" : "gray"} onClick={() => setSortBy("match")}>Sort by Match</Button>
          <Button size="sm" colorScheme={sortBy === "linesheet" ? "teal" : "gray"} onClick={() => setSortBy("linesheet")}>Sort by Linesheet</Button>
          <Button size="sm" colorScheme={sortBy === null ? "teal" : "gray"} onClick={() => setSortBy(null)}>Clear Sort</Button>
        </Flex>
      </Flex>

      <Box mb={6}>
        <Stat><StatLabel color="gray.600">Job ID</StatLabel><StatNumber color="gray.800">{job.id}</StatNumber></Stat>
        <Stat mt={4}><StatLabel color="gray.600">Input File</StatLabel><StatHelpText wordBreak="break-all"><Link href={job.fileLocationUrl} isExternal color="green.300">{job.inputFile}</Link></StatHelpText></Stat>
        <Stat mt={4}><StatLabel color="gray.600">Status</StatLabel><StatNumber><Badge colorScheme={job.fileEnd ? "green" : "yellow"}>{job.fileEnd ? "Completed" : "Pending"}</Badge></StatNumber></Stat>
        {job.fileEnd && (
          <Stat mt={4}><StatLabel color="gray.600">Processing Duration</StatLabel><StatNumber color="gray.800">{((new Date(job.fileEnd).getTime() - new Date(job.fileStart).getTime()) / 1000 / 60).toFixed(2)} minutes</StatNumber></Stat>
        )}
        <Stat mt={4}><StatLabel color="gray.600">API Used</StatLabel><StatHelpText color="gray.800">{job.apiUsed}</StatHelpText></Stat>
        <Stat mt={4}><StatLabel color="gray.600">Total Results</StatLabel><StatNumber color="gray.800">{job.results.length}</StatNumber></Stat>
      </Box>

      {job.results.length > 0 && (
        <Box mt={6}>
          <Text fontSize="md" fontWeight="semibold" mb={2} color="gray.800">Top Domains by Positive Sort Orders (Top 20)</Text>
          <Table variant="simple" size="sm" colorScheme="blue">
            <Thead bg="gray.100">
              <Tr>
                <Th onClick={() => handleSort("domain")} cursor="pointer" color="gray.800">Domain {sortConfig.key === "domain" && (sortConfig.direction === "ascending" ? "↑" : "↓")}</Th>
                <Th onClick={() => handleSort("totalResults")} cursor="pointer" color="gray.800">Total Results {sortConfig.key === "totalResults" && (sortConfig.direction === "ascending" ? "↑" : "↓")}</Th>
                <Th onClick={() => handleSort("positiveSortOrderCount")} cursor="pointer" color="gray.800">Positive Sort Orders Count {sortConfig.key === "positiveSortOrderCount" && (sortConfig.direction === "ascending" ? "↑" : "↓")}</Th>
              </Tr>
            </Thead>
            <Tbody>
              {sortedTopDomains.map(({ domain, totalResults, positiveSortOrderCount }) => (
                <Tr key={domain}>
                  <Td><Text color="green.300" cursor="pointer" onClick={() => handleDomainClick(domain)} _hover={{ textDecoration: "underline" }}>{domain}</Text></Td>
                  <Td color="gray.800">{totalResults}</Td>
                  <Td color="gray.800">{positiveSortOrderCount}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}
    </Box>
  );
};

// **UsageTab Component**
const UsageTab = ({ job }: { job: JobDetails }) => {
  const totalRecords = job.records.length;
  const completedRecords = job.records.filter((record) => record.completeTime).length;
  const pendingRecords = totalRecords - completedRecords;
  const totalImages = job.results.length;
  const imagesPerRecord = totalRecords > 0 ? Math.round(totalImages / totalRecords) : "N/A";
  const totalRequests = totalRecords;
  const successfulRequests = job.records.filter((record) => job.results.some((result) => result.entryId === record.entryId)).length;
  const successRate = totalRequests > 0 ? `${((successfulRequests / totalRequests) * 100).toFixed(1)}%` : "N/A";

  const calculateAvgResponseTime = (): string => {
    const completedRecordsWithTimes = job.records.filter((record) => record.createTime && record.completeTime);
    if (completedRecordsWithTimes.length === 0) return "N/A";
    const totalDuration = completedRecordsWithTimes.reduce((sum, record) => {
      const start = new Date(record.createTime!).getTime();
      const end = new Date(record.completeTime!).getTime();
      return sum + (end - start);
    }, 0);
    return `${(totalDuration / completedRecordsWithTimes.length / 1000).toFixed(2)} seconds`;
  };
  const avgResponseTime = calculateAvgResponseTime();

  return (
    <Box p={4} bg="white">
      <Text fontSize="lg" fontWeight="bold" mb={4} color="gray.800">Usage Statistics</Text>
      <Flex direction="column" gap={6}>
        <Card shadow="md" borderWidth="1px" bg="white">
          <CardBody>
            <Stat><StatLabel color="gray.600">Total Records</StatLabel><StatNumber color="gray.800">{totalRecords}</StatNumber></Stat>
            <Stat mt={4}><StatLabel color="gray.600">Completed Records</StatLabel><StatNumber color="gray.800">{completedRecords}</StatNumber></Stat>
            <Stat mt={4}><StatLabel color="gray.600">Pending Records</StatLabel><StatNumber color="gray.800">{pendingRecords}</StatNumber></Stat>
          </CardBody>
        </Card>
        <Card shadow="md" borderWidth="1px" bg="white">
          <CardBody>
            <Stat><StatLabel color="gray.600">Total Images Scraped</StatLabel><StatNumber color="gray.800">{totalImages}</StatNumber></Stat>
            <Stat mt={4}><StatLabel color="gray.600">Average Images per Record</StatLabel><StatNumber color="gray.800">{imagesPerRecord}</StatNumber></Stat>
          </CardBody>
        </Card>
        <Card shadow="md" borderWidth="1px" bg="white">
          <CardBody>
            <Text fontSize="md" fontWeight="semibold" mb={2} color="gray.800">Scraping Metrics</Text>
            <Table variant="simple" size="sm" colorScheme="blue">
              <Thead bg="gray.100"><Tr><Th color="gray.800">Metric</Th><Th color="gray.800">Value</Th></Tr></Thead>
              <Tbody>
                <Tr><Td color="gray.800">Total Requests</Td><Td color="gray.800">{totalRequests}</Td></Tr>
                <Tr><Td color="gray.800">Successful Requests</Td><Td color="gray.800">{successfulRequests}</Td></Tr>
                <Tr><Td color="gray.800">Success Rate</Td><Td color="gray.800">{successRate}</Td></Tr>
                <Tr><Td color="gray.800">Average Response Time</Td><Td color="gray.800">{avgResponseTime}</Td></Tr>
              </Tbody>
            </Table>
          </CardBody>
        </Card>
      </Flex>
    </Box>
  );
};

// **DetailsModal Component**
const DetailsModal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; data: Record<string, any> | null }> = ({ isOpen, onClose, title, data }) => {
  const capitalizeKey = (key: string) => key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase()).trim();

  const renderValue = (key: string, value: any) => {
    if (value === null || value === undefined) return <Text color="gray.400">N/A</Text>;
    let displayValue = value;
    if (typeof value === "string" && (key.toLowerCase().includes("description") || key.toLowerCase().includes("aicaption"))) {
      displayValue = value.replace(/\\u0026/g, "&").replace(/\\'/g, "'");
    }
    if (key.toLowerCase().includes("json") && value) {
      const jsonValue = typeof value === "string" ? JSON.parse(value) : value;
      return (
        <Box maxH="500px" overflowY="auto" bg="gray.50" p={3} borderRadius="md" border="1px solid" borderColor="gray.200" fontSize="xs">
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", color: "blue.600" }}>{JSON.stringify(jsonValue, null, 2)}</pre>
        </Box>
      );
    }
    if (typeof displayValue === "string" && /^(https?:\/\/[^\s]+)$/.test(displayValue)) {
      return <Link href={displayValue} color="blue.500" isExternal>{displayValue}</Link>;
    }
    return <Text>{displayValue}</Text>;
  };

  if (!data) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} size="full">
        <ModalOverlay />
        <ModalContent maxW="90vw" maxH="70vh" mx="auto" my={4}>
          <ModalHeader fontSize="xl" fontWeight="bold">{title}</ModalHeader>
          <ModalBody><Text fontSize="md" color="gray.600">No data available</Text></ModalBody>
        </ModalContent>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="full">
      <ModalOverlay />
      <ModalContent maxW="90vw" maxH="80vh" mx="auto" my={4} borderRadius="md">
        <ModalHeader fontSize="xl" fontWeight="bold" pb={2}>{data.id ? `${title} (ID: ${data.id})` : title}</ModalHeader>
        <ModalBody overflowY="auto">
          <Table variant="simple" size="md" colorScheme="gray">
            <Tbody>
              {Object.entries(data).filter(([key]) => key.toLowerCase() !== "id").map(([key, value]) => (
                <Tr key={key}>
                  <Td fontWeight="semibold" color="gray.700" w="25%" py={3}>{capitalizeKey(key)}</Td>
                  <Td wordBreak="break-word" color="gray.800" py={3}>{renderValue(key, value)}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

// **RecordsTab Component**
const RecordsTab: React.FC<{ job: { records: RecordItem[] } }> = ({ job }) => {
  const showToast = useCustomToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfigRecords, setSortConfigRecords] = useState<{ key: string; direction: "ascending" | "descending" } | null>(null);
  const [currentPageRecords, setCurrentPageRecords] = useState(0);
  const [selectedRecord, setSelectedRecord] = useState<RecordItem | null>(null);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const itemsPerPage = 20;

  const handleSortRecords = (key: string) => {
    setSortConfigRecords((prev) => ({
      key,
      direction: prev?.key === key && prev.direction === "ascending" ? "descending" : "ascending",
    }));
    setCurrentPageRecords(0);
  };

  const filteredRecords = job.records.filter((record) =>
    [record.productModel, record.productBrand, String(record.entryId), record.excelRowId?.toString()]
      .map((v) => (v || "").toLowerCase())
      .some((v) => v.includes(searchQuery.toLowerCase()))
  );

  const sortedRecords = [...filteredRecords].sort((a, b) => {
    if (!sortConfigRecords) return 0;
    const { key, direction } = sortConfigRecords;
    const aValue = a[key as keyof RecordItem];
    const bValue = b[key as keyof RecordItem];
    if (typeof aValue === "number" && typeof bValue === "number") {
      return direction === "ascending" ? aValue - bValue : bValue - aValue;
    }
    const aStr = String(aValue || "").toLowerCase();
    const bStr = String(bValue || "").toLowerCase();
    return direction === "ascending" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
  });

  const pageCountRecords = Math.ceil(sortedRecords.length / itemsPerPage);
  const displayedRecords = sortedRecords.slice(currentPageRecords * itemsPerPage, (currentPageRecords + 1) * itemsPerPage);

  useEffect(() => {
    setCurrentPageRecords(0);
  }, [searchQuery, sortConfigRecords]);

  const hasThumbnails = filteredRecords.some((record) => record.excelRowImageRef);

  return (
    <Box p={4} bg="white">
      <Flex justify="space-between" align="center" mb={4} flexWrap="wrap" gap={3}>
        <Text fontSize="lg" fontWeight="bold" color="gray.800">Job Records</Text>
        <Input
          placeholder="Search records..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          width="300px"
          borderColor="green.300"
          _focus={{ borderColor: "green.300" }}
          color="gray.800"
          bg="white"
        />
      </Flex>
      <Table variant="simple" size="sm" colorScheme="blue">
        <Thead bg="gray.100">
          <Tr>
            {hasThumbnails && <Th w="60px" color="gray.800">Excel Picture</Th>}
            <Th w="80px" onClick={() => handleSortRecords("entryId")} cursor="pointer" color="gray.800">Entry ID {sortConfigRecords?.key === "entryId" && (sortConfigRecords.direction === "ascending" ? "↑" : "↓")}</Th>
            <Th w="80px" onClick={() => handleSortRecords("fileId")} cursor="pointer" color="gray.800">File ID {sortConfigRecords?.key === "fileId" && (sortConfigRecords.direction === "ascending" ? "↑" : "↓")}</Th>
            <Th w="80px" onClick={() => handleSortRecords("excelRowId")} cursor="pointer" color="gray.800">Excel Row ID {sortConfigRecords?.key === "excelRowId" && (sortConfigRecords.direction === "ascending" ? "↑" : "↓")}</Th>
            <Th w="120px" onClick={() => handleSortRecords("productModel")} cursor="pointer" color="gray.800">Style # {sortConfigRecords?.key === "productModel" && (sortConfigRecords.direction === "ascending" ? "↑" : "↓")}</Th>
            <Th w="120px" onClick={() => handleSortRecords("productBrand")} cursor="pointer" color="gray.800">Brand {sortConfigRecords?.key === "productBrand" && (sortConfigRecords.direction === "ascending" ? "↑" : "↓")}</Th>
            <Th w="80px" color="gray.800">Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {displayedRecords.map((record) => (
            <Tr key={record.entryId}>
              {record.excelRowImageRef ? (
                <Image
                  src={record.excelRowImageRef}
                  alt={record.productModel || "Record ID " + record.entryId}
                  maxW="80px"
                  maxH="80px"
                  objectFit="cover"
                  cursor="pointer"
                  onClick={() => {
                    if (record.excelRowImageRef) {
                      window.open(record.excelRowImageRef, "_blank");
                    }
                  }}
                  onError={(e) => { showToast("Image Load Failed", `Failed to load S3 image: ${record.excelRowImageRef}`, "warning"); e.currentTarget.style.display = "none"; }}
                  fallback={<Text fontSize="xs" color="gray.600">No picture</Text>}
                  loading="lazy"
                />
              ) : (
                <Text fontSize="xs" color="gray.600">No picture</Text>
              )}
              <Td w="80px" color="gray.800">{record.entryId || "N/A"}</Td>
              <Td w="80px" color="gray.800">{record.fileId || "N/A"}</Td>
              <Td w="80px" color="gray.800">{record.excelRowId || "N/A"}</Td>
              <Td w="120px" color="gray.800">{record.productModel || "N/A"}</Td>
              <Td w="120px" color="gray.800">{record.productBrand || "N/A"}</Td>
              <Td w="80px">
                <Button size="xs" onClick={() => { setSelectedRecord(record); setIsRecordModalOpen(true); }}>View Details</Button>
              </Td>
            </Tr>
          ))}
          {displayedRecords.length === 0 && (
            <Tr><Td colSpan={hasThumbnails ? 7 : 6} textAlign="center" color="gray.600">No records match your search query on this page.</Td></Tr>
          )}
        </Tbody>
      </Table>
      {pageCountRecords > 1 && (
        <Flex justify="center" mt={4} align="center" gap={2}>
          <Button size="sm" onClick={() => setCurrentPageRecords(0)} isDisabled={currentPageRecords === 0}>First</Button>
          <Button size="sm" onClick={() => setCurrentPageRecords((prev) => Math.max(prev - 1, 0))} isDisabled={currentPageRecords === 0}>Previous</Button>
          <Text color="gray.800">Page {currentPageRecords + 1} of {pageCountRecords}</Text>
          <Button size="sm" onClick={() => setCurrentPageRecords((prev) => Math.min(prev + 1, pageCountRecords - 1))} isDisabled={currentPageRecords === pageCountRecords - 1}>Next</Button>
          <Button size="sm" onClick={() => setCurrentPageRecords(pageCountRecords - 1)} isDisabled={currentPageRecords === pageCountRecords - 1}>Last</Button>
        </Flex>
      )}
      <DetailsModal isOpen={isRecordModalOpen} onClose={() => setIsRecordModalOpen(false)} title={`Record ${selectedRecord?.entryId || "Details"}`} data={selectedRecord} />
    </Box>
  );
};

// **ResultsTab Component**
const ResultsTab: React.FC<{ job: JobDetails; sortBy: "match" | "linesheet" | null; searchQuery: string; setSearchQuery: (value: string) => void }> = ({ job, sortBy }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfigResults, setSortConfigResults] = useState<{ key: string; direction: "ascending" | "descending" } | null>(null);
  const [currentPageResults, setCurrentPageResults] = useState(0);
  const [selectedResult, setSelectedResult] = useState<ResultItem | null>(null);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const itemsPerPage = 20;

  const handleSortResults = (key: string) => {
    setSortConfigResults((prev) => ({
      key,
      direction: prev?.key === key && prev.direction === "ascending" ? "descending" : "ascending",
    }));
    setCurrentPageResults(0);
  };

  const filteredResults = job.results.filter((result) =>
    [result.imageDesc, result.imageSource, String(result.resultId)]
      .map((v) => (v || "").toLowerCase())
      .some((v) => v.includes(searchQuery.toLowerCase()))
  );

  const sortedResults = [...filteredResults].sort((a, b) => {
    // Apply sortBy logic first
    if (sortBy === "match" && a.sortOrder !== b.sortOrder) {
      return b.sortOrder - a.sortOrder; // Higher sortOrder (better match) first
    }
    if (sortBy === "linesheet" && a.createTime !== b.createTime) {
      return new Date(a.createTime).getTime() - new Date(b.createTime).getTime(); // Earlier createTime first
    }
    // Fallback to sortConfigResults if sortBy is null or doesn't apply
    if (!sortConfigResults) return 0;
    const { key, direction } = sortConfigResults;
    const aValue = a[key as keyof ResultItem];
    const bValue = b[key as keyof ResultItem];
    if (typeof aValue === "number" && typeof bValue === "number") {
      return direction === "ascending" ? aValue - bValue : bValue - aValue;
    }
    const aStr = String(aValue || "").toLowerCase();
    const bStr = String(bValue || "").toLowerCase();
    return direction === "ascending" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
  });

  const pageCountResults = Math.ceil(sortedResults.length / itemsPerPage);
  const displayedResults = sortedResults.slice(currentPageResults * itemsPerPage, (currentPageResults + 1) * itemsPerPage);

  useEffect(() => {
    setCurrentPageResults(0);
  }, [searchQuery, sortConfigResults, sortBy]);

  return (
    <Box p={4} bg="white">
      <Flex justify="space-between" align="center" mb={4} flexWrap="wrap" gap={3}>
        <Text fontSize="lg" fontWeight="bold" color="gray.800">Job Results</Text>
        <Input
          placeholder="Search by description, source, etc..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          width="300px"
          borderColor="green.300"
          _focus={{ borderColor: "green.300" }}
          color="gray.800"
          bg="white"
        />
      </Flex>
      <Table variant="simple" size="sm" colorScheme="blue">
        <Thead bg="gray.100">
          <Tr>
            <Th w="80px" onClick={() => handleSortResults("resultId")} cursor="pointer" color="gray.800">Result ID {sortConfigResults?.key === "resultId" && (sortConfigResults.direction === "ascending" ? "↑" : "↓")}</Th>
            <Th w="200px" onClick={() => handleSortResults("imageDesc")} cursor="pointer" color="gray.800">Description {sortConfigResults?.key === "imageDesc" && (sortConfigResults.direction === "ascending" ? "↑" : "↓")}</Th>
            <Th w="120px" onClick={() => handleSortResults("imageSource")} cursor="pointer" color="gray.800">Source {sortConfigResults?.key === "imageSource" && (sortConfigResults.direction === "ascending" ? "↑" : "↓")}</Th>
            <Th w="80px" color="gray.800">Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {displayedResults.map((result) => (
            <Tr key={result.resultId}>
              <Td w="80px" color="gray.800">{result.resultId || "N/A"}</Td>
              <Td w="200px" color="gray.800">{result.imageDesc || "N/A"}</Td>
              <Td w="120px" color="gray.800">{result.imageSource || "N/A"}</Td>
              <Td w="80px"><Button size="xs" onClick={() => { setSelectedResult(result); setIsResultModalOpen(true); }}>View Details</Button></Td>
            </Tr>
          ))}
          {displayedResults.length === 0 && (
            <Tr><Td colSpan={4} textAlign="center" color="gray.600">No results match your search query on this page.</Td></Tr>
          )}
        </Tbody>
      </Table>
      {pageCountResults > 1 && (
        <Flex justify="center" mt={4} align="center" gap={2}>
          <Button size="sm" onClick={() => setCurrentPageResults(0)} isDisabled={currentPageResults === 0}>First</Button>
          <Button size="sm" onClick={() => setCurrentPageResults((prev) => Math.max(prev - 1, 0))} isDisabled={currentPageResults === 0}>Previous</Button>
          <Text color="gray.800">Page {currentPageResults + 1} of {pageCountResults}</Text>
          <Button size="sm" onClick={() => setCurrentPageResults((prev) => Math.min(prev + 1, pageCountResults - 1))} isDisabled={currentPageResults === pageCountResults - 1}>Next</Button>
          <Button size="sm" onClick={() => setCurrentPageResults(pageCountResults - 1)} isDisabled={currentPageResults === pageCountResults - 1}>Last</Button>
        </Flex>
      )}
      <DetailsModal isOpen={isResultModalOpen} onClose={() => setIsResultModalOpen(false)} title={`Result ${selectedResult?.resultId || "Details"}`} data={selectedResult} />
    </Box>
  );
};

// **LogsTab Component**
const LogsTab = ({ job }: { job: JobDetails }) => {
  return (
    <Box p={4} bg="white">
      <Flex justify="space-between" align="center" mb={4}>
        <Text fontSize="lg" fontWeight="bold" color="gray.800">Logs</Text>
        {job.logFileUrl && (
          <Button size="sm" colorScheme="blue" onClick={() => window.open(job.logFileUrl as string, "_blank")}>Download Log File</Button>
        )}
      </Flex>
      <Flex direction="column" gap={6}>
        <Card shadow="md" borderWidth="1px" bg="white">
          <CardBody>
            <Text fontSize="md" fontWeight="semibold" mb={2} color="gray.800">Timeline Events</Text>
            <Table variant="simple" size="sm" colorScheme="blue">
              <Thead bg="gray.100"><Tr><Th color="gray.800">Event</Th><Th color="gray.800">Details</Th></Tr></Thead>
              <Tbody>
                <Tr><Td color="gray.800">File Start</Td><Td color="gray.800">{new Date(job.fileStart).toLocaleString()}</Td></Tr>
                {job.fileEnd && <Tr><Td color="gray.800">File Roughly</Td><Td color="gray.800">{new Date(job.fileEnd).toLocaleString()}</Td></Tr>}
                <Tr><Td color="gray.800">Image Start</Td><Td color="gray.800">{new Date(job.imageStart).toLocaleString()}</Td></Tr>
                {job.imageEnd && <Tr><Td color="gray.800">Image End</Td><Td color="gray.800">{new Date(job.imageEnd).toLocaleString()}</Td></Tr>}
              </Tbody>
            </Table>
          </CardBody>
        </Card>
        <Card shadow="md" borderWidth="1px" bg="white">
          <CardBody><Text fontSize="md" fontWeight="semibold" mb={2} color="gray.800">Log File Preview</Text><LogDisplay logUrl={job.logFileUrl} /></CardBody>
        </Card>
      </Flex>
    </Box>
  );
};

// **SearchRowsTab Component**
const SearchRowsTab: React.FC<{ job: JobDetails }> = ({ job }) => {
  const showToast = useCustomToast();
  const [showFileDetails, setShowFileDetails] = useState(true);
  const [showResultDetails, setShowResultDetails] = useState(false);
  const [numImages, setNumImages] = useState(1);
  const [hideEmptyRows, setHideEmptyRows] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: "ascending" | "descending" }>({ key: null, direction: "ascending" });
  const [currentPage, setCurrentPage] = useState(0);
  const [viewMode, setViewMode] = useState<"pagination" | "infinite">("pagination");
  const [displayCount, setDisplayCount] = useState(20);
  const itemsPerPage = 20;

  useEffect(() => {
    const maxImages = showResultDetails ? 1 : 5;
    setNumImages((prev) => (prev > maxImages ? maxImages : prev));
  }, [showResultDetails]);

  useEffect(() => {
    setCurrentPage(0);
  }, [sortConfig, hideEmptyRows]);

  const getImagesForEntry = (entryId: number, limit: number): ResultItem[] => {
    const filteredResults = job.results.filter((r) => r.entryId === entryId && r.sortOrder > 0);
    return [...filteredResults].sort((a, b) => a.sortOrder - b.sortOrder).slice(0, limit);
  };

  const getPositiveSortCountForEntry = (entryId: number): number => {
    return job.results.filter((r) => r.entryId === entryId && r.sortOrder > 0).length;
  };

  const getTotalImageCountForEntry = (entryId: number): number => {
    return job.results.filter((r) => r.entryId === entryId).length;
  };

  const shortenUrl = (url: string): string => {
    if (!url) return "";
    let cleanedUrl = url.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
    if (cleanedUrl.length <= 22) return cleanedUrl;
    if (cleanedUrl.length <= 40) return `${cleanedUrl.slice(0, 12)}...${cleanedUrl.slice(-10)}`;
    else return `${cleanedUrl.slice(0, 20)}...${cleanedUrl.slice(-20)}`;
  };

  const googleSearch = (model: string): string => `https://www.google.com/search?q=${encodeURIComponent(model || "")}&udm=2`;
  const googleSearchBrandModelUrl = (model: string, brand: string): string => `https://www.google.com/search?q=${encodeURIComponent(`${brand || ""} ${model || ""}`)}&udm=2`;

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>, url: string) => {
    e.preventDefault();
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleIncreaseImages = () => {
    setShowResultDetails(false);
    setNumImages((prev) => Math.min(prev + 1, showResultDetails ? 1 : 5));
  };

  const handleDecreaseImages = () => {
    setNumImages((prev) => Math.max(prev - 1, 1));
  };

  const handleRowIdClick = (e: React.MouseEvent<HTMLElement, MouseEvent>, entryId: string) => {
    e.preventDefault();
    const url = `${window.location.pathname}?activeTab=2&search=${encodeURIComponent(entryId || "")}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "ascending" ? "descending" : "ascending",
    }));
  };

  const hasPositiveSortImages = job.records.some((record) => getPositiveSortCountForEntry(record.entryId) > 0);
  const displayedRecords = hideEmptyRows && hasPositiveSortImages
    ? job.records.filter((record) => getPositiveSortCountForEntry(record.entryId) > 0)
    : job.records;

  const sortedRecords = [...displayedRecords].sort((a, b) => {
    if (!sortConfig.key) return 0;
    let aValue: any, bValue: any;
    if (sortConfig.key === "positiveSortCount") {
      aValue = getPositiveSortCountForEntry(a.entryId);
      bValue = getPositiveSortCountForEntry(b.entryId);
    } else if (sortConfig.key === "totalImageCount") {
      aValue = getTotalImageCountForEntry(a.entryId);
      bValue = getTotalImageCountForEntry(b.entryId);
    } else {
      aValue = a[sortConfig.key as keyof RecordItem] || "";
      bValue = b[sortConfig.key as keyof RecordItem] || "";
    }
    if (aValue < bValue) return sortConfig.direction === "ascending" ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === "ascending" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedRecords.length / itemsPerPage);
  const paginatedRecords = sortedRecords.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);
  const recordsToDisplay = viewMode === "pagination" ? paginatedRecords : sortedRecords.slice(0, displayCount);
  const hasThumbnails = sortedRecords.some((record) => record.excelRowImageRef);

  const toggleViewMode = () => {
    setViewMode((prev) => (prev === "pagination" ? "infinite" : "pagination"));
    if (viewMode === "pagination") setDisplayCount(20);
    else setCurrentPage(0);
  };

  return (
    <Box p={4} bg="white">
      <Flex justify="space-between" align="center" mb={4} flexWrap="wrap" gap={3}>
        <Text fontSize="lg" fontWeight="bold" color="gray.800">File Rows ({sortedRecords.length})</Text>
        <Flex gap={3}>
          <Button size="sm" colorScheme="blue" onClick={() => setShowResultDetails(!showResultDetails)}>
            {showResultDetails ? "- Picture Details" : "+ Picture Details"}
          </Button>
          <Button size="sm" colorScheme="blue" onClick={() => setShowFileDetails(!showFileDetails)}>
            {showFileDetails ? "- File Details" : "+ File Details"}
          </Button>
          <Button
            size="sm"
            onClick={() => job.records.length > 0 && setHideEmptyRows(!hideEmptyRows)}
            colorScheme={job.records.length === 0 ? "gray" : "blue"}
            variant={job.records.length === 0 ? "outline" : "solid"}
          >
            {hideEmptyRows ? "Show All Rows" : "Hide Empty Rows"}
          </Button>
          <Flex align="center" gap={2}>
            <Button size="sm" onClick={handleDecreaseImages} isDisabled={numImages <= 1} colorScheme="blue">-</Button>
            <Text color="gray.800">{numImages}</Text>
            <Button size="sm" onClick={handleIncreaseImages} isDisabled={numImages >= (showResultDetails ? 1 : 5)} colorScheme="blue">+</Button>
          </Flex>
          <Button size="sm" onClick={toggleViewMode}>{viewMode === "pagination" ? "Switch to Infinite Scroll" : "Switch to Pagination"}</Button>
        </Flex>
      </Flex>

      {viewMode === "infinite" ? (
        <InfiniteScroll
          dataLength={recordsToDisplay.length}
          next={() => setDisplayCount((prev) => prev + 20)}
          hasMore={displayCount < sortedRecords.length}
          loader={<Text>Loading more records...</Text>}
          endMessage={<Text>No more records to load.</Text>}
          style={{ overflow: "auto" }}
        >
          <Table variant="simple" size="sm" borderWidth="1px" borderColor="gray.200" colorScheme="blue">
            <Thead bg="gray.100">
              <Tr>
                {showFileDetails && hasThumbnails && <Th w="60px" bg="gray.200" color="gray.800">Excel Picture</Th>}
                {Array.from({ length: numImages }).map((_, index) => (
                  <React.Fragment key={`header-${index}`}>
                    <Th w="80px" color="gray.800">Picture {index + 1}</Th>
                    {showResultDetails && <Th w="180px" bg="gray.200" color="gray.800">Picture Detail {index + 1}</Th>}
                  </React.Fragment>
                ))}
                <Th w="70px" onClick={() => handleSort("excelRowId")} cursor="pointer" color="gray.800">
                  Row # {sortConfig.key === "excelRowId" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </Th>
                <Th w="130px" onClick={() => handleSort("productModel")} cursor="pointer" color="gray.800">
                  Style # {sortConfig.key === "productModel" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </Th>
                <Th w="130px" onClick={() => handleSort("productBrand")} cursor="pointer" color="gray.800">
                  Brand {sortConfig.key === "productBrand" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </Th>
                {showFileDetails && (
                  <>
                    <Th w="100px" bg="gray.200" onClick={() => handleSort("productColor")} cursor="pointer" color="gray.800">
                      Color Name {sortConfig.key === "productColor" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
                    </Th>
                    <Th w="100px" bg="gray.200" onClick={() => handleSort("productCategory")} cursor="pointer" color="gray.800">
                      Category {sortConfig.key === "productCategory" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
                    </Th>
                  </>
                )}
                <Th w="80px" onClick={() => handleSort("totalImageCount")} cursor="pointer" color="gray.800">
                  Total Image {sortConfig.key === "totalImageCount" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </Th>
                <Th w="80px" onClick={() => handleSort("positiveSortCount")} cursor="pointer" color="gray.800">
                  Positive Count {sortConfig.key === "positiveSortCount" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {recordsToDisplay.map((record) => {
                const imagedetails = getImagesForEntry(record.entryId, numImages);
                const totalImageCount = getTotalImageCountForEntry(record.entryId);
                const positiveSortCount = getPositiveSortCountForEntry(record.entryId);
                return (
                  <Tr key={record.entryId} _hover={{ bg: "gray.50" }} opacity={positiveSortCount === 0 && !hideEmptyRows ? 0.8 : 1}>
                    {showFileDetails && hasThumbnails && (
                      <Td w="60px" bg="gray.50">
                        {record.excelRowImageRef ? (
                          <Image
                            src={record.excelRowImageRef}
                            alt={`Pic of ${record.productModel || "Record"}`}
                            maxW="60px"
                            maxH="60px"
                            fallback={<Text fontSize="xs" color="gray.600">Failed</Text>}
                            objectFit="cover"
                            onError={() => showToast("Thumbnail Error", `Failed to load thumbnail for record ${record.entryId}`, "error")}
                          />
                        ) : (
                          <Text fontSize="xs" color="gray.600">No image</Text>
                        )}
                      </Td>
                    )}
                    {imagedetails.map((image, index) => (
                      <React.Fragment key={index}>
                        <Td w="80px">
                          <Image
                            src={image.imageUrlThumbnail}
                            alt={image.imageDesc || "No description"}
                            maxW="60px"
                            maxH="60px"
                            objectFit="cover"
                            fallback={<Text fontSize="xs" color="gray.600">No image</Text>}
                            onError={() => showToast("Image Error", `Failed to load image ${index + 1} for record ${record.entryId}`, "error")}
                          />
                        </Td>
                        {showResultDetails && (
                          <Td w="180px" bg="gray.50">
                            <Box wordBreak="break-all">
                              <Text fontSize="xs">
                                <a href={googleSearch(image.imageDesc)} onClick={(e) => handleLinkClick(e, googleSearch(image.imageDesc))} style={{ color: "#1a73e8" }}>
                                  {image.imageDesc || "N/A"}
                                </a>
                              </Text>
                              <Text fontSize="xs" color="green.300">
                                <a href={image.imageSource} onClick={(e) => handleLinkClick(e, image.imageSource)}>{shortenUrl(image.imageSource)}</a>
                              </Text>
                              <Text fontSize="xs" color="green.300">
                                <a href={image.imageUrl} onClick={(e) => handleLinkClick(e, image.imageUrl)}>{shortenUrl(image.imageUrl)}</a>
                              </Text>
                              {image.aiCaption && <Text fontSize="xs" color="gray.600">AI Caption: {image.aiCaption}</Text>}
                              {image.aiLabel && <Text fontSize="xs" color="gray.600">AI Label: {image.aiLabel}</Text>}
                            </Box>
                          </Td>
                        )}
                      </React.Fragment>
                    ))}
                    {Array.from({ length: numImages - imagedetails.length }).map((_, index) => (
                      <React.Fragment key={`empty-${record.entryId}-${index}`}>
                        <Td w="80px">
                          <Text fontSize="xs" color="gray.600">No picture</Text>
                        </Td>
                        {showResultDetails && (
                          <Td w="180px" bg="gray.50">
                            <Text fontSize="xs" color="gray.600">No picture detail</Text>
                          </Td>
                        )}
                      </React.Fragment>
                    ))}
                    <Td w="70px">
                      <Text cursor="pointer" color="green.300" _hover={{ textDecoration: "underline" }} onClick={(e) => handleRowIdClick(e, String(record.entryId))}>
                        {record.excelRowId}
                      </Text>
                    </Td>
                    <Td w="130px">
                      {record.productModel ? (
                        <a href={googleSearch(record.productModel)} onClick={(e) => handleLinkClick(e, googleSearch(record.productModel))}>
                          <Text color="green.300">{record.productModel}</Text>
                        </a>
                      ) : (
                        <Text fontSize="xs" color="gray.600">No style</Text>
                      )}
                    </Td>
                    <Td w="130px">
                      {record.productBrand ? (
                        <a
                          href={googleSearchBrandModelUrl(record.productModel, record.productBrand)}
                          onClick={(e) => handleLinkClick(e, googleSearchBrandModelUrl(record.productModel, record.productBrand))}
                        >
                          <Text color="green.300">{record.productBrand}</Text>
                        </a>
                      ) : (
                        <Text fontSize="xs" color="gray.600">No brand</Text>
                      )}
                    </Td>
                    {showFileDetails && (
                      <>
                        <Td w="100px" bg="gray.50">
                          {record.productColor || <Text fontSize="xs" color="gray.600">No color</Text>}
                        </Td>
                        <Td w="100px" bg="gray.50">
                          {record.productCategory || <Text fontSize="xs" color="gray.600">No category</Text>}
                        </Td>
                      </>
                    )}
                    <Td w="80px">
                      {totalImageCount === 0 ? <Text fontSize="xs" color="gray.600">0</Text> : <Text color="gray.800">{totalImageCount}</Text>}
                    </Td>
                    <Td w="80px">
                      {positiveSortCount === 0 ? <Text fontSize="xs" color="gray.600">0</Text> : <Text color="gray.800">{positiveSortCount}</Text>}
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </InfiniteScroll>
      ) : (
        <>
          <Table variant="simple" size="sm" borderWidth="1px" borderColor="gray.200" colorScheme="blue">
            <Thead bg="gray.100">
              <Tr>
                {showFileDetails && hasThumbnails && <Th w="60px" bg="gray.200" color="gray.800">Excel Picture</Th>}
                {Array.from({ length: numImages }).map((_, index) => (
                  <React.Fragment key={`header-${index}`}>
                    <Th w="80px" color="gray.800">Picture {index + 1}</Th>
                    {showResultDetails && <Th w="180px" bg="gray.200" color="gray.800">Picture Detail {index + 1}</Th>}
                  </React.Fragment>
                ))}
                <Th w="70px" onClick={() => handleSort("excelRowId")} cursor="pointer" color="gray.800">
                  Row # {sortConfig.key === "excelRowId" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </Th>
                <Th w="130px" onClick={() => handleSort("productModel")} cursor="pointer" color="gray.800">
                  Style # {sortConfig.key === "productModel" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </Th>
                <Th w="130px" onClick={() => handleSort("productBrand")} cursor="pointer" color="gray.800">
                  Brand {sortConfig.key === "productBrand" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </Th>
                {showFileDetails && (
                  <>
                    <Th w="100px" bg="gray.200" onClick={() => handleSort("productColor")} cursor="pointer" color="gray.800">
                      Color Name {sortConfig.key === "productColor" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
                    </Th>
                    <Th w="100px" bg="gray.200" onClick={() => handleSort("productCategory")} cursor="pointer" color="gray.800">
                      Category {sortConfig.key === "productCategory" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
                    </Th>
                  </>
                )}
                <Th w="80px" onClick={() => handleSort("totalImageCount")} cursor="pointer" color="gray.800">
                  Total Image {sortConfig.key === "totalImageCount" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </Th>
                <Th w="80px" onClick={() => handleSort("positiveSortCount")} cursor="pointer" color="gray.800">
                  Positive Count {sortConfig.key === "positiveSortCount" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {recordsToDisplay.map((record) => {
                const imagedetails = getImagesForEntry(record.entryId, numImages);
                const totalImageCount = getTotalImageCountForEntry(record.entryId);
                const positiveSortCount = getPositiveSortCountForEntry(record.entryId);
                return (
                  <Tr key={record.entryId} _hover={{ bg: "gray.50" }} opacity={positiveSortCount === 0 && !hideEmptyRows ? 0.8 : 1}>
                    {showFileDetails && hasThumbnails && (
                      <Td w="60px" bg="gray.50">
                        {record.excelRowImageRef ? (
                          <Image
                            src={record.excelRowImageRef}
                            alt={`Pic of ${record.productModel || "Record"}`}
                            maxW="60px"
                            maxH="60px"
                            fallback={<Text fontSize="xs" color="gray.600">Failed</Text>}
                            objectFit="cover"
                            onError={() => showToast("Thumbnail Error", `Failed to load thumbnail for record ${record.entryId}`, "error")}
                          />
                        ) : (
                          <Text fontSize="xs" color="gray.600">No image</Text>
                        )}
                      </Td>
                    )}
                    {imagedetails.map((image, index) => (
                      <React.Fragment key={index}>
                        <Td w="80px">
                          <Image
                            src={image.imageUrlThumbnail}
                            alt={image.imageDesc || "No description"}
                            maxW="60px"
                            maxH="60px"
                            objectFit="cover"
                            fallback={<Text fontSize="xs" color="gray.600">No image</Text>}
                            onError={() => showToast("Image Error", `Failed to load image ${index + 1} for record ${record.entryId}`, "error")}
                          />
                        </Td>
                        {showResultDetails && (
                          <Td w="180px" bg="gray.50">
                            <Box wordBreak="break-all">
                              <Text fontSize="xs">
                                <a href={googleSearch(image.imageDesc)} onClick={(e) => handleLinkClick(e, googleSearch(image.imageDesc))} style={{ color: "#1a73e8" }}>
                                  {image.imageDesc || "N/A"}
                                </a>
                              </Text>
                              <Text fontSize="xs" color="green.300">
                                <a href={image.imageSource} onClick={(e) => handleLinkClick(e, image.imageSource)}>{shortenUrl(image.imageSource)}</a>
                              </Text>
                              <Text fontSize="xs" color="green.300">
                                <a href={image.imageUrl} onClick={(e) => handleLinkClick(e, image.imageUrl)}>{shortenUrl(image.imageUrl)}</a>
                              </Text>
                              {image.aiCaption && <Text fontSize="xs" color="gray.600">AI Caption: {image.aiCaption}</Text>}
                              {image.aiLabel && <Text fontSize="xs" color="gray.600">AI Label: {image.aiLabel}</Text>}
                            </Box>
                          </Td>
                        )}
                      </React.Fragment>
                    ))}
                    {Array.from({ length: numImages - imagedetails.length }).map((_, index) => (
                      <React.Fragment key={`empty-${record.entryId}-${index}`}>
                        <Td w="80px">
                          <Text fontSize="xs" color="gray.600">No picture</Text>
                        </Td>
                        {showResultDetails && (
                          <Td w="180px" bg="gray.50">
                            <Text fontSize="xs" color="gray.600">No picture detail</Text>
                          </Td>
                        )}
                      </React.Fragment>
                    ))}
                    <Td w="70px">
                      <Text cursor="pointer" color="green.300" _hover={{ textDecoration: "underline" }} onClick={(e) => handleRowIdClick(e, String(record.entryId))}>
                        {record.excelRowId}
                      </Text>
                    </Td>
                    <Td w="130px">
                      {record.productModel ? (
                        <a href={googleSearch(record.productModel)} onClick={(e) => handleLinkClick(e, googleSearch(record.productModel))}>
                          <Text color="green.300">{record.productModel}</Text>
                        </a>
                      ) : (
                        <Text fontSize="xs" color="gray.600">No style</Text>
                      )}
                    </Td>
                    <Td w="130px">
                      {record.productBrand ? (
                        <a
                          href={googleSearchBrandModelUrl(record.productModel, record.productBrand)}
                          onClick={(e) => handleLinkClick(e, googleSearchBrandModelUrl(record.productModel, record.productBrand))}
                        >
                          <Text color="green.300">{record.productBrand}</Text>
                        </a>
                      ) : (
                        <Text fontSize="xs" color="gray.600">No brand</Text>
                      )}
                    </Td>
                    {showFileDetails && (
                      <>
                        <Td w="100px" bg="gray.50">
                          {record.productColor || <Text fontSize="xs" color="gray.600">No color</Text>}
                        </Td>
                        <Td w="100px" bg="gray.50">
                          {record.productCategory || <Text fontSize="xs" color="gray.600">No category</Text>}
                        </Td>
                      </>
                    )}
                    <Td w="80px">
                      {totalImageCount === 0 ? <Text fontSize="xs" color="gray.600">0</Text> : <Text color="gray.800">{totalImageCount}</Text>}
                    </Td>
                    <Td w="80px">
                      {positiveSortCount === 0 ? <Text fontSize="xs" color="gray.600">0</Text> : <Text color="gray.800">{positiveSortCount}</Text>}
                    </Td>
                  </Tr>
                );
              })}
              {recordsToDisplay.length === 0 && (
                <Tr>
                  <Td colSpan={showFileDetails && hasThumbnails ? 10 + numImages : 9 + numImages} textAlign="center" color="gray.600">
                    {sortedRecords.length === 0 ? "No records available." : "No more records on this page."}
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
          {totalPages > 1 && (
            <Flex justify="center" mt={4} align="center" gap={2}>
              <Button size="sm" onClick={() => setCurrentPage(0)} isDisabled={currentPage === 0}>First</Button>
              <Button size="sm" onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 0))} isDisabled={currentPage === 0}>Previous</Button>
              <Text color="gray.800">Page {currentPage + 1} of {totalPages}</Text>
              <Button size="sm" onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1))} isDisabled={currentPage === totalPages - 1}>
                Next
              </Button>
              <Button size="sm" onClick={() => setCurrentPage(totalPages - 1)} isDisabled={currentPage === totalPages - 1}>Last</Button>
            </Flex>
          )}
        </>
      )}
    </Box>
  );
};
// **Main JobsDetailPage Component**
const JobsDetailPage = () => {
  const { jobId } = useParams({ from: "/_layout/scraping-api/scraping-jobs/$jobId" }) as { jobId: string };
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [jobData, setJobData] = useState<JobDetails | null>(null);
  const showToast = useCustomToast();

  const searchParams = useSearch({ from: "/_layout/scraping-api/scraping-jobs/$jobId" }) as { search?: string; activeTab?: string };
  const initialTab = searchParams.activeTab ? parseInt(searchParams.activeTab, 10) : 4;
  const [activeTab, setActiveTab] = useState<number>(isNaN(initialTab) || initialTab < 0 || initialTab > 5 ? 4 : initialTab);
  const [sortBy, setSortBy] = useState<"match" | "linesheet" | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.search || "");

  const fetchJobData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const apiUrl = `https://backend-dev.iconluxury.group/api/scraping-jobs/${jobId}`;
      const response = await fetch(apiUrl, { method: "GET", headers: { "Content-Type": "application/json" } });
      if (!response.ok) throw new Error(`Failed to fetch job data: ${response.status} - ${response.statusText}`);
      const data: JobDetails = await response.json();
      setJobData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      showToast("Fetch Error", errorMessage, "error");
      setError(errorMessage);
      setJobData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobData();
  }, [jobId]);

  if (isLoading) {
    return (
      <Container maxW="full" py={6} bg="white">
        <Flex justify="center" align="center" h="200px"><Spinner size="xl" color="green.300" /></Flex>
      </Container>
    );
  }

  if (error || !jobData) {
    return (
      <Container maxW="full" py={6} bg="white">
        <Text color="red.500">{error || "Job data not available"}</Text>
      </Container>
    );
  }

  const tabsConfig = [
    { title: "Overview", component: () => <OverviewTab job={jobData} sortBy={sortBy} setSortBy={setSortBy} fetchJobData={fetchJobData} setSearchQuery={setSearchQuery} setActiveTab={setActiveTab} /> },
    { title: "Usage", component: () => <UsageTab job={jobData} /> },
    { title: "Results", component: () => <ResultsTab job={jobData} sortBy={sortBy} searchQuery={searchQuery} setSearchQuery={setSearchQuery} /> },
    { title: "Records", component: () => <RecordsTab job={jobData} /> },
    { title: "Logs", component: () => <LogsTab job={jobData} /> },
    { title: "File Rows", component: () => <SearchRowsTab job={jobData} /> },
  ];

  return (
    <Container maxW="full" bg="white">
      <Flex align="center" justify="space-between" py={6} flexWrap="wrap" gap={4}>
        <Box textAlign="left" flex="1">
          <Text fontSize="xl" fontWeight="bold" color="gray.800">Job: {jobId}</Text>
          <Text fontSize="sm" color="gray.600">Details and results for scraping job {jobData.inputFile}.</Text>
        </Box>
      </Flex>
      <Tabs variant="enclosed" isLazy index={activeTab} onChange={(index) => setActiveTab(index)} colorScheme="blue">
        <TabList borderBottom="2px solid" borderColor="green.200">
          {tabsConfig.map((tab) => (
            <Tab key={tab.title} _selected={{ bg: "white", color: "green.300", borderColor: "green.300" }} color="gray.600">{tab.title}</Tab>
          ))}
        </TabList>
        <TabPanels>{tabsConfig.map((tab) => <TabPanel key={tab.title}>{tab.component()}</TabPanel>)}</TabPanels>
      </Tabs>
    </Container>
  );
};

export const Route = createFileRoute("/_layout/scraping-api/scraping-jobs/$jobId")({ component: JobsDetailPage });

export default JobsDetailPage;