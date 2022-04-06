import {useEffect} from 'react';
import socket from '../services/socket';
import {useAppActions} from '../stores/store';

const useSocketListeners = () => {
  const modifyData = useAppActions(actions => ({
    setData: actions.musicPlayer.setData,
    updateData: actions.musicPlayer.updateData,
  }));
  useEffect(() => {
    socket.on('status', state => {
      modifyData.updateData({status: state});
    });

    socket.on('currentTrack', currentTrack => {
      modifyData.updateData({currentTrack});
    });

    socket.on('currentTime', currentTime => {
      modifyData.updateData({currentTime});
    });

    socket.on('loop', loop => {
      modifyData.updateData({loop});
    });

    socket.on('data', data => {
      modifyData.setData(data);
    });

    socket.on('volume', volume => {
      modifyData.updateData({volume});
    });

    socket.on('partialData', data => {
      modifyData.updateData(data);
    });

    return () => {
      socket.removeAllListeners();
    };
  }, []);
};

export default useSocketListeners;
