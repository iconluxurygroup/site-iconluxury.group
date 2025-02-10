import {
    Container,
    Heading,
    Tab,
    TabList,
    TabPanel,
    TabPanels,
    Tabs,
    Box,
    Text,
    Button,
    VStack,
    HStack,
    Divider,
    Select,
    Stack,
    Flex,
    Switch,
  } from "@chakra-ui/react";
  import { useState } from "react";
  import { useQueryClient } from "@tanstack/react-query";
  import { createFileRoute } from "@tanstack/react-router";
  import { FiSend, FiGithub } from "react-icons/fi";
  import PromoContent from '../../../components/PromoContent';
  import GetStarted  from '../../../components/GetStarted';
  const ProxySettings = () => <Box><Text>Proxy Settings Component</Text></Box>;
  const ProxyUsage = () => <Box><Text>Proxy Usage Component</Text></Box>;
  const TopUps = () => <Box><Text>Top-Ups Component</Text></Box>;
  const Connections = () => <Box><Text>Connections Component</Text></Box>;
  const Logs = () => <Box><Text>Logs Component</Text></Box>;
  const KeyManagement = () => <Box><Text>Key Management Component</Text></Box>;
  const ReactivationOptions = () => <Box><Text>Reactivation Options Component</Text></Box>;
  
  const tabsConfig = [
    { title: "Get Started", component: <GetStarted /> },
    { title: "Settings", component: <ProxySettings /> },
    { title: "Usage", component: <ProxyUsage /> },
    { title: "Top-Ups", component: <TopUps /> },
    { title: "Connections", component: <Connections /> },
    { title: "Logs", component: <Logs /> },
    { title: "Key Management", component: <KeyManagement /> },
  ];
  
  export const Route = createFileRoute("/_layout/proxies/residential")({
    component: ResidentialProxy,
  });
  
  function ResidentialProxy() {
    const queryClient = useQueryClient();
    const [hasSubscription, setHasSubscription] = useState(false);
    const [isTrial, setIsTrial] = useState(false);
    const [isDeactivated, setIsDeactivated] = useState(false);
    const currentUser = queryClient.getQueryData(["currentUser"]);
  
    const isLocked = !hasSubscription;
    const restrictedTabs = isTrial ? ["Key Management", "Logs", "Top-Ups","Connections"] : [];
  
    return (
      <Container maxW="full">
      {/* Heading & Toggles in One Row */}
      <Flex align="center" justify="space-between" py={6} flexWrap="wrap" gap={4}>
        <Heading size="lg">Residential Proxies</Heading>
        <HStack spacing={6}>
          <HStack>
            <Text fontWeight="bold">Subscription:</Text>
            <Switch isChecked={hasSubscription} onChange={() => setHasSubscription(!hasSubscription)} />
          </HStack>
          <HStack>
            <Text fontWeight="bold">Trial Mode:</Text>
            <Switch isChecked={isTrial} onChange={() => setIsTrial(!isTrial)} />
          </HStack>
          <HStack>
            <Text fontWeight="bold">Deactivated:</Text>
            <Switch isChecked={isDeactivated} onChange={() => setIsDeactivated(!isDeactivated)} />
          </HStack>
          <HStack>
            <Text fontWeight="bold">Debug:</Text>
            <Switch isChecked={isDebug} onChange={() => setIsDebug(!isDebug)} />
          </HStack>
          <HStack>
            <Text fontWeight="bold">Dev Mode:</Text>
            <Switch isChecked={isDev} onChange={() => setIsDev(!isDev)} />
          </HStack>
        </HStack>
      </Flex>

      {/* Conditional Content */}
      {isLocked ? (
        <PromoContent />
      ) : isDeactivated ? (
        <Box mt={6}>
          <Text>Your subscription has expired. Please renew to access all features.</Text>
          <ReactivationOptions />
        </Box>
      ) : (
        <Flex mt={6} gap={6} justify="space-between">
          <Box flex="1">
              <Box p={4}>
                <Text fontSize="2xl" fontWeight="bold">
                  Hi, {currentUser?.full_name || currentUser?.email} 👋🏼
                </Text>
                <Text>Welcome back, nice to see you again!</Text>
              </Box>
              <Divider my={4} />
              <Tabs variant="enclosed">
                <TabList>
                  {tabsConfig.map((tab, index) => (
                    <Tab key={index} isDisabled={restrictedTabs.includes(tab.title)}>{tab.title}</Tab>
                  ))}
                </TabList>
                <TabPanels>
                  {tabsConfig.map((tab, index) => (
                    <TabPanel key={index}>{restrictedTabs.includes(tab.title) ? <Text>Feature locked during trial.</Text> : tab.component}</TabPanel>
                  ))}
                </TabPanels>
              </Tabs>
            </Box>
            <Box w="250px" p={4} borderLeft="1px solid #E2E8F0">
              <VStack spacing={4} align="stretch">
                <Box p={4} shadow="sm" borderWidth="1px" borderRadius="lg">
                  <Text fontWeight="bold">Pick by Your Target</Text>
                  <Text fontSize="sm">Not sure which product to choose?</Text>
                  <Button mt={2} leftIcon={<FiSend />} size="sm" variant="outline">Send Test Request</Button>
                </Box>
                <Box p={4} shadow="sm" borderWidth="1px" borderRadius="lg">
                  <Text fontWeight="bold">GitHub</Text>
                  <Text fontSize="sm">Explore integration guides and open-source projects.</Text>
                  <Button mt={2} leftIcon={<FiGithub />} size="sm" variant="outline">Join GitHub</Button>
                </Box>
              </VStack>
            </Box>
          </Flex>
        )}
      </Container>
    );
  }