import {createStore, createTypedHooks} from 'easy-peasy';

import {MusicPlayerModel} from './music-player-model';

const model = {
  musicPlayer: MusicPlayerModel,
};

export type storeType = typeof model;

export const store = createStore(model);

const typedHooks = createTypedHooks<storeType>();

export const {
  useStoreActions: useAppActions,
  useStoreDispatch,
  useStoreState: useAppState,
  useStore,
} = typedHooks;
