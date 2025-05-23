import {
  Box,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
} from "@chakra-ui/react";
import { Link } from "@tanstack/react-router";
import { FaUserSecret } from "react-icons/fa";
import { FiLogOut, FiUser } from "react-icons/fi";

import useAuth from "../../hooks/useAuth";

const UserMenu = () => {
  const { logout } = useAuth();

  const handleLogout = async () => {
    logout();
  };

  return (
    <>
      {/* Desktop */}
      <Box
        display={{ base: "none", md: "block" }}
        position="fixed"
        top={4}
        right={4}
      >
        <Menu>
          <MenuButton
            as={IconButton}
            aria-label="Options"
            icon={<FiUser color="gray.800" fontSize="18px" />}
            bg="gray.50" // Subtle gray instead of pure white
            border="1px solid"
            borderColor="yellow.300"
            _hover={{ bg: "yellow.100", borderColor: "yellow.400" }}
            _active={{ bg: "yellow.200", borderColor: "yellow.500" }}
            isRound
            data-testid="user-menu"
          />
          <MenuList
            bg="gray.50" // Subtle gray instead of pure white
            borderColor="gray.200"
            color="gray.800"
            boxShadow="md"
          >
            {/* <MenuItem
              icon={<FiUser fontSize="18px" color="gray.600" />}
              as={Link}
              to="/settings"
              bg="gray.50"
              _hover={{ bg: "yellow.100", color: "yellow.500" }}
            >
              Settings
            </MenuItem> */}
            <MenuItem
              icon={<FiLogOut fontSize="18px" color="red.500" />}
              onClick={handleLogout}
              color="red.500"
              fontWeight="bold"
              bg="gray.50"
              _hover={{ bg: "red.100" }}
            >
              Sign out
            </MenuItem>
          </MenuList>
        </Menu>
      </Box>
    </>
  );
};

export default UserMenu;