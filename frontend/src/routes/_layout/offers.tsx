import React, { useState, useEffect, useRef } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  Box,
  Container,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Divider,
  Badge,
  Input,
  Flex,
  Button,
} from "@chakra-ui/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

interface OfferSummary {
  id: number;
  fileName?: string;
  fileLocationUrl: string;
  userEmail?: string;
  createTime?: string;
  recordCount: number;
  nikOfferCount: number;
}

interface SubscriptionStatus {
  hasSubscription: boolean;
  isTrial: boolean;
  isDeactivated: boolean;
}

const getAuthToken = (): string | null => {
  return localStorage.getItem("access_token");
};

async function fetchSubscriptionStatus(): Promise<SubscriptionStatus> {
  const token = getAuthToken();
  const response = await fetch("https://api.iconluxury.group/api/v1/subscription-status/serp", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Unauthorized: Please log in again.");
    }
    throw new Error(`Failed to fetch subscription status: ${response.status}`);
  }
  return response.json();
}

async function fetchOffers(page: number): Promise<OfferSummary[]> {
  const token = getAuthToken();
  const response = await fetch(
    `https://backend-dev.iconluxury.group/api/luxurymarket/supplier/offers?page=${page}&page_size=10`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    }
  );
  if (!response.ok) throw new Error(`Failed to fetch offers: ${response.status}`);
  return response.json();
}

function OffersPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [allOffers, setAllOffers] = useState<OfferSummary[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const { data: subscriptionStatus, isLoading: isSubLoading, error: subError } = useQuery({
    queryKey: ["subscriptionStatus", "offers"],
    queryFn: fetchSubscriptionStatus,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error.message.includes("Unauthorized")) return false;
      return failureCount < 3;
    },
  });

  const { data: offers = [], isLoading: offersLoading, isFetching } = useQuery({
    queryKey: ["offers", page],
    queryFn: () => fetchOffers(page),
    enabled: (!!subscriptionStatus?.hasSubscription || !!subscriptionStatus?.isTrial) && hasMore,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  // Append new offers
  useEffect(() => {
    if (offers && offers.length > 0) {
      setAllOffers((prev) => {
        const newOffers = [...prev, ...offers];
        return Array.from(new Map(newOffers.map((offer) => [offer.id, offer])).values());
      });
      if (offers.length < 10) {
        setHasMore(false);
      }
    } else if (offers && offers.length === 0 && page > 1) {
      setHasMore(false);
    }
  }, [offers, page]);

  // Set up infinite scroll
  useEffect(() => {
    if (isFetching || offersLoading || !loadMoreRef.current || !hasMore) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetching) {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1, rootMargin: "200px" }
    );

    observerRef.current.observe(loadMoreRef.current);

    return () => {
      if (observerRef.current && loadMoreRef.current) {
        observerRef.current.unobserve(loadMoreRef.current);
      }
    };
  }, [isFetching, offersLoading, hasMore]);

  const filteredOffers = searchQuery
    ? allOffers.filter((offer) =>
        offer.fileName
          ? offer.fileName.toLowerCase().includes(searchQuery.toLowerCase())
          : true
      )
    : allOffers;

  const getStatusColor = (recordCount: number) => {
    return recordCount > 0 ? "green" : "yellow";
  };

  const handleRowClick = (offerId: number) => {
    navigate({
      to: "/supplier/offer/$offerId",
      params: { offerId: offerId.toString() },
    });
  };

  if (isSubLoading) {
    return (
      <Container maxW="full" bg="white" color="gray.800">
        <Text>Loading your data...</Text>
      </Container>
    );
  }

  if (subError) {
    return (
      <Container maxW="full" bg="white" color="gray.800">
        <Text color="red.500">
          {subError.message === "Unauthorized: Please log in again."
            ? "Session expired. Please log in again."
            : "Error loading status. Please try again later."}
        </Text>
        {subError.message.includes("Unauthorized") && (
          <Button mt={4} colorScheme="blue" onClick={() => navigate({ to: "/login" })}>
            Log In
          </Button>
        )}
      </Container>
    );
  }

  const { hasSubscription, isTrial, isDeactivated } = subscriptionStatus || {
    hasSubscription: false,
    isTrial: false,
    isDeactivated: false,
  };
  const isLocked = !hasSubscription && !isTrial;
  const isFullyDeactivated = isDeactivated && !hasSubscription;

  return (
    <Container maxW="full" bg="gray.50" minH="100vh" p={4}>
      <Box mb={4}>
        <Text fontSize="xl" fontWeight="bold" color="gray.800">
          Offers
        </Text>
        <Text fontSize="sm" color="gray.600">
          View and manage supplier offers
        </Text>
      </Box>

      <Divider my={3} borderColor="gray.200" />

      {isLocked ? (
        <Text color="red.500">Access restricted. Please subscribe or start a trial.</Text>
      ) : isFullyDeactivated ? (
        <Flex justify="space-between" align="center" w="full" p={4} bg="red.50" borderRadius="md">
          <Text color="gray.800">Your tools have been deactivated.</Text>
          <Button colorScheme="red" onClick={() => navigate({ to: "/proxies/pricing" })}>
            Reactivate Now
          </Button>
        </Flex>
      ) : (
        <Box>
          <Flex direction={{ base: "column", md: "row" }} gap={4} mb={4}>
            <Input
              placeholder="Search Offers by File Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              w={{ base: "100%", md: "250px" }}
              borderColor="green.300"
              _focus={{ borderColor: "green.500", boxShadow: "0 0 0 1px green.500" }}
              _hover={{ borderColor: "green.400" }}
              bg="white"
              color="gray.800"
              _placeholder={{ color: "gray.500" }}
              borderRadius="md"
            />
          </Flex>
          <Text fontSize="md" fontWeight="bold" color="gray.800" mb={2}>
            All Offers
          </Text>
          <TableContainer
            p={3}
            shadow="sm"
            borderWidth="1px"
            borderRadius="md"
            bg="white"
            borderColor="gray.200"
            minH="100vh"
          >
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Offer ID</Th>
                  <Th>File Name</Th>
                  <Th>User Email</Th>
                  <Th>Created</Th>
                  <Th>Records</Th>
                  <Th>Nik Offers</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                {offersLoading || (isFetching && page === 1) ? (
                  <Tr>
                    <Td colSpan={7} textAlign="center">
                      <Text fontSize="sm" color="gray.600">Loading...</Text>
                    </Td>
                  </Tr>
                ) : filteredOffers.length === 0 ? (
                  <Tr>
                    <Td colSpan={7} textAlign="center">
                      <Text fontSize="sm" color="gray.600">No offers found.</Text>
                    </Td>
                  </Tr>
                ) : (
                  filteredOffers.map((offer) => (
                    <Tr
                      key={offer.id}
                      onClick={() => handleRowClick(offer.id)}
                      cursor="pointer"
                      _hover={{ bg: "gray.50" }}
                    >
                      <Td>{offer.id}</Td>
                      <Td>{offer.fileName || "N/A"}</Td>
                      <Td>{offer.userEmail || "Unknown"}</Td>
                      <Td>
                        {offer.createTime ? new Date(offer.createTime).toLocaleString() : "N/A"}
                      </Td>
                      <Td>{offer.recordCount}</Td>
                      <Td>{offer.nikOfferCount}</Td>
                      <Td>
                        <Badge colorScheme={getStatusColor(offer.recordCount)}>
                          {offer.recordCount > 0 ? "Active" : "Pending"}
                        </Badge>
                      </Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </TableContainer>
          {hasMore && (
            <Box ref={loadMoreRef} h="20px" textAlign="center">
              {isFetching && <Text fontSize="sm" color="gray.600">Loading more...</Text>}
            </Box>
          )}
          {!hasMore && filteredOffers.length > 0 && (
            <Box h="20px" textAlign="center">
              <Text fontSize="sm" color="gray.600">No more offers to load</Text>
            </Box>
          )}
        </Box>
      )}
    </Container>
  );
}

export const Route = createFileRoute("/_layout/offers")({
  component: OffersPage,
});

export default OffersPage;