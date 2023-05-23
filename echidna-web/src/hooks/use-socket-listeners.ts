import {useEffect} from 'react';
import socket from '../services/socket';
import {store, useAppActions} from '../stores/store';

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
    socket.on('trackAdded', data => {
      const queue = store.getState().musicPlayer.data?.queue ?? [];
      if (Array.isArray(data)) {
        modifyData.updateData({queue: [...queue, ...data]});
      } else {
        modifyData.updateData({queue: [...queue, data]});
      }
    });
    socket.on('trackRemoved', data => {
      const queue = store.getState().musicPlayer.data?.queue ?? [];
      if (Array.isArray(data)) {
        modifyData.updateData({
          queue: queue.filter(track => !data.includes(track)),
        });
      } else {
        modifyData.updateData({queue: queue.filter(track => track !== data)});
      }
    });

    return () => {
      socket.removeAllListeners();
    };
  }, []);
};

export default useSocketListeners;
