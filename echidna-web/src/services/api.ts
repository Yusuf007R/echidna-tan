import {ApiResponse} from 'apisauce';
import {
  LoopState,
  MusicSocketData,
} from '../../../common/DTOs/music-player-socket';
import {playerRequest} from '../utils/request';
import showToast from '../utils/toast';

const postPause = async () => {
  const response = await playerRequest.post<true>('/pause');
  return handleResponse(response);
};

const postResume = async () => {
  const response = await playerRequest.post<true>('/resume');
  return handleResponse(response);
};

const postSeek = async (time: number) => {
  const response = await playerRequest.post<true>(`/seek/${time}`);
  return handleResponse(response);
};

const postVolume = async (volume: number) => {
  const response = await playerRequest.post<true>(`/volume/${volume}`);
  return handleResponse(response);
};

const postLoop = async (loopMode: LoopState) => {
  const response = await playerRequest.post<true>(`/loop/${loopMode}`);
  return handleResponse(response);
};

const getData = async () => {
  const response = await playerRequest.get<MusicSocketData>(`/data`);
  return handleResponse(response);
};

function handleResponse<T>(response: ApiResponse<T, T>) {
  if (response.ok && response.data) {
    return response.data;
  }

  // @ts-ignore
  showToast('ERROR', response.data?.error ?? 'Unknown Error', 'error');
  return null;
}

export const api = {
  postPause,
  postResume,
  postLoop,
  postSeek,
  postVolume,
  getData,
};
