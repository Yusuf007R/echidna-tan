import {action, Action, computed, Computed, Thunk, thunk} from 'easy-peasy';
import {
  AudioPlayerStatus,
  LoopState,
  MusicSocketData,
} from '../../../common/DTOs/music-player-socket';
import {api} from '../services/api';

import {store} from './store';

const loopStateOrder = ['None', 'All', 'Single'];

export type MusicPlayerModelType = {
  isPlaying: Computed<MusicPlayerModelType, boolean>;
  isPaused: Computed<MusicPlayerModelType, boolean>;
  data: MusicSocketData | null;
  setData: Action<MusicPlayerModelType, MusicSocketData>;
  updateData: Action<MusicPlayerModelType, Partial<MusicSocketData>>;

  incrementCurrentTime: Action<MusicPlayerModelType, number>;
  musicProgressValue: Computed<MusicPlayerModelType, number>;
  togglePause: Thunk<MusicPlayerModelType>;
  seek: Thunk<MusicPlayerModelType, number>;
  loop: Thunk<MusicPlayerModelType>;
  volume: Thunk<MusicPlayerModelType, number>;
  getData: Thunk<MusicPlayerModelType>;
};

export const MusicPlayerModel: MusicPlayerModelType = {
  data: null,

  // computed
  isPlaying: computed(
    state => state.data?.status === AudioPlayerStatus.Playing,
  ),
  isPaused: computed(
    state =>
      state.data?.status === AudioPlayerStatus.Paused ||
      state.data?.status === AudioPlayerStatus.AutoPaused,
  ),

  musicProgressValue: computed(state => {
    const value =
      ((state.data?.currentTime ?? 0) /
        (state.data?.currentTrack?.duration ?? 0)) *
      100;
    if (isNaN(value)) return 0;
    return value;
  }),

  // actions
  setData: action((state, payload) => {
    state.data = payload;
  }),
  updateData: action((state, payload) => {
    if (!state.data) return;
    state.data = {...state.data, ...payload};
  }),
  incrementCurrentTime: action((state, payload) => {
    if (!state.data) return;
    if (!state.isPlaying) return;
    state.data.currentTime += payload;
  }),
  togglePause: thunk(async actions => {
    const {
      musicPlayer: {data},
    } = store.getState();
    if (!data) return;
    if (data.status === AudioPlayerStatus.Playing) {
      await api.postPause();
    } else {
      await api.postResume();
    }
  }),
  seek: thunk(async (actions, payload) => {
    const {
      musicPlayer: {data},
    } = store.getState();
    if (!data || !data.currentTrack) return;

    await api.postSeek((payload / 100) * data.currentTrack.duration);
  }),
  volume: thunk(async (actions, payload) => {
    const {
      musicPlayer: {data},
    } = store.getState();
    if (!data) return;

    await api.postVolume(payload);
  }),
  loop: thunk(async actions => {
    const {
      musicPlayer: {data},
    } = store.getState();
    if (!data || !data.currentTrack) return;
    const index = loopStateOrder.indexOf(data.loop);
    if (index == -1) return;
    const nextLoopState = loopStateOrder[
      index == loopStateOrder.length - 1 ? 0 : index + 1
    ] as LoopState;
    await api.postLoop(nextLoopState);
  }),
  getData: thunk(async actions => {
    const response = await api.getData();
    if (response) {
      actions.setData(response);
    }
  }),
};
