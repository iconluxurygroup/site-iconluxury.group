import { createFileRoute, Link } from '@tanstack/react-router';
import {
  Container,
  Flex,
  Box,
  Text,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
} from '@chakra-ui/react';

// Define the EndpointData type
type EndpointData = {
  endpoint: string;
  endpointId: string;
  publicIp: string;
  status: string;
  health: string;
  lastChecked: string;
  error: string;
};

// Sample endpoint data
const endpointData: EndpointData[] = [
  {
    endpoint: "https://southamerica-west1-image-scraper-451516.cloudfunctions.net/main",
    endpointId: "SOUTHAMERICA-WEST1",
    publicIp: "34.34.252.50",
    status: "Google is reachable",
    health: "Healthy",
    lastChecked: "10:26:22 AM",
    error: "None",
  },
  {
    endpoint: "https://us-central1-image-scraper-451516.cloudfunctions.net/main",
    endpointId: "US-CENTRAL1",
    publicIp: "34.96.44.247",
    status: "Google is reachable",
    health: "Healthy",
    lastChecked: "10:26:22 AM",
    error: "None",
  },
  {
    endpoint: "https://europe-west1-image-serp-451516.cloudfunctions.net/main",
    endpointId: "G-IMAGE-SERP-EUROPE-WEST1",
    publicIp: "35.246.78.123",
    status: "Google Images is reachable",
    health: "Healthy",
    lastChecked: "10:30:00 AM",
    error: "None",
  },
  {
    endpoint: "https://us-central1-image-serp-451516.cloudfunctions.net/main",
    endpointId: "G-IMAGE-SERP-US-CENTRAL1",
    publicIp: "34.96.44.248",
    status: "Google Images is reachable",
    health: "Healthy",
    lastChecked: "10:31:00 AM",
    error: "None",
  },
];

// Define the route for the list page (no parameters)
export const Route = createFileRoute('/_layout/scraping-api/endpoints/')({
  component: EndpointsListPage,
});

function EndpointsListPage() {
  return (
    <Container maxW="full">
      <Flex align="center" justify="space-between" py={6} flexWrap="wrap" gap={4}>
        <Box textAlign="left" flex="1">
          <Text fontSize="xl" fontWeight="bold">Scraping API Endpoints</Text>
          <Text fontSize="sm">View and manage all available endpoints.</Text>
        </Box>
      </Flex>
      <Box>
        <Text fontSize="lg" fontWeight="bold" mb={2}>
          Endpoint List
        </Text>
        <Table variant="simple" size="sm">
          <Thead>
            <Tr>
              <Th>Endpoint ID</Th>
              <Th>Endpoint URL</Th>
              <Th>Public IP</Th>
              <Th>Status</Th>
              <Th>Health</Th>
              <Th>Last Checked</Th>
              <Th>Error</Th>
            </Tr>
          </Thead>
          <Tbody>
            {endpointData.map((endpoint) => (
              <Tr key={endpoint.endpointId}>
                <Td>
                <Link
  to="/scraping-api/endpoints/$endpointId"
  params={{ endpointId: endpoint.endpointId }}
>
                    {endpoint.endpointId}
                  </Link>
                </Td>
                <Td>{endpoint.endpoint}</Td>
                <Td>{endpoint.publicIp}</Td>
                <Td>{endpoint.status}</Td>
                <Td>{endpoint.health}</Td>
                <Td>{endpoint.lastChecked}</Td>
                <Td>{endpoint.error}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </Container>
  );
}

export default EndpointsListPage;