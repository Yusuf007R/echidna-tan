import {
  Box,
  Flex,
  Avatar,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  useColorModeValue,
  Stack,
  useColorMode,
  Center,
  IconButton,
} from '@chakra-ui/react';

import {MdOutlineLightMode, MdOutlineDarkMode} from 'react-icons/md';

export default function NavBar() {
  const {colorMode, toggleColorMode} = useColorMode();
  const bgColor = useColorModeValue('gray.100', 'gray.900');

  return (
    <Box bg={bgColor} px="15px">
      <Flex h="65px" alignItems="center" justifyContent="space-between">
        <Box>EchidnaBot</Box>
        <Flex alignItems="center">
          <Stack direction="row" spacing={7}>
            <IconButton
              aria-label="Toggle light/dark mode"
              onClick={toggleColorMode}
              icon={
                colorMode === 'light' ? (
                  <MdOutlineDarkMode />
                ) : (
                  <MdOutlineLightMode />
                )
              }
            />
            <Menu>
              <MenuButton
                as={Button}
                rounded="full"
                variant="link"
                cursor="pointer"
                minW={0}>
                <Avatar
                  size="sm"
                  src="https://cdn.donmai.us/sample/99/b2/__echidna_re_zero_kara_hajimeru_isekai_seikatsu_drawn_by_kanniiepan__sample-99b2814c680b8771e9b2b7444a5d0027.jpg"
                />
              </MenuButton>
              <MenuList alignItems="center">
                <br />
                <Center>
                  <Avatar
                    size="2xl"
                    src="https://cdn.donmai.us/sample/99/b2/__echidna_re_zero_kara_hajimeru_isekai_seikatsu_drawn_by_kanniiepan__sample-99b2814c680b8771e9b2b7444a5d0027.jpg"
                  />
                </Center>
                <br />
                <Center>
                  <p>Echidna-bot</p>
                </Center>
                <br />
                <MenuDivider />
                <MenuItem>Your Servers</MenuItem>
                <MenuItem>Account Settings</MenuItem>
                <MenuItem>Logout</MenuItem>
              </MenuList>
            </Menu>
          </Stack>
        </Flex>
      </Flex>
    </Box>
  );
}
