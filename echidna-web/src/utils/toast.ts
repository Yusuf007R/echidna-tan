import {createStandaloneToast} from '@chakra-ui/react';

export const toast = createStandaloneToast();

export type toastStatus = 'success' | 'error' | 'warning' | 'info';

const showToast = (title: string, message: string, status: toastStatus) => {
  toast({
    title,
    description: message,
    status,
    duration: 5000,
    isClosable: true,
    position: 'top-right',
  });
};

export default showToast;
